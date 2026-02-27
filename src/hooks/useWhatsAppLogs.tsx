import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';

export interface WhatsAppLog {
  id: string;
  order_id: number;
  phone: string;
  instance_name: string;
  status: string;
  error_message: string | null;
  sent_at: string;
}

export function useWhatsAppLogs() {
  const { restaurantId } = useAdminRestaurant();

  return useQuery({
    queryKey: ['whatsapp-logs', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_notification_logs' as any)
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as WhatsAppLog[];
    },
    enabled: !!restaurantId,
  });
}
