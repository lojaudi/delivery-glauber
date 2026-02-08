import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';
import { useToast } from '@/hooks/use-toast';

export function useOrdersRealtime() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();
  const { toast } = useToast();

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`orders-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });

          // Show toast for new orders
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as { id: number; customer_name: string };
            toast({
              title: '🔔 Novo pedido!',
              description: `Pedido #${newOrder.id} de ${newOrder.customer_name}`,
            });
          }

          // Show toast for status updates
          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as { id: number; status: string };
            const oldOrder = payload.old as { status: string };
            
            if (updatedOrder.status !== oldOrder.status) {
              const statusLabels: Record<string, string> = {
                pending: 'Pendente',
                preparing: 'Em preparo',
                delivery: 'Saiu para entrega',
                completed: 'Finalizado',
                cancelled: 'Cancelado',
              };
              
              toast({
                title: `Pedido #${updatedOrder.id} atualizado`,
                description: `Status: ${statusLabels[updatedOrder.status] || updatedOrder.status}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient, toast]);
}
