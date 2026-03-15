import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';
import { useParams } from 'react-router-dom';

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_complement: string | null;
  address_reference: string | null;
  total_amount: number;
  status: 'pending' | 'preparing' | 'delivery' | 'completed' | 'cancelled';
  payment_method: 'money' | 'card' | 'pix';
  change_for: number | null;
  created_at: string;
  updated_at: string;
  restaurant_id?: string | null;
}

export interface OrderItem {
  id: string;
  order_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  observation: string | null;
}

export interface CreateOrderData {
  customer_name: string;
  customer_phone: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_complement?: string | null;
  address_reference?: string | null;
  total_amount: number;
  payment_method: 'money' | 'card' | 'pix';
  change_for?: number | null;
  restaurant_id?: string | null;
}

export interface CreateOrderItemData {
  order_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  observation?: string | null;
}

// Hook para buscar restaurant_id pelo slug (para clientes)
function useRestaurantIdBySlug() {
  const { slug } = useParams<{ slug: string }>();
  
  const { data } = useQuery({
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

  return data;
}

export function useOrders() {
  const { restaurantId } = useAdminRestaurant();

  return useQuery({
    queryKey: ['orders', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        return [];
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!restaurantId,
  });
}

export function useOrderItems(orderId: number) {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderId,
  });
}

export function useOrderWithItems(orderId: number) {
  const { slug } = useParams<{ slug: string }>();
  const isCustomerContext = !!slug;
  
  const orderQuery = useQuery({
    queryKey: ['order', orderId, slug],
    queryFn: async () => {
      if (isCustomerContext) {
        // Customer context: use secure edge function
        let restaurantId: string | null = null;
        if (slug) {
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();
          restaurantId = restaurant?.id || null;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/lookup-customer-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'by_id', orderId, restaurantId }),
        });

        if (!response.ok) throw new Error('Pedido não encontrado');
        const result = await response.json();
        return result.order as Order;
      } else {
        // Admin context: use direct query (authenticated)
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) throw error;
        return data as Order;
      }
    },
    enabled: !!orderId,
  });

  const itemsQuery = useQuery({
    queryKey: ['order-items', orderId, slug],
    queryFn: async () => {
      if (isCustomerContext) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/lookup-customer-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'items', orderId }),
        });

        if (!response.ok) throw new Error('Itens não encontrados');
        const result = await response.json();
        return result.items as OrderItem[];
      } else {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);
        if (error) throw error;
        return data as OrderItem[];
      }
    },
    enabled: !!orderId,
  });

  return {
    order: orderQuery.data,
    items: itemsQuery.data,
    isLoading: orderQuery.isLoading || itemsQuery.isLoading,
    error: orderQuery.error || itemsQuery.error,
  };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { restaurantId: adminRestaurantId } = useAdminRestaurant();
  const slugRestaurantId = useRestaurantIdBySlug();
  
  // Use slug restaurant ID first (for customers), then fall back to admin restaurant ID
  const effectiveRestaurantId = slugRestaurantId || adminRestaurantId;

  return useMutation({
    mutationFn: async ({ order, items }: { order: CreateOrderData; items: Omit<CreateOrderItemData, 'order_id'>[] }) => {
      // Determine the restaurant_id to use
      const restaurantId = order.restaurant_id || effectiveRestaurantId;
      
      if (!restaurantId) {
        throw new Error('Restaurant ID não encontrado');
      }

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          address_street: order.address_street,
          address_number: order.address_number,
          address_neighborhood: order.address_neighborhood,
          address_complement: order.address_complement || null,
          address_reference: order.address_reference || null,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          change_for: order.change_for || null,
          status: 'pending',
          restaurant_id: restaurantId,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        observation: item.observation || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return orderData as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: Order['status'] }) => {
      if (!restaurantId) {
        throw new Error('Restaurant ID não encontrado');
      }

      // First validate that the order belongs to this restaurant
      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders')
        .select('restaurant_id, customer_name, customer_phone, total_amount, address_street, address_number, address_neighborhood')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;
      if (existingOrder.restaurant_id !== restaurantId) {
        throw new Error('Unauthorized: Order does not belong to this restaurant');
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .select()
        .single();

      if (error) throw error;

      // Send WhatsApp status notification (non-blocking)
      try {
        const { data: storeConfig } = await supabase
          .from('store_config')
          .select('evolution_instance_name, name, msg_order_preparing, msg_order_delivery, msg_order_completed')
          .eq('restaurant_id', restaurantId)
          .single();

        if (storeConfig?.evolution_instance_name && existingOrder.customer_phone) {
          const customMessages: Record<string, string | null> = {
            preparing: storeConfig.msg_order_preparing,
            delivery: storeConfig.msg_order_delivery,
            completed: storeConfig.msg_order_completed,
          };

          const fullAddress = [existingOrder.address_street, existingOrder.address_number, existingOrder.address_neighborhood].filter(Boolean).join(', ');

          supabase.functions.invoke('notify-whatsapp-status', {
            body: {
              order_id: orderId,
              customer_name: existingOrder.customer_name,
              customer_phone: existingOrder.customer_phone,
              status,
              store_name: storeConfig.name,
              instance: storeConfig.evolution_instance_name,
              message: customMessages[status] || null,
              restaurant_id: restaurantId,
              total_amount: existingOrder.total_amount,
              address: fullAddress,
            },
          }).catch((err) => {
            console.warn('WhatsApp status notification failed:', err);
          });
        }
      } catch (e) {
        console.warn('Failed to send WhatsApp notification:', e);
      }

      // Create delivery assignment and notify drivers when status changes to "delivery"
      if (status === 'delivery') {
        try {
          await supabase.from('delivery_assignments').insert({
            order_id: orderId,
            restaurant_id: restaurantId,
            status: 'pending',
          });
        } catch (e) {
          console.warn('Failed to create delivery assignment:', e);
        }

        // Notify drivers via WhatsApp (non-blocking)
        try {
          const fullAddress = [existingOrder.address_street, existingOrder.address_number, existingOrder.address_neighborhood].filter(Boolean).join(', ');
          
          // Get slug from restaurant
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('slug')
            .eq('id', restaurantId)
            .single();

          supabase.functions.invoke('notify-driver-whatsapp', {
            body: {
              order_id: orderId,
              customer_name: existingOrder.customer_name,
              total_amount: existingOrder.total_amount,
              payment_method: data.payment_method,
              address: fullAddress,
              restaurant_id: restaurantId,
              slug: restaurant?.slug || '',
            },
          }).catch((err) => {
            console.warn('Driver WhatsApp notification failed:', err);
          });
        } catch (e) {
          console.warn('Failed to notify drivers via WhatsApp:', e);
        }
      }

      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
