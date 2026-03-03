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
    const { order_id, customer_name, customer_phone, status, store_name, instance, message, restaurant_id } = await req.json();

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionUrl || !evolutionKey) {
      console.error('Evolution API credentials not configured');
      await logNotification(supabaseAdmin, { restaurant_id, order_id, phone: customer_phone || '', instance: instance || '', status: 'error', error_message: 'Credenciais Evolution API não configuradas' });
      return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!customer_phone || !instance) {
      await logNotification(supabaseAdmin, { restaurant_id, order_id, phone: customer_phone || '', instance: instance || '', status: 'error', error_message: 'Telefone do cliente ou instância não configurados' });
      return new Response(JSON.stringify({ error: 'Customer phone or instance missing' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statusLabels: Record<string, string> = {
      pending: '🕐 Pendente',
      preparing: '👨‍🍳 Em preparo',
      delivery: '🚀 Saiu para entrega',
      completed: '✅ Entregue',
      cancelled: '❌ Cancelado',
    };

    const statusEmoji: Record<string, string> = {
      pending: '🕐',
      preparing: '👨‍🍳',
      delivery: '🚀',
      completed: '✅',
      cancelled: '❌',
    };

    // Use custom message from store_config if available, otherwise use default
    const defaultMessages: Record<string, string> = {
      pending: `Olá ${customer_name}! Seu pedido #${order_id} foi recebido e está aguardando confirmação.`,
      preparing: `Olá ${customer_name}! Seu pedido #${order_id} está sendo preparado! 🍽️`,
      delivery: `Olá ${customer_name}! Seu pedido #${order_id} saiu para entrega! 🏍️`,
      completed: `Olá ${customer_name}! Seu pedido #${order_id} foi entregue! Obrigado pela preferência! 😊`,
      cancelled: `Olá ${customer_name}, infelizmente seu pedido #${order_id} foi cancelado. Entre em contato para mais informações.`,
    };

    const statusText = statusLabels[status] || status;
    const customMessage = message || defaultMessages[status] || `Pedido #${order_id} atualizado para: ${status}`;

    const text = `${statusEmoji[status] || '📋'} *Atualização do Pedido #${order_id}*\n\n` +
      `📋 *${store_name}*\n\n` +
      `${customMessage}\n\n` +
      `Status: *${statusText}*`;

    let formattedPhone = customer_phone.replace(/\D/g, '');
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
        text,
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
    console.error('Error sending WhatsApp status notification:', error);
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
