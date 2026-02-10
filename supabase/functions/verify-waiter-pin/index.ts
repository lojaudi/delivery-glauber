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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { waiterId, pin, restaurantId } = await req.json();

    if (!waiterId || !restaurantId) {
      return new Response(
        JSON.stringify({ error: 'waiterId e restaurantId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch waiter with PIN from server side (not exposed to client)
    const { data: waiter, error: waiterError } = await supabaseAdmin
      .from('waiters')
      .select('id, name, pin, is_active, restaurant_id')
      .eq('id', waiterId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (waiterError || !waiter) {
      return new Response(
        JSON.stringify({ error: 'Garçom não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If waiter has no PIN, allow direct access
    if (!waiter.pin) {
      return new Response(
        JSON.stringify({ success: true, waiterId: waiter.id, waiterName: waiter.name }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN
    if (!pin || waiter.pin !== pin) {
      return new Response(
        JSON.stringify({ error: 'PIN incorreto' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, waiterId: waiter.id, waiterName: waiter.name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    console.error('Verify waiter PIN error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
