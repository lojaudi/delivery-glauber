import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentReseller } from '@/hooks/useReseller';

/**
 * Dynamically sets the page title based on the reseller's platform_name.
 * Falls back to the default title if no reseller or platform_name is set.
 */
export function DynamicPageTitle() {
  const { isReseller, isAdmin } = useAuth();
  const { data: reseller } = useCurrentReseller();

  useEffect(() => {
    if (reseller && (reseller as any).platform_name) {
      document.title = (reseller as any).platform_name;

      // Update OG title meta tag
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', (reseller as any).platform_name);

      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute('content', (reseller as any).platform_name);
    }
  }, [reseller]);

  return null;
}
