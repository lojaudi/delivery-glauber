import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';
import { useParams } from 'react-router-dom';

export interface StoreConfig {
  id: string;
  name: string;
  phone_whatsapp: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_open: boolean;
  delivery_fee: number;
  delivery_fee_mode: 'fixed' | 'zones';
  min_order_value: number;
  address: string | null;
  delivery_time_min: number;
  delivery_time_max: number;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  pwa_name: string | null;
  pwa_short_name: string | null;
  pix_message: string | null;
  msg_order_accepted: string | null;
  msg_order_preparing: string | null;
  msg_order_delivery: string | null;
  msg_order_completed: string | null;
  restaurant_id: string | null;
  timezone: string | null;
}

export function useStoreConfig() {
  const { restaurantId } = useAdminRestaurant();
  const { slug } = useParams<{ slug: string }>();

  return useQuery({
    queryKey: ['store-config', restaurantId, slug],
    queryFn: async () => {
      let query = supabase
        .from('store_config')
        .select('*');

      // Se tem restaurantId (admin logado), filtra por ele
      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      } 
      // Se tem slug na URL, busca o restaurant_id pelo slug primeiro
      else if (slug) {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        
        if (restaurant) {
          query = query.eq('restaurant_id', restaurant.id);
        } else {
          return null;
        }
      }
      // Se não tem nem restaurantId nem slug, não retorna nada (evita vazamento de dados)
      else {
        return null;
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        delivery_fee_mode: (data.delivery_fee_mode || 'fixed') as 'fixed' | 'zones',
        delivery_time_min: data.delivery_time_min || 30,
        delivery_time_max: data.delivery_time_max || 45,
      } as StoreConfig;
    },
    enabled: !!restaurantId || !!slug,
  });
}

export function useUpdateStoreConfig() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<StoreConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('store_config')
        .update(update)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0] as StoreConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
    },
  });
}
