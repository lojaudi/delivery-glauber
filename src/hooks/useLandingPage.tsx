import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Reseller, SubscriptionPlan } from '@/types/reseller';

export interface LandingPageData {
  reseller: Reseller | null;
  plans: SubscriptionPlan[];
}

export function useLandingPageData(resellerSlug?: string) {
  return useQuery({
    queryKey: ['landing-page', resellerSlug || 'default'],
    queryFn: async (): Promise<LandingPageData> => {
      let reseller: Reseller | null = null;

      const safeFields = 'id, name, company_name, slug, primary_color, secondary_color, landing_page_enabled, landing_page_title, landing_page_subtitle, landing_page_logo, landing_page_email, landing_page_whatsapp, phone, email, is_active, created_at, updated_at';

      if (resellerSlug) {
        const { data, error } = await supabase
          .from('resellers')
          .select(safeFields)
          .eq('slug', resellerSlug)
          .eq('is_active', true)
          .single();

        if (!error && data) {
          reseller = data as Reseller;
        }
      } else {
        const { data, error } = await supabase
          .from('resellers')
          .select(safeFields)
          .eq('is_active', true)
          .eq('landing_page_enabled', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (!error && data) {
          reseller = data as Reseller;
        }
      }

      if (!reseller) {
        return { reseller: null, plans: [] };
      }

      // Check if landing page is enabled
      if (reseller.landing_page_enabled === false) {
        return { reseller: null, plans: [] };
      }

      // Fetch active plans for this reseller
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('reseller_id', reseller.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (plansError) {
        console.error('Error fetching plans:', plansError);
        return { reseller, plans: [] };
      }

      return {
        reseller,
        plans: (plans || []) as SubscriptionPlan[],
      };
    },
  });
}
