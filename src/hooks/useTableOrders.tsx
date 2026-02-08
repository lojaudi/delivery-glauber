import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { TableOrder, TableOrderItem, TableOrderStatus, OrderItemStatus } from '@/types/pdv';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { useAdminRestaurant } from './useAdminRestaurant';

// Hook for fetching closed orders (history) - filtered by restaurant_id
export function useClosedTableOrders(startDate: string, endDate: string) {
  const { restaurantId } = useAdminRestaurant();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['closed-table-orders', startDate, endDate, restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      const { data: ordersData, error: ordersError } = await supabase
        .from('table_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['paid', 'cancelled'])
        .gte('closed_at', startDateTime.toISOString())
        .lte('closed_at', endDateTime.toISOString())
        .order('closed_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get items for these orders
      const orderIds = ordersData.map(o => o.id);
      if (orderIds.length === 0) return [];

      const { data: itemsData, error: itemsError } = await supabase
        .from('table_order_items')
        .select('*')
        .in('table_order_id', orderIds);

      if (itemsError) throw itemsError;

      return ordersData.map(order => ({
        ...order,
        items: itemsData.filter(i => i.table_order_id === order.id),
      })) as (TableOrder & { items: TableOrderItem[] })[];
    },
    enabled: !!startDate && !!endDate && !!restaurantId,
  });

  return { orders, isLoading, error };
}

export function useTableOrder(orderId: number | null) {
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['table-order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('table_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as TableOrder;
    },
    enabled: !!orderId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['table-order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('table_order_items')
        .select('*')
        .eq('table_order_id', orderId)
        .order('ordered_at');

      if (error) throw error;
      return data as TableOrderItem[];
    },
    enabled: !!orderId,
  });

  return { order, items, isLoading, error };
}

