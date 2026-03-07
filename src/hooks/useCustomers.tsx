import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';

export interface Customer {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export function useCustomers() {
  const { restaurantId } = useAdminRestaurant();
  const queryClient = useQueryClient();

  const customersQuery = useQuery({
    queryKey: ['customers', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!restaurantId,
  });

  const deleteCustomers = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', restaurantId] });
    },
  });

  return {
    customers: customersQuery.data || [],
    isLoading: customersQuery.isLoading,
    deleteCustomers,
  };
}
