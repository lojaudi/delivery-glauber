import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Detects if the current hostname matches a restaurant's custom domain.
 * If it does, returns the restaurant's slug so the app can render the correct catalog.
 */
export function useCustomDomain() {
  const hostname = window.location.hostname;
  
  // Skip detection for known platform domains
  const isPlatformDomain = 
    hostname === 'localhost' ||
    hostname.endsWith('.lovable.app') ||
    hostname.endsWith('.lovable.dev') ||
    hostname === 'meufood.online' ||
    hostname === 'www.meufood.online';

  return useQuery({
    queryKey: ['custom-domain', hostname],
    queryFn: async () => {
      // Search for a store_config where custom_domain matches the current hostname
      // The custom_domain may be stored with or without protocol
      const { data, error } = await supabase
        .from('store_config')
        .select('restaurant_id, custom_domain')
        .or(`custom_domain.eq.${hostname},custom_domain.eq.https://${hostname},custom_domain.eq.http://${hostname},custom_domain.eq.https://www.${hostname},custom_domain.eq.http://www.${hostname}`)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        // Also try without www prefix
        const hostnameWithoutWww = hostname.replace(/^www\./, '');
        if (hostnameWithoutWww !== hostname) {
          const { data: data2 } = await supabase
            .from('store_config')
            .select('restaurant_id, custom_domain')
            .or(`custom_domain.eq.${hostnameWithoutWww},custom_domain.eq.https://${hostnameWithoutWww},custom_domain.eq.http://${hostnameWithoutWww}`)
            .limit(1)
            .maybeSingle();
          
          if (data2?.restaurant_id) {
            const { data: restaurant } = await supabase
              .from('restaurants')
              .select('slug')
              .eq('id', data2.restaurant_id)
              .single();
            return restaurant?.slug || null;
          }
        }
        return null;
      }

      // Found a matching custom domain, get the restaurant slug
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('slug')
        .eq('id', data.restaurant_id)
        .single();

      return restaurant?.slug || null;
    },
    enabled: !isPlatformDomain,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: false,
  });
}

/**
 * Extracts hostname from a custom_domain value (removes protocol and trailing slash)
 */
export function extractHostname(customDomain: string): string {
  return customDomain
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}
