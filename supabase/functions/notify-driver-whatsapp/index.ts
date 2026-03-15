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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { order_id, customer_name, total_amount, payment_method, address, restaurant_id, slug } = await req.json();

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionUrl || !evolutionKey) {
      console.error('Evolution API credentials not configured');
      return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get store config for instance name
    const { data: storeConfig } = await supabaseAdmin
      .from('store_config')
      .select('evolution_instance_name, name')
      .eq('restaurant_id', restaurant_id)
      .single();

    if (!storeConfig?.evolution_instance_name) {
      return new Response(JSON.stringify({ error: 'WhatsApp instance not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all active drivers with phone numbers for this restaurant
    const { data: drivers } = await supabaseAdmin
      .from('drivers')
      .select('id, name, phone')
      .eq('restaurant_id', restaurant_id)
      .eq('is_active', true)
      .not('phone', 'is', null);

    if (!drivers || drivers.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'No drivers with phone found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentLabels: Record<string, string> = {
      money: '💵 Dinheiro',
      card: '💳 Cartão',
      pix: '📱 PIX',
    };

    const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(total_amount));

    // Build the driver access link
    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '');
    const driverLink = slug ? `https://delivery-glauber.lovable.app/r/${slug}/driver` : '';

    const message = `🚚 *Nova Entrega Disponível!*\n\n` +
      `📋 *${storeConfig.name}*\n` +
      `📦 *Pedido #${order_id}*\n\n` +
      `👤 *Cliente:* ${customer_name}\n` +
      `📍 *Endereço:* ${address || 'Não informado'}\n` +
      `💰 *Total:* ${formattedTotal}\n` +
      `${paymentLabels[payment_method] || payment_method}\n\n` +
      `Acesse o sistema para aceitar a entrega:\n${driverLink}\n\n` +
      `⏰ ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

    const instance = storeConfig.evolution_instance_name;
    let sentCount = 0;
    let failedCount = 0;

    for (const driver of drivers) {
      if (!driver.phone) continue;

      let formattedPhone = driver.phone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('55')) {
        formattedPhone = '55' + formattedPhone;
      }

      try {
        const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionKey,
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message,
          }),
        });

        if (response.ok) {
          sentCount++;
        } else {
          failedCount++;
          const result = await response.text();
          console.error(`Failed to notify driver ${driver.name}:`, result);
        }
      } catch (e) {
        failedCount++;
        console.error(`Error notifying driver ${driver.name}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, sentCount, failedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending driver WhatsApp notifications:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
