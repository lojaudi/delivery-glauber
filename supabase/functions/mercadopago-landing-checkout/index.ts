import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  resellerId: string;
  planId: string;
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { resellerId, planId, name, email, phone, businessName, businessType }: CheckoutRequest = await req.json();

    // Validate required fields
    if (!resellerId || !planId || !name || !email) {
      console.error('Missing required fields:', { resellerId, planId, name, email });
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: resellerId, planId, name, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating checkout for lead:', { resellerId, planId, name, email, phone, businessName });

    // Get reseller's Mercado Pago credentials
    const { data: reseller, error: resellerError } = await supabaseClient
      .from('resellers')
      .select('id, mp_access_token, mp_integration_enabled, company_name, name')
      .eq('id', resellerId)
      .single();

    if (resellerError || !reseller) {
      console.error('Error fetching reseller:', resellerError);
      return new Response(
        JSON.stringify({ error: 'Revendedor não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reseller.mp_integration_enabled || !reseller.mp_access_token) {
      console.error('Mercado Pago not configured for reseller:', resellerId);
      return new Response(
        JSON.stringify({ error: 'Integração com Mercado Pago não configurada para este revendedor' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('id, name, monthly_fee, setup_fee, trial_days, description')
      .eq('id', planId)
      .eq('reseller_id', resellerId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      return new Response(
        JSON.stringify({ error: 'Plano não encontrado ou inativo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update lead record
    const { data: existingLead } = await supabaseClient
      .from('landing_page_leads')
      .select('id')
      .eq('email', email)
      .eq('reseller_id', resellerId)
      .single();

    let leadId: string;

    if (existingLead) {
      // Update existing lead
      const { error: updateError } = await supabaseClient
        .from('landing_page_leads')
        .update({
          name,
          phone,
          business_name: businessName,
          business_type: businessType,
          plan_id: planId,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Error updating lead:', updateError);
      }
      leadId = existingLead.id;
    } else {
      // Create new lead
      const { data: newLead, error: insertError } = await supabaseClient
        .from('landing_page_leads')
        .insert({
          reseller_id: resellerId,
          plan_id: planId,
          name,
          email,
          phone,
          business_name: businessName,
          business_type: businessType,
          status: 'pending'
        })
        .select('id')
        .single();

      if (insertError || !newLead) {
        console.error('Error creating lead:', insertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar lead' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      leadId = newLead.id;
    }

    console.log('Lead ID:', leadId);

    // Calculate total amount (setup fee + first month)
    const setupFee = plan.setup_fee || 0;
    const monthlyFee = plan.monthly_fee || 0;
    const totalAmount = setupFee + monthlyFee;

    if (totalAmount <= 0) {
      console.error('Invalid total amount:', totalAmount);
      return new Response(
        JSON.stringify({ error: 'Valor do plano inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the base URL for back_urls
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const baseUrl = supabaseUrl.replace('.supabase.co', '.lovable.app');

    // Create preference in Mercado Pago
    const preferenceData = {
      items: [
        {
          id: plan.id,
          title: `Assinatura ${plan.name}`,
          description: plan.description || `Plano ${plan.name} - ${reseller.company_name || reseller.name}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: totalAmount
        }
      ],
      payer: {
        name: name,
        email: email,
        phone: phone ? {
          number: phone.replace(/\D/g, '')
        } : undefined
      },
      external_reference: `lead_${leadId}`,
      back_urls: {
        success: `${baseUrl}/?payment=success&lead=${leadId}`,
        failure: `${baseUrl}/?payment=failure&lead=${leadId}`,
        pending: `${baseUrl}/?payment=pending&lead=${leadId}`
      },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      statement_descriptor: (reseller.company_name || reseller.name || 'Assinatura').substring(0, 22),
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    console.log('Creating Mercado Pago preference:', JSON.stringify(preferenceData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${reseller.mp_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    const mpResult = await mpResponse.json();
    console.log('Mercado Pago response:', JSON.stringify(mpResult, null, 2));

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpResult);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar pagamento no Mercado Pago', 
          details: mpResult.message || mpResult.error 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update lead with payment info
    await supabaseClient
      .from('landing_page_leads')
      .update({
        mp_payment_id: mpResult.id,
        mp_payment_status: 'pending',
        notes: `Preferência criada: ${mpResult.id}`
      })
      .eq('id', leadId);

    console.log('Checkout created successfully:', {
      leadId,
      preferenceId: mpResult.id,
      initPoint: mpResult.init_point
    });

    return new Response(
      JSON.stringify({
        success: true,
        leadId,
        preferenceId: mpResult.id,
        initPoint: mpResult.init_point,
        sandboxInitPoint: mpResult.sandbox_init_point,
        totalAmount,
        planName: plan.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
