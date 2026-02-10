import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { UserCheck, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PinPad } from '@/components/auth/PinPad';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';

interface Waiter {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  pin: string | null;
}

export default function WaiterAccess() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { data: store } = useStoreConfig();
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null);
  const [showPinPad, setShowPinPad] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinError, setPinError] = useState('');

  useTheme();

  useEffect(() => {
    loadWaiters();
  }, [slug]);

  const loadWaiters = async () => {
    setIsLoading(true);
    
    // First get restaurant_id from slug
    if (!slug) {
      setIsLoading(false);
      return;
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!restaurant) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('waiters')
      .select('id, name, phone, is_active, pin')
      .eq('is_active', true)
      .eq('restaurant_id', restaurant.id)
      .order('name');

    if (!error && data) {
      setWaiters(data);
    }
    setIsLoading(false);
  };

  const handleSelectWaiter = (waiter: Waiter) => {
    setSelectedWaiter(waiter);
    setPinError('');
    
    // If waiter has PIN, show PIN pad
    if (waiter.pin) {
      setShowPinPad(true);
    } else {
      // No PIN configured, allow direct access
      completeLogin(waiter.id, waiter.name);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedWaiter) return;
    
    setIsVerifying(true);
    setPinError('');
    
    // Verify PIN
    if (selectedWaiter.pin === pin) {
      completeLogin(selectedWaiter.id, selectedWaiter.name);
    } else {
      setPinError('PIN incorreto. Tente novamente.');
      setIsVerifying(false);
    }
  };

  const completeLogin = (waiterId: string, waiterName: string) => {
    // Store waiter info in localStorage
    localStorage.setItem('waiter_id', waiterId);
    localStorage.setItem('waiter_name', waiterName);
    
    // Navigate to dashboard with slug
    setTimeout(() => {
      navigate(`/r/${slug}/waiter/dashboard`);
    }, 300);
  };

  const handleBackToList = () => {
    setSelectedWaiter(null);
    setShowPinPad(false);
    setPinError('');
    setIsVerifying(false);
  };

  // Show PIN pad view
  if (showPinPad && selectedWaiter) {
    return (
      <>
        <Helmet>
          <title>{`Acesso Garçom - ${store?.name || 'Restaurante'}`}</title>
        </Helmet>

        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-4"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Olá, {selectedWaiter.name}!</CardTitle>
              <CardDescription>
                Digite seu PIN para acessar o sistema
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <PinPad 
                onSubmit={handlePinSubmit}
                isLoading={isVerifying}
                error={pinError}
              />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Acesso Garçom - ${store?.name || 'Restaurante'}`}</title>
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {store?.logo_url ? (
                <img 
                  src={store.logo_url} 
                  alt="Logo" 
                  className="h-12 w-12 object-contain rounded-full"
                />
              ) : (
                <UserCheck className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">Olá, Garçom!</CardTitle>
            <CardDescription>
              Selecione seu nome para acessar o sistema
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : waiters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhum garçom cadastrado ainda.
                </p>
                <Button variant="outline" onClick={() => navigate(`/r/${slug}`)}>
                  Voltar ao cardápio
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {waiters.map((waiter) => (
                  <Button
                    key={waiter.id}
                    variant="outline"
                    className="w-full h-14 text-lg justify-start px-4"
                    onClick={() => handleSelectWaiter(waiter)}
                    disabled={selectedWaiter !== null && !showPinPad}
                  >
                    {selectedWaiter?.id === waiter.id && !showPinPad ? (
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    ) : (
                      <UserCheck className="h-5 w-5 mr-3" />
                    )}
                    {waiter.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
