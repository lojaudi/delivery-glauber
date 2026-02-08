import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ChefHat, 
  Clock, 
  CheckCircle, 
  RefreshCw, 
  Volume2, 
  VolumeX,
  Loader2,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KitchenItemCard } from '@/components/kitchen/KitchenItemCard';
import { useKitchenItems } from '@/hooks/useKitchenItems';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';

export default function Kitchen() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { data: store, isLoading: isLoadingStore } = useStoreConfig();
  const { items, isLoading } = useKitchenItems();
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready'>('pending');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastItemCount, setLastItemCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useTheme();

  // Check if PIN authentication is required
  useEffect(() => {
    checkAuthentication();
  }, [store]);

  const checkAuthentication = async () => {
    if (!store?.id) return;
    
    setIsCheckingAuth(true);
    
    // Check if PIN is required
    const { data, error } = await supabase
      .from('store_config')
      .select('kitchen_pin_enabled')
      .eq('id', store.id)
      .single();
    
    if (error) {
      setIsAuthenticated(true); // Allow access on error
      setIsCheckingAuth(false);
      return;
    }
    
    if (!data?.kitchen_pin_enabled) {
      // No PIN required
      setIsAuthenticated(true);
      setIsCheckingAuth(false);
      return;
    }
    
    // PIN required - check if user has valid session
    const savedAuth = localStorage.getItem(`kitchen_auth_${store.id}`);
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      // Session valid for 24 hours
      if (Date.now() - authData.timestamp < 24 * 60 * 60 * 1000) {
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
        return;
      }
    }
    
    // Not authenticated - redirect to login
    navigate(`/r/${slug}/kitchen/login`);
  };

  const handleLogout = () => {
    if (store?.id) {
      localStorage.removeItem(`kitchen_auth_${store.id}`);
    }
    navigate(`/r/${slug}/kitchen/login`);
  };

  // Create audio context for notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
  }, []);

  // Play sound when new items arrive
  useEffect(() => {
    const pendingCount = items.filter(i => i.status === 'pending').length;
    if (pendingCount > lastItemCount && soundEnabled && lastItemCount !== 0) {
      // Play notification sound
      try {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 200);
      } catch (e) {
        console.log('Audio not supported');
      }
    }
    setLastItemCount(pendingCount);
  }, [items, soundEnabled, lastItemCount]);

  // Prevent screen from sleeping
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (e) {
        console.log('Wake lock not supported');
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  // Filter items by status
  const pendingItems = items.filter(i => i.status === 'pending');
  const preparingItems = items.filter(i => i.status === 'preparing');
  const readyItems = items.filter(i => i.status === 'ready');

  const currentItems = activeTab === 'pending' 
    ? pendingItems 
    : activeTab === 'preparing' 
      ? preparingItems 
      : readyItems;

  // Show loading while checking auth
  if (isCheckingAuth || isLoadingStore) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Show nothing if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Cozinha - {store?.name || 'Restaurante'}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Cozinha</h1>
                <p className="text-sm text-muted-foreground">{store?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/r/${slug}/admin`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50">
          <div 
            className={`rounded-xl p-4 text-center cursor-pointer transition-all ${
              activeTab === 'pending' 
                ? 'bg-amber-200 ring-2 ring-amber-500' 
                : 'bg-amber-100'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            <Clock className="h-8 w-8 text-amber-700 mx-auto mb-2" />
            <p className="text-3xl font-bold text-amber-800">{pendingItems.length}</p>
            <p className="text-sm text-amber-700 font-medium">Pendentes</p>
          </div>
          <div 
            className={`rounded-xl p-4 text-center cursor-pointer transition-all ${
              activeTab === 'preparing' 
                ? 'bg-blue-200 ring-2 ring-blue-500' 
                : 'bg-blue-100'
            }`}
            onClick={() => setActiveTab('preparing')}
          >
            <ChefHat className="h-8 w-8 text-blue-700 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-800">{preparingItems.length}</p>
            <p className="text-sm text-blue-700 font-medium">Preparando</p>
          </div>
          <div 
            className={`rounded-xl p-4 text-center cursor-pointer transition-all ${
              activeTab === 'ready' 
                ? 'bg-green-200 ring-2 ring-green-500' 
                : 'bg-green-100'
            }`}
            onClick={() => setActiveTab('ready')}
          >
            <CheckCircle className="h-8 w-8 text-green-700 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-800">{readyItems.length}</p>
            <p className="text-sm text-green-700 font-medium">Prontos</p>
          </div>
        </div>

        {/* Items Grid */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                {activeTab === 'pending' && <Clock className="h-10 w-10 text-muted-foreground" />}
                {activeTab === 'preparing' && <ChefHat className="h-10 w-10 text-muted-foreground" />}
                {activeTab === 'ready' && <CheckCircle className="h-10 w-10 text-muted-foreground" />}
              </div>
              <p className="text-xl text-muted-foreground">
                {activeTab === 'pending' && 'Nenhum item pendente'}
                {activeTab === 'preparing' && 'Nenhum item em preparo'}
                {activeTab === 'ready' && 'Nenhum item pronto'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentItems.map((item) => (
                <KitchenItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
