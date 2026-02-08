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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password, restaurantId, isOwner } = await req.json();

    console.log('Creating admin for restaurant:', restaurantId, 'email:', email);

    if (!email || !password || !restaurantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, restaurantId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error('Restaurant not found:', restaurantError);
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      console.log('User already exists, using existing user:', existingUser.id);
      userId = existingUser.id;
      
      // Check if already admin of this restaurant
      const { data: existingAdmin } = await supabaseAdmin
        .from('restaurant_admins')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      
      if (existingAdmin) {
        return new Response(
          JSON.stringify({ error: 'Este usuário já é administrador deste restaurante' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new user
      console.log('Creating new user');
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${createUserError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log('User created:', userId);
    }

    // Add user as restaurant admin
    const { data: adminRecord, error: adminError } = await supabaseAdmin
      .from('restaurant_admins')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        is_owner: isOwner || false,
      })
      .select()
      .single();

    if (adminError) {
      console.error('Error creating admin record:', adminError);
      return new Response(
        JSON.stringify({ error: `Erro ao vincular administrador: ${adminError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin created successfully:', adminRecord);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        adminId: adminRecord.id,
        message: 'Administrador criado com sucesso',
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
