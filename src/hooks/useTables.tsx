import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableWithOrder, TableStatus } from '@/types/pdv';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';

export function useTables() {
  const { restaurantId } = useAdminRestaurant();

  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('number');

      if (error) throw error;
      return data as Table[];
    },
    enabled: !!restaurantId,
  });

  return { tables, isLoading, error };
}

export function useTablesWithOrders() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();

  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['tables-with-orders', restaurantId],
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

  // Realtime subscription for tables and orders - filtered by restaurant
  useEffect(() => {
    if (!restaurantId) return;

    const tablesChannel = supabase
      .channel(`tables-realtime-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
          queryClient.invalidateQueries({ queryKey: ['tables-with-orders', restaurantId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tables-with-orders', restaurantId] });
          queryClient.invalidateQueries({ queryKey: ['table-order'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
    };
  }, [queryClient, restaurantId]);

  return { tables, isLoading, error };
}

export function useTableMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();

  const createTable = useMutation({
    mutationFn: async (data: { number: number; name?: string; capacity?: number; restaurant_id?: string }) => {
      const effectiveRestaurantId = data.restaurant_id || restaurantId;
      
      if (!effectiveRestaurantId) {
        throw new Error('Restaurant ID não encontrado');
      }

      const { data: newTable, error } = await supabase
        .from('tables')
        .insert({
          number: data.number,
          name: data.name || null,
          capacity: data.capacity || 4,
          status: 'available' as TableStatus,
          restaurant_id: effectiveRestaurantId,
        })
        .select()
        .single();

      if (error) throw error;
      return newTable as Table;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Mesa criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao criar mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateTable = useMutation({
    mutationFn: async (data: { id: string; number?: number; name?: string; capacity?: number; status?: TableStatus }) => {
      const updateData: Record<string, unknown> = {};
      if (data.number !== undefined) updateData.number = data.number;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.capacity !== undefined) updateData.capacity = data.capacity;
      if (data.status !== undefined) updateData.status = data.status;

      const { data: updated, error } = await supabase
        .from('tables')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return updated as Table;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Mesa atualizada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteTable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Mesa excluída!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao excluir mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return { createTable, updateTable, deleteTable };
}
