import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessHour, isStoreCurrentlyOpen } from './useBusinessHours';

interface StoreOpenStatusResult {
  isOpen: boolean;
  manualOverride: boolean;
  withinBusinessHours: boolean;
  isLoading: boolean;
}

/**
 * Hook to determine if a store is currently open.
 * A store is considered open ONLY if:
 * 1. The manual toggle (is_open) is set to true in store_config
 * 2. AND the current time is within the configured business hours
 */
export function useStoreOpenStatus(restaurantId: string | null | undefined): StoreOpenStatusResult {
  // Recompute open/closed status periodically so UI stays in sync with time.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Get store config for manual toggle
  const { data: storeConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['store-open-status-config', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const { data, error } = await supabase
        .from('store_config')
        .select('is_open')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Get business hours
  const { data: businessHours, isLoading: isLoadingHours } = useQuery({
    queryKey: ['store-open-status-hours', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('day_of_week');

      if (error) throw error;
      return data as BusinessHour[];
    },
    enabled: !!restaurantId,
  });

  const isLoading = isLoadingConfig || isLoadingHours;
  const manualOverride = storeConfig?.is_open ?? false;
  const withinBusinessHours = businessHours && businessHours.length > 0
    ? isStoreCurrentlyOpen(businessHours, new Date(nowTick))
    : true; // If no business hours configured, consider within hours

  // Store is open only if manual toggle is ON and within business hours
  const isOpen = manualOverride && withinBusinessHours;

  return {
    isOpen,
    manualOverride,
    withinBusinessHours,
    isLoading,
  };
}


/**
 * Hook to get open status by slug (for public pages)
 */
export function useStoreOpenStatusBySlug(slug: string | undefined): StoreOpenStatusResult {
  // First get restaurant ID from slug
  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ['restaurant-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const statusResult = useStoreOpenStatus(restaurant?.id);

  return {
    ...statusResult,
    isLoading: isLoadingRestaurant || statusResult.isLoading,
  };
}
