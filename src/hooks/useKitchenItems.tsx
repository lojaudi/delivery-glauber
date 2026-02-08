import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

export interface KitchenItem {
  id: string;
  table_order_id: number | null;
  order_id: number | null;
  product_id: string | null;
  product_name: string;
  quantity: number;
  observation: string | null;
  unit_price: number;
  status: string;
  ordered_at: string;
  delivered_at: string | null;
  table_number: number | null;
  table_name: string | null;
  waiter_name: string | null;
  order_type: 'table' | 'delivery';
  customer_name?: string;
}

type KitchenItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

// Hook to get restaurant_id from slug
function useRestaurantIdFromSlug() {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: restaurantId } = useQuery({
    queryKey: ['restaurant-id-for-kitchen', slug],
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

export function useKitchenItems(statusFilter?: KitchenItemStatus) {
  const restaurantId = useRestaurantIdFromSlug();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['kitchen-items', statusFilter, restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      // Get open table orders for this restaurant
      const { data: openTableOrders, error: ordersError } = await supabase
        .from('table_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['open', 'requesting_bill']);

      if (ordersError) throw ordersError;

      const orderIds = openTableOrders.map(o => o.id);

      // Get tables for this restaurant
      const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (tablesError) throw tablesError;

      // Get table order items
      let tableItemsQuery = supabase
        .from('table_order_items')
        .select('*')
        .in('table_order_id', orderIds.length > 0 ? orderIds : [-1]);

      if (statusFilter) {
        tableItemsQuery = tableItemsQuery.eq('status', statusFilter);
      } else {
        tableItemsQuery = tableItemsQuery.in('status', ['pending', 'preparing', 'ready']);
      }

      const { data: tableOrderItems, error: itemsError } = await tableItemsQuery;

      if (itemsError) throw itemsError;

      // Transform table order items
      const tableItems: KitchenItem[] = (tableOrderItems || []).map(item => {
        const order = openTableOrders.find(o => o.id === item.table_order_id);
        const table = tables.find(t => t.id === order?.table_id);
        return {
          id: item.id,
          table_order_id: item.table_order_id,
          order_id: null,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          observation: item.observation,
          unit_price: Number(item.unit_price),
          status: item.status || 'pending',
          ordered_at: item.ordered_at || new Date().toISOString(),
          delivered_at: item.delivered_at,
          table_number: table?.number || null,
          table_name: table?.name || null,
          waiter_name: order?.waiter_name || null,
          order_type: 'table' as const,
        };
      });

      // Get delivery orders that are pending/preparing for this restaurant
      const { data: deliveryOrders, error: deliveryError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'preparing']);

      if (deliveryError) throw deliveryError;

      const deliveryOrderIds = deliveryOrders.map(o => o.id);

      // Get delivery order items
      const { data: deliveryOrderItems, error: deliveryItemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', deliveryOrderIds.length > 0 ? deliveryOrderIds : [-1]);

      if (deliveryItemsError) throw deliveryItemsError;

      // Transform delivery order items
      const mapOrderStatusToKitchenStatus = (orderStatus: string): string => {
        switch (orderStatus) {
          case 'pending':
            return 'pending';
          case 'preparing':
            return 'preparing';
          default:
            return 'pending';
        }
      };

      const deliveryItems: KitchenItem[] = (deliveryOrderItems || []).map(item => {
        const order = deliveryOrders.find(o => o.id === item.order_id);
        return {
          id: item.id,
          table_order_id: null,
          order_id: item.order_id,
          product_id: null,
          product_name: item.product_name,
          quantity: item.quantity,
          observation: item.observation,
          unit_price: Number(item.unit_price),
          status: mapOrderStatusToKitchenStatus(order?.status || 'pending'),
          ordered_at: order?.created_at || new Date().toISOString(),
          delivered_at: null,
          table_number: null,
          table_name: null,
          waiter_name: null,
          order_type: 'delivery' as const,
          customer_name: order?.customer_name,
        };
      });

      // Filter delivery items by status if needed
      let filteredDeliveryItems = deliveryItems;
      if (statusFilter) {
        filteredDeliveryItems = deliveryItems.filter(item => item.status === statusFilter);
      } else {
        filteredDeliveryItems = deliveryItems.filter(item => 
          ['pending', 'preparing', 'ready'].includes(item.status)
        );
      }

      // Combine and sort by ordered_at
      const allItems = [...tableItems, ...filteredDeliveryItems].sort((a, b) => 
        new Date(a.ordered_at).getTime() - new Date(b.ordered_at).getTime()
      );

      return allItems;
    },
    enabled: !!restaurantId,
  });

  return { items, isLoading, error };
}

export function useKitchenItemMutations() {
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantIdFromSlug();

  const updateItemStatus = async (itemId: string, newStatus: KitchenItemStatus, orderType: 'table' | 'delivery' = 'table', orderId?: number) => {
    if (!restaurantId) {
      throw new Error('Restaurant ID not found');
    }

    if (orderType === 'table') {
      // First validate that the item belongs to an order from this restaurant
      const { data: item, error: fetchError } = await supabase
        .from('table_order_items')
        .select('table_order_id')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      const { data: order, error: orderError } = await supabase
        .from('table_orders')
        .select('restaurant_id')
        .eq('id', item.table_order_id)
        .single();

      if (orderError) throw orderError;
      if (order.restaurant_id !== restaurantId) {
        throw new Error('Unauthorized: Item does not belong to this restaurant');
      }

      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('table_order_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;
    } else {
      // For delivery orders, validate ownership first
      if (orderId) {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('restaurant_id')
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;
        if (order.restaurant_id !== restaurantId) {
          throw new Error('Unauthorized: Order does not belong to this restaurant');
        }

        const orderStatusMap: Record<string, string> = {
          'pending': 'pending',
          'preparing': 'preparing',
          'ready': 'delivery',
        };

        const { error } = await supabase
          .from('orders')
          .update({ status: orderStatusMap[newStatus] || newStatus })
          .eq('id', orderId);

        if (error) throw error;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['kitchen-items'] });
  };

  return { updateItemStatus };
}

// Hook for waiter to see ready items
export function useWaiterReadyItems(waiterId?: string) {
  const restaurantId = useRestaurantIdFromSlug();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['waiter-ready-items', waiterId, restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      // Get open table orders for this restaurant
      const { data: openTableOrders, error: ordersError } = await supabase
        .from('table_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['open', 'requesting_bill']);

      if (ordersError) throw ordersError;

      const orderIds = openTableOrders.map(o => o.id);

      // Get tables for this restaurant
      const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (tablesError) throw tablesError;

      // Get ready items
      const { data: readyItems, error: itemsError } = await supabase
        .from('table_order_items')
        .select('*')
        .in('table_order_id', orderIds.length > 0 ? orderIds : [-1])
        .eq('status', 'ready');

      if (itemsError) throw itemsError;

      return (readyItems || []).map(item => {
        const order = openTableOrders.find(o => o.id === item.table_order_id);
        const table = tables.find(t => t.id === order?.table_id);
        return {
          id: item.id,
          table_order_id: item.table_order_id,
          order_id: null,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          observation: item.observation,
          unit_price: Number(item.unit_price),
          status: item.status || 'ready',
          ordered_at: item.ordered_at || new Date().toISOString(),
          delivered_at: item.delivered_at,
          table_number: table?.number || null,
          table_name: table?.name || null,
          waiter_name: order?.waiter_name || null,
          order_type: 'table' as const,
        };
      }) as KitchenItem[];
    },
    enabled: !!restaurantId,
  });

  return { items, isLoading, error };
}
