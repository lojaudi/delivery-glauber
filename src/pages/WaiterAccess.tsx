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

interface WaiterPublic {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  restaurant_id: string;
  has_pin: boolean;
}

export default function WaiterAccess() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { data: store } = useStoreConfig();
  const [waiters, setWaiters] = useState<WaiterPublic[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWaiter, setSelectedWaiter] = useState<WaiterPublic | null>(null);
  const [showPinPad, setShowPinPad] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinError, setPinError] = useState('');

  useTheme();

  useEffect(() => {
    loadWaiters();
  }, [slug]);

  const loadWaiters = async () => {
    setIsLoading(true);
    
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

    setRestaurantId(restaurant.id);

    // Use waiters_public view (no PIN exposed)
    const { data, error } = await supabase
      .from('waiters')
      .select('id, name, phone, is_active, restaurant_id')
      .eq('is_active', true)
      .eq('restaurant_id', restaurant.id)
      .order('name');

    if (!error && data) {
      // We don't know if they have PIN from the public view, so assume they might
      // The server will handle PIN verification
      setWaiters(data.map(w => ({ ...w, has_pin: true })));
    }
    setIsLoading(false);
  };

  const handleSelectWaiter = (waiter: WaiterPublic) => {
    setSelectedWaiter(waiter);
    setPinError('');
    // Always show PIN pad - server will handle no-PIN case
    setShowPinPad(true);
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedWaiter || !restaurantId) return;
    
    setIsVerifying(true);
    setPinError('');
    
    try {
      // Server-side PIN verification
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-waiter-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waiterId: selectedWaiter.id,
          pin,
          restaurantId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        completeLogin(result.waiterId, result.waiterName);
      } else {
        setPinError(result.error || 'PIN incorreto. Tente novamente.');
        setIsVerifying(false);
      }
    } catch (error) {
      setPinError('Erro ao verificar PIN. Tente novamente.');
      setIsVerifying(false);
    }
  };

  const handleDirectAccess = async (waiter: WaiterPublic) => {
    if (!restaurantId) return;
    
    setIsVerifying(true);
    
    try {
      // Try server-side access without PIN
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-waiter-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waiterId: waiter.id,
          restaurantId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        completeLogin(result.waiterId, result.waiterName);
      } else if (response.status === 401) {
        // PIN required - show PIN pad
        setSelectedWaiter(waiter);
        setShowPinPad(true);
        setIsVerifying(false);
      } else {
        setPinError(result.error || 'Erro ao acessar');
        setIsVerifying(false);
      }
    } catch (error) {
      setPinError('Erro de conexão');
      setIsVerifying(false);
    }
  };

  const completeLogin = (waiterId: string, waiterName: string) => {
    localStorage.setItem('waiter_id', waiterId);
    localStorage.setItem('waiter_name', waiterName);
    
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
                    onClick={() => handleDirectAccess(waiter)}
                    disabled={isVerifying}
                  >
                    {isVerifying && selectedWaiter?.id === waiter.id ? (
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
