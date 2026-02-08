import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminRestaurant } from './useAdminRestaurant';
import { useParams } from 'react-router-dom';

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  min_order_value: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  restaurant_id?: string | null;
}

export function useDeliveryZones() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();
  const { slug } = useParams<{ slug: string }>();

  const { data: zones = [], isLoading, refetch } = useQuery({
    queryKey: ['delivery-zones', restaurantId, slug],
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
        .from('delivery_zones')
        .select('*')
        .eq('restaurant_id', effectiveRestaurantId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as DeliveryZone[];
    },
    enabled: !!restaurantId || !!slug,
  });

  const createZone = useMutation({
    mutationFn: async (zone: Omit<DeliveryZone, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .insert({ ...zone, restaurant_id: restaurantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: 'Zona de entrega criada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar zona', description: error.message, variant: 'destructive' });
    },
  });

  const updateZone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryZone> & { id: string }) => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: 'Zona atualizada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar zona', description: error.message, variant: 'destructive' });
    },
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: 'Zona removida com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover zona', description: error.message, variant: 'destructive' });
    },
  });

  return {
    zones,
    isLoading,
    refetch,
    createZone,
    updateZone,
    deleteZone,
  };
}