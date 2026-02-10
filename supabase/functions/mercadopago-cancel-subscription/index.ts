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
      .select('id, mp_access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (resellerError || !reseller) {
      return new Response(
        JSON.stringify({ error: 'Acesso restrito a revendedores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { restaurantId } = await req.json();

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: restaurantId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify restaurant belongs to this reseller and get subscription ID
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, mp_subscription_id')
      .eq('id', restaurantId)
      .eq('reseller_id', reseller.id)
      .single();

    if (restaurantError || !restaurant) {
      return new Response(
        JSON.stringify({ error: 'Restaurante não encontrado ou não pertence a este revendedor' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!restaurant.mp_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'Restaurante não possui assinatura ativa' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reseller.mp_access_token) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancel subscription in Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${restaurant.mp_subscription_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${reseller.mp_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      }
    );

    const mpResult = await mpResponse.json();
    console.log('Mercado Pago cancel response:', mpResult);

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpResult);
      return new Response(
        JSON.stringify({ error: 'Failed to cancel subscription', details: mpResult }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update restaurant status
    const { error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        subscription_status: 'cancelled',
        is_active: false,
        mp_subscription_status: 'cancelled'
      })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Error updating restaurant:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription cancelled' }),
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
