import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { restaurant_id } = await req.json();
    if (!restaurant_id) {
      return new Response(JSON.stringify({ error: "restaurant_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to verify the user is the reseller of this restaurant
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, reseller_id, name")
      .eq("id", restaurant_id)
      .single();

    if (restError || !restaurant) {
      return new Response(JSON.stringify({ error: "Restaurante não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is the reseller
    const { data: reseller } = await supabase
      .from("resellers")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", restaurant.reseller_id)
      .maybeSingle();

    if (!reseller) {
      return new Response(JSON.stringify({ error: "Sem permissão para excluir este restaurante" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete all related data in order (respecting FK constraints)
    // 1. WhatsApp notification logs
    await supabase.from("whatsapp_notification_logs").delete().eq("restaurant_id", restaurant_id);

    // 2. Order items (via orders)
    const { data: orders } = await supabase.from("orders").select("id").eq("restaurant_id", restaurant_id);
    if (orders && orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);
      await supabase.from("order_items").delete().in("order_id", orderIds);
    }

    // 3. Orders
    await supabase.from("orders").delete().eq("restaurant_id", restaurant_id);

    // 4. Table order items (via table_orders)
    const { data: tableOrders } = await supabase.from("table_orders").select("id").eq("restaurant_id", restaurant_id);
    if (tableOrders && tableOrders.length > 0) {
      const toIds = tableOrders.map((o: any) => o.id);
      await supabase.from("table_order_items").delete().in("table_order_id", toIds);
    }

    // 5. Table orders
    await supabase.from("table_orders").delete().eq("restaurant_id", restaurant_id);

    // 6. Tables
    await supabase.from("tables").delete().eq("restaurant_id", restaurant_id);

    // 7. Product addon groups (via products)
    const { data: products } = await supabase.from("products").select("id").eq("restaurant_id", restaurant_id);
    if (products && products.length > 0) {
      const productIds = products.map((p: any) => p.id);
      await supabase.from("product_addon_groups").delete().in("product_id", productIds);
    }

    // 8. Addon options (via addon_groups)
    const { data: addonGroups } = await supabase.from("addon_groups").select("id").eq("restaurant_id", restaurant_id);
    if (addonGroups && addonGroups.length > 0) {
      const groupIds = addonGroups.map((g: any) => g.id);
      await supabase.from("addon_options").delete().in("group_id", groupIds);
    }

    // 9. Addon groups
    await supabase.from("addon_groups").delete().eq("restaurant_id", restaurant_id);

    // 10. Products
    await supabase.from("products").delete().eq("restaurant_id", restaurant_id);

    // 11. Categories
    await supabase.from("categories").delete().eq("restaurant_id", restaurant_id);

    // 12. Delivery zones
    await supabase.from("delivery_zones").delete().eq("restaurant_id", restaurant_id);

    // 13. Business hours
    await supabase.from("business_hours").delete().eq("restaurant_id", restaurant_id);

    // 14. Coupons
    await supabase.from("coupons").delete().eq("restaurant_id", restaurant_id);

    // 15. Store config
    await supabase.from("store_config").delete().eq("restaurant_id", restaurant_id);

    // 16. Subscription payments
    await supabase.from("subscription_payments").delete().eq("restaurant_id", restaurant_id);

    // 17. Communication logs
    await supabase.from("communication_logs").delete().eq("restaurant_id", restaurant_id);

    // 18. Restaurant admins
    await supabase.from("restaurant_admins").delete().eq("restaurant_id", restaurant_id);

    // 19. Waiters
    await supabase.from("waiters").delete().eq("restaurant_id", restaurant_id);

    // 20. Finally, delete the restaurant
    const { error: deleteError } = await supabase.from("restaurants").delete().eq("id", restaurant_id);

    if (deleteError) {
      console.error("Error deleting restaurant:", deleteError);
      return new Response(JSON.stringify({ error: "Erro ao excluir restaurante: " + deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: `Restaurante "${restaurant.name}" excluído com sucesso` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
