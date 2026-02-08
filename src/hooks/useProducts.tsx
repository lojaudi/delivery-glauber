import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';
import { useParams } from 'react-router-dom';

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  restaurant_id?: string | null;
}

export function useProducts() {
  const { restaurantId } = useAdminRestaurant();
  const { slug } = useParams<{ slug: string }>();

  return useQuery({
    queryKey: ['products', restaurantId, slug],
    queryFn: async () => {
      let effectiveRestaurantId = restaurantId;

      // Se não tem restaurantId mas tem slug, busca o restaurant_id pelo slug
      if (!effectiveRestaurantId && slug) {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        
        if (restaurant) {
          effectiveRestaurantId = restaurant.id;
        }
      }

      if (!effectiveRestaurantId) {
        return [];
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', effectiveRestaurantId)
        .order('name');

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!restaurantId || !!slug,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, restaurant_id: restaurantId })
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(update)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0] as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
