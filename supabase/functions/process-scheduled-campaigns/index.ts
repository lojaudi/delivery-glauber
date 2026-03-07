import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find scheduled campaigns that are due
    const now = new Date().toISOString();
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (campError) throw campError;
    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ message: 'No campaigns to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const campaign of campaigns) {
      // Get store config for Evolution API instance
      const { data: storeConfig } = await supabase
        .from('store_config')
        .select('evolution_instance_name')
        .eq('restaurant_id', campaign.restaurant_id)
        .single();

      const instanceName = storeConfig?.evolution_instance_name;
      if (!instanceName) {
        await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaign.id);
        continue;
      }

      // Get recipients
      const { data: recipients } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending');

      if (!recipients || recipients.length === 0) {
        await supabase.from('campaigns').update({ status: 'completed', completed_at: now }).eq('id', campaign.id);
        continue;
      }

      // Update campaign to sending
      await supabase.from('campaigns').update({ status: 'sending', started_at: now }).eq('id', campaign.id);

      let sent = campaign.sent_count || 0;
      let failed = campaign.failed_count || 0;

      const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
      const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;

      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        try {
          const phone = r.customer_phone.replace(/\D/g, '');
          const messageText = campaign.message.replace('{nome}', r.customer_name);

          if (campaign.image_url) {
            await fetch(`${evolutionApiUrl}/message/sendMedia/${instanceName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: evolutionApiKey,
              },
              body: JSON.stringify({
                number: phone.startsWith('55') ? phone : `55${phone}`,
                mediatype: 'image',
                media: campaign.image_url,
                caption: messageText,
              }),
            });
          } else {
            await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: evolutionApiKey,
              },
              body: JSON.stringify({
                number: phone.startsWith('55') ? phone : `55${phone}`,
                text: messageText,
              }),
            });
          }

          await supabase.from('campaign_recipients').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          }).eq('id', r.id);
          sent++;
        } catch (err) {
          await supabase.from('campaign_recipients').update({
            status: 'failed',
            error_message: String(err),
          }).eq('id', r.id);
          failed++;
        }

        await supabase.from('campaigns').update({ sent_count: sent, failed_count: failed }).eq('id', campaign.id);

        // 10 second delay between sends
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      await supabase.from('campaigns').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
      }).eq('id', campaign.id);
    }

    return new Response(JSON.stringify({ success: true, processed: campaigns.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
