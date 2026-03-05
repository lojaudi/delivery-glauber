import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';

export interface PlanLimits {
  max_products: number | null;
  max_categories: number | null;
  max_orders_per_month: number | null;
}

export interface PlanUsage {
  products: number;
  categories: number;
  ordersThisMonth: number;
}

export function usePlanLimits() {
  const { restaurantId } = useAdminRestaurant();

  const { data: limits, isLoading: loadingLimits } = useQuery({
    queryKey: ['plan-limits', restaurantId],
    queryFn: async (): Promise<PlanLimits | null> => {
      if (!restaurantId) return null;

      // Get restaurant's plan_id
      const { data: restaurant, error: rError } = await supabase
        .from('restaurants')
        .select('plan_id')
        .eq('id', restaurantId)
        .maybeSingle();

      if (rError || !restaurant?.plan_id) return null;

      const { data: plan, error: pError } = await supabase
        .from('subscription_plans')
        .select('max_products, max_categories, max_orders_per_month')
        .eq('id', restaurant.plan_id)
        .maybeSingle();

      if (pError || !plan) return null;

      return {
        max_products: (plan as any).max_products ?? null,
        max_categories: (plan as any).max_categories ?? null,
        max_orders_per_month: (plan as any).max_orders_per_month ?? null,
      };
    },
    enabled: !!restaurantId,
  });

  const { data: usage, isLoading: loadingUsage } = useQuery({
    queryKey: ['plan-usage', restaurantId],
    queryFn: async (): Promise<PlanUsage> => {
      if (!restaurantId) return { products: 0, categories: 0, ordersThisMonth: 0 };

      const [productsRes, categoriesRes, ordersRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase.from('categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        (() => {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          return supabase.from('orders').select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .gte('created_at', monthStart);
        })(),
      ]);

      return {
        products: productsRes.count || 0,
        categories: categoriesRes.count || 0,
        ordersThisMonth: ordersRes.count || 0,
      };
    },
    enabled: !!restaurantId,
  });

  const canAddProduct = () => {
    if (!limits?.max_products) return true;
    return (usage?.products || 0) < limits.max_products;
  };

  const canAddCategory = () => {
    if (!limits?.max_categories) return true;
    return (usage?.categories || 0) < limits.max_categories;
  };

  const canReceiveOrder = () => {
    if (!limits?.max_orders_per_month) return true;
    return (usage?.ordersThisMonth || 0) < limits.max_orders_per_month;
  };

  return {
    limits,
    usage,
    isLoading: loadingLimits || loadingUsage,
    canAddProduct,
    canAddCategory,
    canReceiveOrder,
  };
}
