import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from './useAdminRestaurant';
import { useParams } from 'react-router-dom';

export interface BusinessHour {
  id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  open_time: string;
  close_time: string;
  is_active: boolean;
  restaurant_id?: string | null;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function getDayName(dayOfWeek: number): string {
  return dayNames[dayOfWeek] || '';
}

export function useBusinessHours() {
  const { restaurantId } = useAdminRestaurant();
  const { slug } = useParams<{ slug: string }>();

  return useQuery({
    queryKey: ['business-hours', restaurantId, slug],
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
        .from('business_hours')
        .select('*')
        .eq('restaurant_id', effectiveRestaurantId)
        .order('day_of_week');

      if (error) throw error;
      return data as BusinessHour[];
    },
    enabled: !!restaurantId || !!slug,
  });
}

export function useUpdateBusinessHour() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<BusinessHour> & { id: string }) => {
      const { data, error } = await supabase
        .from('business_hours')
        .update(update)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0] as BusinessHour;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
    },
  });
}

export function useCreateBusinessHours() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAdminRestaurant();
  
  return useMutation({
    mutationFn: async () => {
      const defaultHours = Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i,
        open_time: '08:00',
        close_time: '22:00',
        is_active: true,
        restaurant_id: restaurantId,
      }));

      const { data, error } = await supabase
        .from('business_hours')
        .insert(defaultHours)
        .select();

      if (error) throw error;
      return data as BusinessHour[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
    },
  });
}

export function useDeleteBusinessHour() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_hours')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
    },
  });
}

function timeToMinutes(time: string): number {
  // Accepts "HH:MM" or "HH:MM:SS"
  const [hh, mm] = time.split(':');
  return Number(hh) * 60 + Number(mm);
}

export function isStoreCurrentlyOpen(hours: BusinessHour[], at: Date = new Date()): boolean {
  const currentDay = at.getDay();
  const currentTime = at.toTimeString().slice(0, 8); // HH:MM:SS
  const currentMinutes = timeToMinutes(currentTime);

  const isWithinSlot = (slot: BusinessHour) => {
    const openMinutes = timeToMinutes(slot.open_time);
    const closeMinutes = timeToMinutes(slot.close_time);

    // Overnight window (e.g. 18:00 -> 02:00 OR 11:30 -> 00:00)
    if (closeMinutes < openMinutes) {
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  };

  // Check any active slot for today
  const todaySlots = hours.filter((h) => h.day_of_week === currentDay && h.is_active);
  if (todaySlots.some(isWithinSlot)) return true;

  // If yesterday had overnight hours, it might still be open after midnight
  const yesterdayDay = (currentDay + 6) % 7;
  const yesterdaySlots = hours.filter((h) => h.day_of_week === yesterdayDay && h.is_active);

  // Only the "after midnight" portion matters here, so we only consider overnight slots.
  for (const slot of yesterdaySlots) {
    const openMinutes = timeToMinutes(slot.open_time);
    const closeMinutes = timeToMinutes(slot.close_time);

    if (closeMinutes < openMinutes && currentMinutes <= closeMinutes) return true;
  }

  return false;
}

