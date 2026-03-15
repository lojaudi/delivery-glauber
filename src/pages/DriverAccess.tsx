import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Truck, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PinPad } from '@/components/auth/PinPad';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';

interface DriverPublic {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  restaurant_id: string;
}

export default function DriverAccess() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { data: store } = useStoreConfig();
  const [drivers, setDrivers] = useState<DriverPublic[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<DriverPublic | null>(null);
  const [showPinPad, setShowPinPad] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinError, setPinError] = useState('');

  useTheme();

  useEffect(() => {
    loadDrivers();
  }, [slug]);

  const loadDrivers = async () => {
    setIsLoading(true);
    if (!slug) { setIsLoading(false); return; }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!restaurant) { setIsLoading(false); return; }
    setRestaurantId(restaurant.id);

    const { data, error } = await supabase
      .from('drivers')
      .select('id, name, phone, is_active, restaurant_id')
      .eq('is_active', true)
      .eq('restaurant_id', restaurant.id)
      .order('name');

    if (!error && data) {
      setDrivers(data);
    }
    setIsLoading(false);
  };

  const handleDirectAccess = async (driver: DriverPublic) => {
    if (!restaurantId) return;
    setIsVerifying(true);
    setSelectedDriver(driver);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-driver-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver.id, restaurantId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        completeLogin(result.driverId, result.driverName);
      } else if (response.status === 401) {
        setShowPinPad(true);
        setIsVerifying(false);
      } else {
        setPinError(result.error || 'Erro ao acessar');
        setIsVerifying(false);
      }
    } catch {
      setPinError('Erro de conexão');
      setIsVerifying(false);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedDriver || !restaurantId) return;
    setIsVerifying(true);
    setPinError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-driver-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriver.id, pin, restaurantId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        completeLogin(result.driverId, result.driverName);
      } else {
        setPinError(result.error || 'PIN incorreto. Tente novamente.');
        setIsVerifying(false);
      }
    } catch {
      setPinError('Erro ao verificar PIN. Tente novamente.');
      setIsVerifying(false);
    }
  };

  const completeLogin = (driverId: string, driverName: string) => {
    localStorage.setItem('driver_id', driverId);
    localStorage.setItem('driver_name', driverName);
    localStorage.setItem('driver_restaurant_id', restaurantId!);
    setTimeout(() => navigate(`/r/${slug}/driver/dashboard`), 300);
  };

  const handleBackToList = () => {
    setSelectedDriver(null);
    setShowPinPad(false);
    setPinError('');
    setIsVerifying(false);
  };

  if (showPinPad && selectedDriver) {
    return (
      <>
        <Helmet><title>{`Acesso Entregador - ${store?.name || 'Restaurante'}`}</title></Helmet>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />Voltar
              </Button>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Olá, {selectedDriver.name}!</CardTitle>
              <CardDescription>Digite seu PIN para acessar o sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <PinPad onSubmit={handlePinSubmit} isLoading={isVerifying} error={pinError} />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>{`Acesso Entregador - ${store?.name || 'Restaurante'}`}</title></Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {store?.logo_url ? (
                <img src={store.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded-full" />
              ) : (
                <Truck className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">Olá, Entregador!</CardTitle>
            <CardDescription>Selecione seu nome para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhum entregador cadastrado ainda.</p>
                <Button variant="outline" onClick={() => navigate(`/r/${slug}`)}>Voltar ao cardápio</Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {drivers.map((driver) => (
                  <Button
                    key={driver.id}
                    variant="outline"
                    className="w-full h-14 text-lg justify-start px-4"
                    onClick={() => handleDirectAccess(driver)}
                    disabled={isVerifying}
                  >
                    {isVerifying && selectedDriver?.id === driver.id ? (
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    ) : (
                      <Truck className="h-5 w-5 mr-3" />
                    )}
                    {driver.name}
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
