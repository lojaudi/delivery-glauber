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

    const { restaurantId, resellerId } = await req.json();

    if (!restaurantId || !resellerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: restaurantId, resellerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get reseller's Mercado Pago credentials
    const { data: reseller, error: resellerError } = await supabaseClient
      .from('resellers')
      .select('mp_access_token')
      .eq('id', resellerId)
      .single();

    if (resellerError || !reseller?.mp_access_token) {
      return new Response(
        JSON.stringify({ error: 'Reseller not found or MP not configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get restaurant's subscription ID
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('mp_subscription_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant?.mp_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'Restaurant not found or no subscription' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const { error: updateError } = await supabaseClient
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
