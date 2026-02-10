import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is an active reseller
    const { data: reseller, error: resellerError } = await supabaseAdmin
      .from('resellers')
      .select('id, mp_access_token, mp_integration_enabled')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (resellerError || !reseller) {
      return new Response(
        JSON.stringify({ error: 'Acesso restrito a revendedores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { restaurantId, payerEmail } = await req.json();

    if (!restaurantId || !payerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: restaurantId, payerEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify restaurant belongs to this reseller
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, monthly_fee, slug')
      .eq('id', restaurantId)
      .eq('reseller_id', reseller.id)
      .single();

    if (restaurantError || !restaurant) {
      return new Response(
        JSON.stringify({ error: 'Restaurante não encontrado ou não pertence a este revendedor' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reseller.mp_integration_enabled || !reseller.mp_access_token) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago integration not configured for this reseller' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create subscription (preapproval) in Mercado Pago
    const subscriptionData = {
      reason: `Assinatura - ${restaurant.name}`,
      external_reference: restaurant.id,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(restaurant.monthly_fee),
        currency_id: 'BRL'
      },
      back_url: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/reseller/restaurants/${restaurant.id}`,
      status: 'pending'
    };

    console.log('Creating Mercado Pago subscription:', subscriptionData);

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${reseller.mp_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    });

    const mpResult = await mpResponse.json();
    console.log('Mercado Pago response:', mpResult);

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpResult);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription in Mercado Pago', details: mpResult }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update restaurant with subscription info
    const { error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        mp_subscription_id: mpResult.id,
        mp_payer_email: payerEmail,
        mp_init_point: mpResult.init_point,
        mp_subscription_status: mpResult.status
      })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Error updating restaurant:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update restaurant with subscription info' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: mpResult.id,
        initPoint: mpResult.init_point,
        status: mpResult.status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
