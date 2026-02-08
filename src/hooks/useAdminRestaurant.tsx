import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook centralizado para obter o restaurantId do admin logado.
 * Funciona tanto com rotas /r/:slug/admin/* quanto /admin/*
 * 
 * Para rotas com slug: usa o slug para buscar o restaurante
 * Para rotas sem slug: usa o user_id para buscar o restaurante do admin
 */
export function useAdminRestaurant() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  // Se tem slug na URL, busca por slug
  const { data: restaurantBySlug, isLoading: loadingBySlug } = useQuery({
    queryKey: ['admin-restaurant-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Se não tem slug, busca pelo user_id do admin
  const { data: restaurantByUser, isLoading: loadingByUser } = useQuery({
    queryKey: ['admin-restaurant-by-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Primeiro busca o restaurant_id do admin
      const { data: adminData, error: adminError } = await supabase
        .from('restaurant_admins')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminError) throw adminError;
      if (!adminData) return null;

      // Depois busca os detalhes básicos do restaurante
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, slug')
        .eq('id', adminData.restaurant_id)
        .maybeSingle();

      if (restaurantError) throw restaurantError;
      return restaurantData;
    },
    enabled: !!user?.id && !slug,
  });

  const restaurant = slug ? restaurantBySlug : restaurantByUser;
  const isLoading = slug ? loadingBySlug : loadingByUser;

  return {
    restaurantId: restaurant?.id || null,
    restaurantName: restaurant?.name || null,
    restaurantSlug: restaurant?.slug || null,
    isLoading,
  };
}
