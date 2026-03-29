import { Navigate } from 'react-router-dom';
import { useCustomDomain } from '@/hooks/useCustomDomain';
import { Loader2 } from 'lucide-react';
import Landing from './Landing';

/**
 * When the app is accessed via a custom domain (e.g., www.pizzariadojose.com.br),
 * this component detects the restaurant and renders its catalog directly.
 * If no custom domain match is found, it falls back to the landing page.
 */
const CustomDomainRedirect = () => {
  const { data: slug, isLoading, isFetched } = useCustomDomain();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If a custom domain was detected, redirect to the restaurant's catalog
  if (slug) {
    return <Navigate to={`/${slug}`} replace />;
  }

  // No custom domain detected — show normal landing
  return <Landing />;
};

export default CustomDomainRedirect;
