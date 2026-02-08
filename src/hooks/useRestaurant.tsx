import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/reseller';
import { useAuth } from './useAuth';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  restaurantId: string | null;
  isLoading: boolean;
  error: Error | null;
  slug: string | null;
  isBlocked: boolean;
  blockReason: string | null;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Query para buscar restaurante por slug (para clientes)
  const { data: restaurantBySlug, isLoading: loadingBySlug, error: slugError } = useQuery({
    queryKey: ['restaurant-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as Restaurant | null;
    },
    enabled: !!slug,
  });

  // Query para buscar restaurante do admin logado
  const { data: restaurantByUser, isLoading: loadingByUser, error: userError } = useQuery({
    queryKey: ['restaurant-by-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Primeiro, buscar o restaurant_id do admin
      const { data: adminData, error: adminError } = await supabase
        .from('restaurant_admins')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminError) throw adminError;
      if (!adminData) return null;

      // Depois, buscar os detalhes do restaurante
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', adminData.restaurant_id)
        .maybeSingle();

      if (restaurantError) throw restaurantError;
      return restaurantData as Restaurant | null;
    },
    enabled: !!user?.id && !slug,
  });

  // Determinar qual restaurante usar
  const restaurant = slug ? restaurantBySlug : restaurantByUser;
  const isLoading = slug ? loadingBySlug : loadingByUser;
  const error = slug ? slugError : userError;

  // Verificar se restaurante está bloqueado
  const isBlocked = restaurant?.subscription_status === 'suspended' || 
                    restaurant?.subscription_status === 'cancelled';
  
  const blockReason = isBlocked 
    ? restaurant?.subscription_status === 'suspended' 
      ? 'A assinatura deste estabelecimento está suspensa por falta de pagamento.'
      : 'A assinatura deste estabelecimento foi cancelada.'
    : null;

  useEffect(() => {
    if (restaurant?.id) {
      setRestaurantId(restaurant.id);
    }
  }, [restaurant?.id]);

  // Redirecionar para página de suspenso se restaurante estiver bloqueado
  // Apenas para páginas do cliente (não admin)
  useEffect(() => {
    if (isBlocked && slug && !location.pathname.includes('/admin') && !location.pathname.includes('/suspended')) {
      navigate(`/r/${slug}/suspended`, { replace: true });
    }
  }, [isBlocked, slug, location.pathname, navigate]);

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        restaurantId: restaurant?.id || restaurantId,
        isLoading,
        error: error as Error | null,
        slug: slug || restaurant?.slug || null,
        isBlocked,
        blockReason,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}

// Hook para usar em páginas que não precisam do provider
export function useRestaurantBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['restaurant-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as Restaurant | null;
    },
    enabled: !!slug,
  });
}
