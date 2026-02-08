import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import Landing from './Landing';

const InitialRedirect = () => {
  const { data: hasReseller, isLoading } = useQuery({
    queryKey: ['has-reseller-check'],
    queryFn: async () => {
      const { count } = await supabase
        .from('resellers')
        .select('*', { count: 'exact', head: true });
      return (count || 0) > 0;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não há reseller, redireciona para setup
  if (!hasReseller) {
    return <Navigate to="/setup" replace />;
  }

  // Se há reseller, mostra a landing page
  return <Landing />;
};

export default InitialRedirect;
