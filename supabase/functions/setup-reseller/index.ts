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

    // Check if any reseller already exists - this is the primary guard
    const { count, error: countError } = await supabaseAdmin
      .from('resellers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error('Erro ao verificar revendedores existentes');
    }

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ error: 'Sistema já configurado. Faça login com suas credenciais.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow setup when no resellers exist (first-time setup)
    const { name, email, password, companyName, phone } = await req.json();

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Double-check no reseller was created between the first check and now (race condition)
    const { count: recheck } = await supabaseAdmin
      .from('resellers')
      .select('*', { count: 'exact', head: true });

    if (recheck && recheck > 0) {
      return new Response(
        JSON.stringify({ error: 'Sistema já configurado.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError) {
      throw new Error(userError.message);
    }

    if (!userData.user) {
      throw new Error('Erro ao criar usuário');
    }

    const { data: resellerData, error: resellerError } = await supabaseAdmin
      .from('resellers')
      .insert({
        user_id: userData.user.id,
        name,
        email,
        phone: phone || null,
        company_name: companyName || null,
        is_active: true,
      })
      .select()
      .single();

    if (resellerError) {
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      throw new Error('Erro ao criar registro de revendedor');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Revendedor criado com sucesso',
        resellerId: resellerData.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Setup reseller error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
