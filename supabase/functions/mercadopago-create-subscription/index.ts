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

    const { restaurantId, payerEmail, resellerId } = await req.json();

    if (!restaurantId || !payerEmail || !resellerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: restaurantId, payerEmail, resellerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get reseller's Mercado Pago credentials
    const { data: reseller, error: resellerError } = await supabaseClient
      .from('resellers')
      .select('mp_access_token, mp_integration_enabled')
      .eq('id', resellerId)
      .single();

    if (resellerError || !reseller) {
      console.error('Error fetching reseller:', resellerError);
      return new Response(
        JSON.stringify({ error: 'Reseller not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reseller.mp_integration_enabled || !reseller.mp_access_token) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago integration not configured for this reseller' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get restaurant details
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('id, name, monthly_fee, slug')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error('Error fetching restaurant:', restaurantError);
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      back_url: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/reseller/restaurants/${restaurant.id}`,
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
    const { error: updateError } = await supabaseClient
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
