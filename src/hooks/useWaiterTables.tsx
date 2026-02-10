import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TableWithOrder } from '@/types/pdv';

function useRestaurantIdFromSlug() {
  const { slug } = useParams<{ slug: string }>();

  const { data: restaurantId } = useQuery({
    queryKey: ['restaurant-id-from-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!slug,
  });

  return restaurantId;
}

export function useWaiterTablesWithOrders() {
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantIdFromSlug();

  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['waiter-tables-with-orders', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('number');

      if (tablesError) throw tablesError;

      const { data: ordersData, error: ordersError } = await supabase
        .from('table_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['open', 'requesting_bill']);

      if (ordersError) throw ordersError;

      return tablesData.map(table => ({
        ...table,
        current_order: table.current_order_id
          ? ordersData.find(o => o.id === table.current_order_id) || null
          : null,
      })) as TableWithOrder[];
    },
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`waiter-tables-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['waiter-tables-with-orders', restaurantId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_orders', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['waiter-tables-with-orders', restaurantId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, restaurantId]);

  return { tables, isLoading, error };
}
