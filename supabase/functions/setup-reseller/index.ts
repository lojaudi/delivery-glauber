import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if any reseller already exists
    const { count, error: countError } = await supabaseAdmin
      .from('resellers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error checking resellers:', countError);
      throw new Error('Erro ao verificar revendedores existentes');
    }

    if (count && count > 0) {
      console.log('Reseller already exists, blocking setup');
      return new Response(
        JSON.stringify({ error: 'Sistema já configurado. Faça login com suas credenciais.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get request body
    const { name, email, password, companyName, phone } = await req.json();

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Creating new reseller user:', email);

    // Create user in Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (userError) {
      console.error('Error creating user:', userError);
      throw new Error(userError.message);
    }

    if (!userData.user) {
      throw new Error('Erro ao criar usuário');
    }

    console.log('User created successfully:', userData.user.id);

    // Create reseller record
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
      console.error('Error creating reseller:', resellerError);
      // Try to delete the user if reseller creation fails
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      throw new Error('Erro ao criar registro de revendedor');
    }

    console.log('Reseller created successfully:', resellerData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Revendedor criado com sucesso',
        resellerId: resellerData.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Setup reseller error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
