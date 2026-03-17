import { useEffect } from 'react';
import { useStoreConfig } from '@/hooks/useStore';
import { useParams } from 'react-router-dom';

/**
 * Dynamically generates and injects a PWA manifest based on the current restaurant's config.
 * This allows each restaurant to have its own installable PWA experience.
 */
export function DynamicManifest() {
  const { slug } = useParams<{ slug: string }>();
  const { data: store } = useStoreConfig();

  useEffect(() => {
    if (!slug || !store) return;

    const manifest = {
      name: store.pwa_name || store.name || 'Cardápio Digital',
      short_name: store.pwa_short_name || store.name || 'Cardápio',
      description: `Faça seu pedido online - ${store.name}`,
      start_url: `/r/${slug}`,
      scope: `/r/${slug}`,
      display: 'standalone' as const,
      background_color: '#ffffff',
      theme_color: store.primary_color || '#f59e0b',
      orientation: 'portrait-primary' as const,
      icons: [
        {
          src: store.logo_url || '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: store.logo_url || '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['food', 'shopping'],
      lang: 'pt-BR',
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);

    // Remove existing manifest link
    const existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      existingLink.remove();
    }

    // Add new dynamic manifest
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);

    // Update theme-color meta tag
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', store.primary_color || '#f59e0b');
    }

    // Update apple-mobile-web-app-title
    let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', store.pwa_short_name || store.name || 'Cardápio');
    }

    // Set apple-touch-icon if store has logo
    if (store.logo_url) {
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = store.logo_url;
    }

    return () => {
      URL.revokeObjectURL(manifestUrl);
    };
  }, [slug, store]);

  return null;
}
