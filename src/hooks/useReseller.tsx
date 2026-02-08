import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reseller, Restaurant, RestaurantAdmin, SubscriptionPayment, SubscriptionStatus, PaymentStatus } from '@/types/reseller';
import { useAuth } from './useAuth';

// Hook para verificar se o usuário é revendedor
export function useIsReseller() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['is-reseller', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('resellers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id,
  });
}

// Hook para obter dados do revendedor logado
export function useCurrentReseller() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['current-reseller', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Reseller | null;
    },
    enabled: !!user?.id,
  });
}

// Hook para listar restaurantes do revendedor
export function useResellerRestaurants() {
  const { data: reseller } = useCurrentReseller();
  
  return useQuery({
    queryKey: ['reseller-restaurants', reseller?.id],
    queryFn: async () => {
      if (!reseller?.id) return [];
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('reseller_id', reseller.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Restaurant[];
    },
    enabled: !!reseller?.id,
  });
}

// Hook para obter detalhes de um restaurante específico
export function useRestaurantDetails(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['restaurant-details', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle();

      if (error) throw error;
      return data as Restaurant | null;
    },
    enabled: !!restaurantId,
  });
}

// Hook para listar admins de um restaurante
export function useRestaurantAdmins(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['restaurant-admins', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('restaurant_admins')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RestaurantAdmin[];
    },
    enabled: !!restaurantId,
  });
}

// Hook para listar pagamentos de um restaurante
export function useRestaurantPayments(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['restaurant-payments', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as SubscriptionPayment[];
    },
    enabled: !!restaurantId,
  });
}

// Hook para listar todos os pagamentos do revendedor
export function useResellerPayments() {
  const { data: reseller } = useCurrentReseller();
  const { data: restaurants } = useResellerRestaurants();
  
  return useQuery({
    queryKey: ['reseller-payments', reseller?.id, restaurants?.map(r => r.id)],
    queryFn: async () => {
      if (!restaurants?.length) return [];
      
      const restaurantIds = restaurants.map(r => r.id);
      
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*, restaurants(*)')
        .in('restaurant_id', restaurantIds)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as (SubscriptionPayment & { restaurants: Restaurant })[];
    },
    enabled: !!restaurants?.length,
  });
}

// Mutations

export function useCreateRestaurant() {
  const queryClient = useQueryClient();
  const { data: reseller } = useCurrentReseller();
  
  return useMutation({
    mutationFn: async (restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at' | 'reseller_id'>) => {
      if (!reseller?.id) throw new Error('Reseller not found');
      
      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          ...restaurant,
          reseller_id: reseller.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Automatically create store_config for the new restaurant
      const { error: storeConfigError } = await supabase
        .from('store_config')
        .insert({
          restaurant_id: data.id,
          name: restaurant.name,
          primary_color: (reseller as any)?.primary_color || null,
          secondary_color: (reseller as any)?.secondary_color || null,
        });

      if (storeConfigError) {
        console.error('Error creating store_config:', storeConfigError);
        // Don't throw - restaurant was created successfully
      }
      
      return data as Restaurant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-restaurants'] });
    },
  });
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Restaurant> & { id: string }) => {
      const { data, error } = await supabase
        .from('restaurants')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Restaurant;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reseller-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-details', data.id] });
    },
  });
}

export function useDeleteRestaurant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-restaurants'] });
    },
  });
}

export function useCreateRestaurantAdmin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (admin: Omit<RestaurantAdmin, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('restaurant_admins')
        .insert(admin)
        .select()
        .single();

      if (error) throw error;
      return data as RestaurantAdmin;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-admins', data.restaurant_id] });
    },
  });
}

export function useDeleteRestaurantAdmin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, restaurantId }: { id: string; restaurantId: string }) => {
      const { error } = await supabase
        .from('restaurant_admins')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return restaurantId;
    },
    onSuccess: (restaurantId) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-admins', restaurantId] });
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payment: Omit<SubscriptionPayment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('subscription_payments')
        .insert(payment)
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionPayment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-payments', data.restaurant_id] });
      queryClient.invalidateQueries({ queryKey: ['reseller-payments'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<SubscriptionPayment> & { id: string }) => {
      const { data, error } = await supabase
        .from('subscription_payments')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionPayment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-payments', data.restaurant_id] });
      queryClient.invalidateQueries({ queryKey: ['reseller-payments'] });
    },
  });
}

// Estatísticas do revendedor
export function useResellerStats() {
  const { data: restaurants } = useResellerRestaurants();
  const { data: payments } = useResellerPayments();
  
  const totalRestaurants = restaurants?.length || 0;
  const activeRestaurants = restaurants?.filter(r => r.subscription_status === 'active').length || 0;
  const trialRestaurants = restaurants?.filter(r => r.subscription_status === 'trial').length || 0;
  const suspendedRestaurants = restaurants?.filter(r => r.subscription_status === 'suspended').length || 0;
  
  const monthlyRevenue = restaurants
    ?.filter(r => r.subscription_status === 'active')
    .reduce((sum, r) => sum + r.monthly_fee, 0) || 0;
  
  const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;
  const overduePayments = payments?.filter(p => p.status === 'overdue').length || 0;
  
  // Métricas do Mercado Pago
  const mpActiveSubscriptions = restaurants?.filter(r => r.mp_subscription_status === 'authorized').length || 0;
  const mpPendingSubscriptions = restaurants?.filter(r => r.mp_subscription_status === 'pending').length || 0;
  const mpPausedSubscriptions = restaurants?.filter(r => r.mp_subscription_status === 'paused').length || 0;
  
  // Pagamentos recebidos este mês via MP
  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const mpPaidThisMonth = payments
    ?.filter(p => 
      p.status === 'paid' && 
      p.payment_date && 
      new Date(p.payment_date) >= monthStart &&
      p.mp_payment_id
    )
    .reduce((sum, p) => sum + p.amount, 0) || 0;
  
  return {
    totalRestaurants,
    activeRestaurants,
    trialRestaurants,
    suspendedRestaurants,
    monthlyRevenue,
    pendingPayments,
    overduePayments,
    // Métricas MP
    mpActiveSubscriptions,
    mpPendingSubscriptions,
    mpPausedSubscriptions,
    mpPaidThisMonth,
  };
}
