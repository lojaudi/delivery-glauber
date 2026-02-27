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
    const { order_id, customer_name, total_amount, payment_method, phone, instance, store_name, items, address, restaurant_id } = await req.json();

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionUrl || !evolutionKey) {
      console.error('Evolution API credentials not configured');
      await logNotification(supabaseAdmin, { restaurant_id, order_id, phone, instance, status: 'error', error_message: 'Credenciais Evolution API não configuradas' });
      return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!phone || !instance) {
      await logNotification(supabaseAdmin, { restaurant_id, order_id, phone: phone || '', instance: instance || '', status: 'error', error_message: 'Telefone ou instância não configurados' });
      return new Response(JSON.stringify({ error: 'Phone or instance missing' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentLabels: Record<string, string> = {
      money: '💵 Dinheiro',
      card: '💳 Cartão',
      pix: '📱 PIX',
    };

    const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(total_amount));

    const message = `🔔 *Novo Pedido #${order_id}*\n\n` +
      `📋 *${store_name}*\n\n` +
      `👤 *Cliente:* ${customer_name}\n` +
      `📍 *Endereço:* ${address || 'Não informado'}\n\n` +
      `🛒 *Itens:*\n${items}\n\n` +
      `💰 *Total:* ${formattedTotal}\n` +
      `${paymentLabels[payment_method] || payment_method}\n\n` +
      `⏰ ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

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

    const result = await response.text();
    console.log('Evolution API response:', response.status, result);

    if (response.ok) {
      await logNotification(supabaseAdmin, { restaurant_id, order_id, phone: formattedPhone, instance, status: 'sent', error_message: null });
    } else {
      await logNotification(supabaseAdmin, { restaurant_id, order_id, phone: formattedPhone, instance, status: 'error', error_message: `HTTP ${response.status}: ${result.substring(0, 200)}` });
    }

    return new Response(JSON.stringify({ success: response.ok }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function logNotification(supabase: any, data: {
  restaurant_id: string;
  order_id: number;
  phone: string;
  instance: string;
  status: string;
  error_message: string | null;
}) {
  try {
    await supabase.from('whatsapp_notification_logs').insert({
      restaurant_id: data.restaurant_id,
      order_id: data.order_id,
      phone: data.phone,
      instance_name: data.instance,
      status: data.status,
      error_message: data.error_message,
    });
  } catch (e) {
    console.error('Failed to log notification:', e);
  }
}
