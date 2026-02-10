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

    const { storeConfigId, pin, restaurantId } = await req.json();

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: 'restaurantId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch store config with PIN from server side (not exposed to client)
    const { data: config, error: configError } = await supabaseAdmin
      .from('store_config')
      .select('id, kitchen_pin, kitchen_pin_enabled')
      .eq('restaurant_id', restaurantId)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Configuração não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If PIN is not enabled, allow direct access
    if (!config.kitchen_pin_enabled) {
      return new Response(
        JSON.stringify({ success: true, pinRequired: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no PIN is set but enabled, deny access
    if (!config.kitchen_pin) {
      return new Response(
        JSON.stringify({ error: 'PIN da cozinha não configurado. Contate o administrador.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no PIN provided, tell client PIN is required
    if (!pin) {
      return new Response(
        JSON.stringify({ pinRequired: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN
    if (config.kitchen_pin !== pin) {
      return new Response(
        JSON.stringify({ error: 'PIN incorreto' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    console.error('Verify kitchen PIN error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
