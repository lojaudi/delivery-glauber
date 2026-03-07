import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CampaignSendState {
  isRunning: boolean;
  campaignId: string | null;
  progress: number;
  total: number;
  sent: number;
  failed: number;
}

interface CampaignSenderContextType {
  state: CampaignSendState;
  startSending: (campaignId: string, recipients: { id: string; phone: string; name: string }[], message: string, imageUrl?: string | null, instanceName?: string, restaurantId?: string) => void;
  cancelSending: () => void;
}

const defaultState: CampaignSendState = {
  isRunning: false,
  campaignId: null,
  progress: 0,
  total: 0,
  sent: 0,
  failed: 0,
};

const CampaignSenderContext = createContext<CampaignSenderContextType | undefined>(undefined);

export function CampaignSenderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CampaignSendState>(defaultState);
  const cancelledRef = useRef(false);

  const startSending = useCallback(async (
    campaignId: string,
    recipients: { id: string; phone: string; name: string }[],
    message: string,
    imageUrl?: string | null,
    instanceName?: string,
  ) => {
    cancelledRef.current = false;
    setState({
      isRunning: true,
      campaignId,
      progress: 0,
      total: recipients.length,
      sent: 0,
      failed: 0,
    });

    // Update campaign status to sending
    await supabase.from('campaigns').update({ status: 'sending', started_at: new Date().toISOString() }).eq('id', campaignId);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i++) {
      if (cancelledRef.current) break;

      const recipient = recipients[i];
      
      try {
        // Send via Evolution API edge function
        const { error } = await supabase.functions.invoke('evolution-api', {
          body: {
            action: 'sendText',
            instance: instanceName,
            phone: recipient.phone,
            message: message.replace('{nome}', recipient.name),
            ...(imageUrl ? { mediaUrl: imageUrl, mediaType: 'image' } : {}),
          },
        });

        if (error) throw error;

        await supabase.from('campaign_recipients').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        }).eq('id', recipient.id);

        sent++;
      } catch (err: any) {
        await supabase.from('campaign_recipients').update({
          status: 'failed',
          error_message: err?.message || 'Erro desconhecido',
        }).eq('id', recipient.id);
        failed++;
      }

      setState(prev => ({
        ...prev,
        progress: i + 1,
        sent,
        failed,
      }));

      // Update campaign counts
      await supabase.from('campaigns').update({ sent_count: sent, failed_count: failed }).eq('id', campaignId);

      // Wait 10 seconds between sends
      if (i < recipients.length - 1 && !cancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    // Mark campaign as completed
    await supabase.from('campaigns').update({
      status: cancelledRef.current ? 'cancelled' : 'completed',
      completed_at: new Date().toISOString(),
      sent_count: sent,
      failed_count: failed,
    }).eq('id', campaignId);

    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const cancelSending = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return (
    <CampaignSenderContext.Provider value={{ state, startSending, cancelSending }}>
      {children}
    </CampaignSenderContext.Provider>
  );
}

export function useCampaignSender() {
  const context = useContext(CampaignSenderContext);
  if (!context) {
    throw new Error('useCampaignSender must be used within CampaignSenderProvider');
  }
  return context;
}
