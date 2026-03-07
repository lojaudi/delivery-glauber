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

  // Verify auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

  if (!evolutionUrl || !evolutionKey) {
    return new Response(JSON.stringify({ error: 'Evolution API não configurada pelo administrador do sistema' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const reqBody = await req.json();
    const { action, instance_name, restaurant_id, phone, message: msgText, mediaUrl, mediaType } = reqBody;

    // Verify user can manage this restaurant
    const { data: canManage } = await supabaseAdmin.rpc('can_manage_restaurant', {
      _user_id: user.id,
      _restaurant_id: restaurant_id,
    });

    if (!canManage) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': evolutionKey,
    };

    switch (action) {
      case 'create': {
        // Create instance with the restaurant_id as name
        const instanceName = instance_name || `rest-${restaurant_id.substring(0, 8)}`;
        
        const res = await fetch(`${evolutionUrl}/instance/create`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            instanceName,
            integration: 'WHATSAPP-BAILEYS',
            qrcode: true,
          }),
        });

        const data = await res.text();
        console.log('Create instance response:', res.status, data);

        if (!res.ok) {
          return new Response(JSON.stringify({ error: `Erro ao criar instância: ${data}` }), {
            status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save instance name to store_config
        await supabaseAdmin
          .from('store_config')
          .update({ evolution_instance_name: instanceName })
          .eq('restaurant_id', restaurant_id);

        const parsed = JSON.parse(data);
        return new Response(JSON.stringify({ 
          success: true, 
          instance_name: instanceName,
          qrcode: parsed?.qrcode?.base64 || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'qrcode': {
        if (!instance_name) {
          return new Response(JSON.stringify({ error: 'Instance name required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const res = await fetch(`${evolutionUrl}/instance/connect/${instance_name}`, {
          method: 'GET',
          headers,
        });

        const data = await res.text();
        console.log('QR code response:', res.status, data);

        if (!res.ok) {
          return new Response(JSON.stringify({ error: `Erro ao obter QR Code: ${data}` }), {
            status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const parsed = JSON.parse(data);
        return new Response(JSON.stringify({ 
          success: true, 
          qrcode: parsed?.base64 || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        if (!instance_name) {
          return new Response(JSON.stringify({ error: 'Instance name required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const res = await fetch(`${evolutionUrl}/instance/connectionState/${instance_name}`, {
          method: 'GET',
          headers,
        });

        const data = await res.text();
        console.log('Status response:', res.status, data);

        if (!res.ok) {
          // If instance doesn't exist, return disconnected
          return new Response(JSON.stringify({ 
            success: true, 
            state: 'close',
            connected: false,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const parsed = JSON.parse(data);
        const state = parsed?.instance?.state || parsed?.state || 'close';
        return new Response(JSON.stringify({ 
          success: true, 
          state,
          connected: state === 'open',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        if (!instance_name) {
          return new Response(JSON.stringify({ error: 'Instance name required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Logout the instance
        await fetch(`${evolutionUrl}/instance/logout/${instance_name}`, {
          method: 'DELETE',
          headers,
        });

        // Delete the instance
        await fetch(`${evolutionUrl}/instance/delete/${instance_name}`, {
          method: 'DELETE',
          headers,
        });

        // Clear from store_config
        await supabaseAdmin
          .from('store_config')
          .update({ evolution_instance_name: null })
          .eq('restaurant_id', restaurant_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sendText': {
        const body = await req.clone().json();
        const { phone, message: msgText, instance: inst } = body;
        const targetInstance = inst || instance_name;
        if (!targetInstance || !phone || !msgText) {
          return new Response(JSON.stringify({ error: 'instance, phone and message required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55')) formattedPhone = '55' + formattedPhone;

        const sendRes = await fetch(`${evolutionUrl}/message/sendText/${targetInstance}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: formattedPhone, text: msgText }),
        });
        const sendData = await sendRes.text();
        if (!sendRes.ok) {
          return new Response(JSON.stringify({ error: `Erro ao enviar: ${sendData}` }), {
            status: sendRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sendMedia': {
        const body2 = await req.clone().json();
        const { phone: ph, message: cap, instance: inst2, mediaUrl, mediaType } = body2;
        const targetInst = inst2 || instance_name;
        if (!targetInst || !ph || !mediaUrl) {
          return new Response(JSON.stringify({ error: 'instance, phone and mediaUrl required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        let fPhone = ph.replace(/\D/g, '');
        if (!fPhone.startsWith('55')) fPhone = '55' + fPhone;

        const mediaRes = await fetch(`${evolutionUrl}/message/sendMedia/${targetInst}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: fPhone,
            mediatype: mediaType || 'image',
            media: mediaUrl,
            caption: cap || '',
          }),
        });
        const mediaData = await mediaRes.text();
        if (!mediaRes.ok) {
          return new Response(JSON.stringify({ error: `Erro ao enviar mídia: ${mediaData}` }), {
            status: mediaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Evolution API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