export function useTableOrderMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { slug } = useParams<{ slug: string }>();

  // Get restaurant_id from slug
  const { data: restaurantId } = useQuery({
    queryKey: ['restaurant-id-by-slug', slug],
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

  const openTable = useMutation({
    mutationFn: async (data: { tableId: string | null; customerCount?: number; waiterName?: string; waiterId?: string; restaurant_id?: string }) => {
      const effectiveRestaurantId = data.restaurant_id || restaurantId;

      const { data: order, error: orderError } = await supabase
        .from('table_orders')
        .insert({
          table_id: data.tableId,
          customer_count: data.customerCount || 1,
          waiter_name: data.waiterName || null,
          waiter_id: data.waiterId || null,
          status: 'open' as TableOrderStatus,
          subtotal: 0,
          discount: 0,
          discount_type: 'value',
          service_fee_enabled: true,
          service_fee_percentage: 10,
          total_amount: 0,
          restaurant_id: effectiveRestaurantId,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update table only if tableId is provided (not quick sale)
      if (data.tableId) {
        const { error: tableError } = await supabase
          .from('tables')
          .update({ status: 'occupied', current_order_id: order.id })
          .eq('id', data.tableId);

        if (tableError) throw tableError;
      }

      return order as TableOrder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      if (variables.tableId) {
        toast({ title: 'Mesa aberta!' });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao abrir mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const addItem = useMutation({
    mutationFn: async (data: { 
      orderId: number; 
      productId: string; 
      productName: string; 
      quantity: number; 
      unitPrice: number;
      observation?: string;
    }) => {
      const { data: item, error: itemError } = await supabase
        .from('table_order_items')
        .insert({
          table_order_id: data.orderId,
          product_id: data.productId,
          product_name: data.productName,
          quantity: data.quantity,
          unit_price: data.unitPrice,
          observation: data.observation || null,
          status: 'pending' as OrderItemStatus,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Update order totals
      await updateOrderTotals(data.orderId);

      return item as TableOrderItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-order-items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['table-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Item adicionado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao adicionar item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateItemStatus = useMutation({
    mutationFn: async (data: { itemId: string; status: OrderItemStatus; orderId: number }) => {
      const updateData: Record<string, unknown> = { status: data.status };
      if (data.status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { data: item, error } = await supabase
        .from('table_order_items')
        .update(updateData)
        .eq('id', data.itemId)
        .select()
        .single();

      if (error) throw error;
      return item as TableOrderItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-order-items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-items'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (data: { itemId: string; orderId: number }) => {
      const { error } = await supabase
        .from('table_order_items')
        .delete()
        .eq('id', data.itemId);

      if (error) throw error;

      await updateOrderTotals(data.orderId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-order-items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['table-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Item removido!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao remover item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const requestBill = useMutation({
    mutationFn: async (data: { orderId: number; tableId: string }) => {
      const { error: orderError } = await supabase
        .from('table_orders')
        .update({ status: 'requesting_bill' })
        .eq('id', data.orderId);

      if (orderError) throw orderError;

      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'requesting_bill' })
        .eq('id', data.tableId);

      if (tableError) throw tableError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['table-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Conta solicitada!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao solicitar conta', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const closeTable = useMutation({
    mutationFn: async (data: { 
      orderId: number; 
      tableId: string | null; 
      paymentMethod: string;
      discount?: number;
      discountType?: 'value' | 'percentage';
      serviceFeeEnabled?: boolean;
      totalAmount?: number;
    }) => {
      const { error: orderError } = await supabase
        .from('table_orders')
        .update({
          status: 'paid' as TableOrderStatus,
          payment_method: data.paymentMethod,
          discount: data.discount || 0,
          discount_type: data.discountType || 'value',
          service_fee_enabled: data.serviceFeeEnabled ?? true,
          total_amount: data.totalAmount || 0,
          closed_at: new Date().toISOString(),
        })
        .eq('id', data.orderId);

      if (orderError) throw orderError;

      // Only update table if tableId is provided (not quick sale)
      if (data.tableId) {
        const { error: tableError } = await supabase
          .from('tables')
          .update({ status: 'available', current_order_id: null })
          .eq('id', data.tableId);

        if (tableError) throw tableError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      queryClient.invalidateQueries({ queryKey: ['closed-table-orders'] });
      if (variables.tableId) {
        toast({ title: 'Mesa fechada com sucesso!' });
      } else {
        toast({ title: 'Venda finalizada!' });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao fechar mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (data: { orderId: number; tableId: string }) => {
      const { error: orderError } = await supabase
        .from('table_orders')
        .update({ status: 'cancelled', closed_at: new Date().toISOString() })
        .eq('id', data.orderId);

      if (orderError) throw orderError;

      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'available', current_order_id: null })
        .eq('id', data.tableId);

      if (tableError) throw tableError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Pedido cancelado!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao cancelar pedido', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const transferTable = useMutation({
    mutationFn: async (data: { orderId: number; fromTableId: string; toTableId: string }) => {
      const { error: orderError } = await supabase
        .from('table_orders')
        .update({ table_id: data.toTableId })
        .eq('id', data.orderId);

      if (orderError) throw orderError;

      // Update from table
      const { error: fromError } = await supabase
        .from('tables')
        .update({ status: 'available', current_order_id: null })
        .eq('id', data.fromTableId);

      if (fromError) throw fromError;

      // Update to table
      const { error: toError } = await supabase
        .from('tables')
        .update({ status: 'occupied', current_order_id: data.orderId })
        .eq('id', data.toTableId);

      if (toError) throw toError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-orders'] });
      toast({ title: 'Mesa transferida com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao transferir mesa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    openTable,
    addItem,
    updateItemStatus,
    removeItem,
    requestBill,
    closeTable,
    cancelOrder,
    transferTable,
  };
}

// Helper function to update order totals
async function updateOrderTotals(orderId: number) {
  // Get all items for this order
  const { data: items, error: itemsError } = await supabase
    .from('table_order_items')
    .select('*')
    .eq('table_order_id', orderId)
    .neq('status', 'cancelled');

  if (itemsError) throw itemsError;

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * Number(item.unit_price)), 0);

  // Get order for discount info
  const { data: order, error: orderError } = await supabase
    .from('table_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  let discountAmount = 0;
  if (order.discount_type === 'percentage') {
    discountAmount = subtotal * (Number(order.discount) / 100);
  } else {
    discountAmount = Number(order.discount) || 0;
  }

  const afterDiscount = subtotal - discountAmount;
  const serviceFee = order.service_fee_enabled 
    ? afterDiscount * (Number(order.service_fee_percentage) / 100)
    : 0;

  const total = afterDiscount + serviceFee;

  const { error: updateError } = await supabase
    .from('table_orders')
    .update({ subtotal, total_amount: total })
    .eq('id', orderId);

  if (updateError) throw updateError;
}
