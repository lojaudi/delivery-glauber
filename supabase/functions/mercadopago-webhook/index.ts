import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    const { type, data } = body;

    if (!type || !data?.id) {
      console.log('Invalid webhook payload');
      return new Response(
        JSON.stringify({ message: 'Invalid payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle subscription (preapproval) events
    if (type === 'subscription_preapproval') {
      await handleSubscriptionEvent(supabaseClient, data.id);
    }

    // Handle payment events
    if (type === 'payment') {
      await handlePaymentEvent(supabaseClient, data.id);
    }

    // Handle merchant_order events (for preference payments)
    if (type === 'merchant_order') {
      await handleMerchantOrderEvent(supabaseClient, data.id);
    }

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSubscriptionEvent(supabaseClient: any, subscriptionId: string) {
  console.log('Processing subscription event:', subscriptionId);

  // Find the restaurant with this subscription
  const { data: restaurant, error: restaurantError } = await supabaseClient
    .from('restaurants')
    .select('id, reseller_id, mp_subscription_id')
    .eq('mp_subscription_id', subscriptionId)
    .single();

  if (restaurantError || !restaurant) {
    console.error('Restaurant not found for subscription:', subscriptionId);
    return;
  }

  // Get reseller's access token
  const { data: reseller, error: resellerError } = await supabaseClient
    .from('resellers')
    .select('mp_access_token')
    .eq('id', restaurant.reseller_id)
    .single();

  if (resellerError || !reseller?.mp_access_token) {
    console.error('Reseller or access token not found');
    return;
  }

  // Fetch subscription details from Mercado Pago
  const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
    headers: {
      'Authorization': `Bearer ${reseller.mp_access_token}`
    }
  });

  if (!mpResponse.ok) {
    console.error('Failed to fetch subscription from MP');
    return;
  }

  const subscription = await mpResponse.json();
  console.log('Subscription details:', subscription);

  // Map MP status to our subscription_status
  let subscriptionStatus: string;
  let isActive = true;

  switch (subscription.status) {
    case 'authorized':
      subscriptionStatus = 'active';
      isActive = true;
      break;
    case 'paused':
      subscriptionStatus = 'suspended';
      isActive = false;
      break;
    case 'cancelled':
      subscriptionStatus = 'cancelled';
      isActive = false;
      break;
    case 'pending':
      subscriptionStatus = 'trial';
      isActive = true;
      break;
    default:
      subscriptionStatus = 'suspended';
      isActive = false;
  }

  // Update restaurant status
  const { error: updateError } = await supabaseClient
    .from('restaurants')
    .update({
      subscription_status: subscriptionStatus,
      is_active: isActive,
      mp_subscription_status: subscription.status
    })
    .eq('id', restaurant.id);

  if (updateError) {
    console.error('Error updating restaurant:', updateError);
  } else {
    console.log(`Restaurant ${restaurant.id} updated: status=${subscriptionStatus}, active=${isActive}`);
  }
}

async function handlePaymentEvent(supabaseClient: any, paymentId: string) {
  console.log('Processing payment event:', paymentId);

  // We need to find which reseller this payment belongs to
  // First, check if we already have this payment
  const { data: existingPayment } = await supabaseClient
    .from('subscription_payments')
    .select('id')
    .eq('mp_payment_id', paymentId)
    .single();

  if (existingPayment) {
    console.log('Payment already processed');
    return;
  }

  // We need to fetch payment details to get the external_reference
  // This requires us to try with different reseller tokens
  const { data: resellers } = await supabaseClient
    .from('resellers')
    .select('id, mp_access_token')
    .eq('mp_integration_enabled', true)
    .not('mp_access_token', 'is', null);

  if (!resellers || resellers.length === 0) {
    console.log('No resellers with MP integration found');
    return;
  }

  for (const reseller of resellers) {
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${reseller.mp_access_token}`
      }
    });

    if (!mpResponse.ok) {
      continue;
    }

    const payment = await mpResponse.json();
    console.log('Payment details:', payment);

    const externalReference = payment.external_reference || '';

    // Check if this is a landing page lead payment
    if (externalReference.startsWith('lead_')) {
      await handleLeadPayment(supabaseClient, payment, externalReference.replace('lead_', ''));
      break;
    }

    // Find restaurant by external_reference
    const { data: restaurant } = await supabaseClient
      .from('restaurants')
      .select('id, reseller_id')
      .eq('id', externalReference)
      .single();

    if (!restaurant) {
      continue;
    }

    // Map payment status
    let paymentStatus: string;
    switch (payment.status) {
      case 'approved':
        paymentStatus = 'paid';
        break;
      case 'pending':
      case 'in_process':
        paymentStatus = 'pending';
        break;
      case 'rejected':
      case 'cancelled':
        paymentStatus = 'cancelled';
        break;
      default:
        paymentStatus = 'pending';
    }

    // Create payment record
    const { error: insertError } = await supabaseClient
      .from('subscription_payments')
      .insert({
        restaurant_id: restaurant.id,
        amount: payment.transaction_amount,
        payment_date: payment.status === 'approved' ? payment.date_approved : null,
        due_date: payment.date_created,
        status: paymentStatus,
        payment_method: payment.payment_method_id,
        mp_payment_id: paymentId,
        mp_external_reference: payment.external_reference,
        notes: `Pagamento automático via Mercado Pago`
      });

    if (insertError) {
      console.error('Error creating payment record:', insertError);
    } else {
      console.log('Payment record created for restaurant:', restaurant.id);
    }

    // If payment approved, ensure restaurant is active
    if (payment.status === 'approved') {
      await supabaseClient
        .from('restaurants')
        .update({
          subscription_status: 'active',
          is_active: true
        })
        .eq('id', restaurant.id);
    }

    break;
  }
}

async function handleLeadPayment(supabaseClient: any, payment: any, leadId: string) {
  console.log('Processing lead payment:', leadId, payment.status);

  // Update lead status
  const leadUpdate: any = {
    mp_payment_id: payment.id?.toString(),
    mp_payment_status: payment.status,
    updated_at: new Date().toISOString()
  };

  if (payment.status === 'approved') {
    leadUpdate.status = 'converted';
    leadUpdate.notes = `Pagamento aprovado em ${new Date().toLocaleString('pt-BR')}. Método: ${payment.payment_method_id}`;
  } else if (payment.status === 'pending' || payment.status === 'in_process') {
    leadUpdate.status = 'pending';
    leadUpdate.notes = `Pagamento pendente. Método: ${payment.payment_method_id}`;
  } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
    leadUpdate.status = 'lost';
    leadUpdate.notes = `Pagamento ${payment.status}. Motivo: ${payment.status_detail || 'não informado'}`;
  }

  const { error: updateError } = await supabaseClient
    .from('landing_page_leads')
    .update(leadUpdate)
    .eq('id', leadId);

  if (updateError) {
    console.error('Error updating lead:', updateError);
  } else {
    console.log(`Lead ${leadId} updated: status=${leadUpdate.status}`);
  }

  // Auto-create restaurant when payment is approved
  if (payment.status === 'approved') {
    await createRestaurantFromLead(supabaseClient, leadId);
  }
}

async function createRestaurantFromLead(supabaseClient: any, leadId: string) {
  console.log('Auto-creating restaurant from lead:', leadId);

  try {
    // Fetch lead with plan details
    const { data: lead, error: leadError } = await supabaseClient
      .from('landing_page_leads')
      .select('*, subscription_plans(*)')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return;
    }

    // Check if restaurant already exists for this email
    const { data: existingRestaurant } = await supabaseClient
      .from('restaurants')
      .select('id')
      .eq('contact_email', lead.email)
      .eq('reseller_id', lead.reseller_id)
      .maybeSingle();

    if (existingRestaurant) {
      console.log('Restaurant already exists for this email:', existingRestaurant.id);
      
      // Update lead with restaurant info
      await supabaseClient
        .from('landing_page_leads')
        .update({
          notes: `${lead.notes || ''}\nRestaurante já existente: ${existingRestaurant.id}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);
      
      return;
    }

    // Generate unique slug from business name
    const baseSlug = (lead.business_name || lead.name || 'restaurante')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check for slug uniqueness and append number if needed
    let slug = baseSlug;
    let slugCounter = 1;
    let slugExists = true;

    while (slugExists) {
      const { data: existingSlug } = await supabaseClient
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      
      if (!existingSlug) {
        slugExists = false;
      } else {
        slug = `${baseSlug}-${slugCounter}`;
        slugCounter++;
      }
    }

    // Get plan details
    const plan = lead.subscription_plans;
    const trialDays = plan?.trial_days || 14;
    const monthlyFee = plan?.monthly_fee || 0;
    const setupFee = plan?.setup_fee || 0;

    // Calculate subscription dates
    const subscriptionStartDate = new Date().toISOString();
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + trialDays);

    // Create restaurant
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .insert({
        name: lead.business_name || lead.name,
        slug: slug,
        reseller_id: lead.reseller_id,
        plan_id: lead.plan_id,
        owner_name: lead.name,
        contact_email: lead.email,
        phone: lead.phone,
        monthly_fee: monthlyFee,
        setup_fee: setupFee,
        trial_days: trialDays,
        subscription_status: 'active', // Already paid, so active
        subscription_start_date: subscriptionStartDate,
        subscription_end_date: subscriptionEndDate.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('Error creating restaurant:', restaurantError);
      
      // Update lead with error info
      await supabaseClient
        .from('landing_page_leads')
        .update({
          notes: `${lead.notes || ''}\nErro ao criar restaurante: ${restaurantError.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);
      
      return;
    }

    console.log('Restaurant created:', restaurant.id, restaurant.name);

    // Create default store config
    const { error: storeConfigError } = await supabaseClient
      .from('store_config')
      .insert({
        restaurant_id: restaurant.id,
        name: restaurant.name,
        phone_whatsapp: lead.phone,
        is_open: true
      });

    if (storeConfigError) {
      console.error('Error creating store config:', storeConfigError);
    }

    // Create default business hours (Mon-Sun 08:00-22:00)
    const businessHours = [];
    for (let day = 0; day <= 6; day++) {
      businessHours.push({
        restaurant_id: restaurant.id,
        day_of_week: day,
        open_time: '08:00',
        close_time: '22:00',
        is_active: day >= 1 && day <= 5 // Only weekdays active by default
      });
    }

    const { error: hoursError } = await supabaseClient
      .from('business_hours')
      .insert(businessHours);

    if (hoursError) {
      console.error('Error creating business hours:', hoursError);
    }

    // Generate temporary password for the owner
    const tempPassword = generateTempPassword();

    // Create user and admin for the restaurant owner
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === lead.email);

    let userId: string;
    let userCreated = false;

    if (existingUser) {
      userId = existingUser.id;
      console.log('User already exists:', userId);
    } else {
      // Create new user
      const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
        email: lead.email,
        password: tempPassword,
        email_confirm: true
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        
        // Update lead with partial success info
        await supabaseClient
          .from('landing_page_leads')
          .update({
            notes: `${lead.notes || ''}\nRestaurante criado (${restaurant.id}), mas erro ao criar usuário: ${createUserError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);
        
        return;
      }

      userId = newUser.user.id;
      userCreated = true;
      console.log('User created:', userId);
    }

    // Add user as restaurant admin (owner)
    const { error: adminError } = await supabaseClient
      .from('restaurant_admins')
      .insert({
        user_id: userId,
        restaurant_id: restaurant.id,
        is_owner: true
      });

    if (adminError) {
      console.error('Error creating admin record:', adminError);
    }

    // Update lead with success info
    const successNote = userCreated 
      ? `Restaurante criado automaticamente!\nID: ${restaurant.id}\nSlug: ${slug}\nSenha temporária: ${tempPassword}\n(Orientar cliente a trocar a senha no primeiro acesso)`
      : `Restaurante criado automaticamente!\nID: ${restaurant.id}\nSlug: ${slug}\n(Usuário já existia, vincular ao novo restaurante)`;

    await supabaseClient
      .from('landing_page_leads')
      .update({
        notes: `${lead.notes || ''}\n\n${successNote}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    console.log('Restaurant creation complete:', {
      restaurantId: restaurant.id,
      slug: slug,
      userId: userId,
      userCreated: userCreated
    });

  } catch (error) {
    console.error('Unexpected error in createRestaurantFromLead:', error);
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function handleMerchantOrderEvent(supabaseClient: any, orderId: string) {
  console.log('Processing merchant order event:', orderId);

  // Get all resellers with MP integration
  const { data: resellers } = await supabaseClient
    .from('resellers')
    .select('id, mp_access_token')
    .eq('mp_integration_enabled', true)
    .not('mp_access_token', 'is', null);

  if (!resellers || resellers.length === 0) {
    console.log('No resellers with MP integration found');
    return;
  }

  for (const reseller of resellers) {
    const mpResponse = await fetch(`https://api.mercadopago.com/merchant_orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${reseller.mp_access_token}`
      }
    });

    if (!mpResponse.ok) {
      continue;
    }

    const order = await mpResponse.json();
    console.log('Merchant order details:', order);

    const externalReference = order.external_reference || '';

    // Check if this is a landing page lead payment
    if (externalReference.startsWith('lead_') && order.payments?.length > 0) {
      for (const payment of order.payments) {
        if (payment.status === 'approved') {
          // Fetch full payment details
          const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment.id}`, {
            headers: {
              'Authorization': `Bearer ${reseller.mp_access_token}`
            }
          });

          if (paymentResponse.ok) {
            const fullPayment = await paymentResponse.json();
            await handleLeadPayment(supabaseClient, fullPayment, externalReference.replace('lead_', ''));
          }
        }
      }
    }

    break;
  }
}
