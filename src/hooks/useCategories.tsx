import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';
import { useParams } from 'react-router-dom';

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  image_url?: string | null;
  restaurant_id?: string | null;
}

export function useCategories() {
  const { restaurantId } = useAdminRestaurant();
  const { slug } = useParams<{ slug: string }>();

  return useQuery({
    queryKey: ['categories', restaurantId, slug],
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
        .from('categories')
        .select('*')
        .eq('restaurant_id', effectiveRestaurantId)
        .order('sort_order');

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!restaurantId || !!slug,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();
  
  return useMutation({
    mutationFn: async (category: { name: string; sort_order: number; image_url?: string | null }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, restaurant_id: restaurantId })
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(update)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0] as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
