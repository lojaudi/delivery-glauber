import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Loader2, RefreshCw, MapPin, ClipboardList } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { OrderStatusTracker } from '@/components/order/OrderStatusTracker';
import { useStoreConfig } from '@/hooks/useStore';
import { useOrderWithItems } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const OrderStatus = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const basePath = slug ? `/r/${slug}` : '';
  const { data: store } = useStoreConfig();
  const { order, items, isLoading, error } = useOrderWithItems(Number(id));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previousStatus = useRef<string | null>(null);

  // Subscribe to realtime updates for this specific order
  useEffect(() => {
    if (!id) return;

    console.log('[OrderStatus] Setting up realtime subscription for order:', id);

    const channel = supabase
      .channel(`order-status-${id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('[OrderStatus] Received realtime update:', payload);
          queryClient.invalidateQueries({ queryKey: ['order', Number(id)] });
          
          const newStatus = (payload.new as any)?.status;
          previousStatus.current = newStatus;
        }
      )
      .subscribe((status) => {
        console.log('[OrderStatus] Subscription status:', status);
      });

    return () => {
      console.log('[OrderStatus] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Track initial status
  useEffect(() => {
    if (order?.status && !previousStatus.current) {
      previousStatus.current = order.status;
    }
  }, [order?.status]);

  const formatCurrency = (value: number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const whatsappLink = store?.phone_whatsapp 
    ? `https://wa.me/55${store.phone_whatsapp}?text=${encodeURIComponent(
        `Olá! Gostaria de saber sobre meu pedido #${id}`
      )}`
    : '#';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['order', Number(id)] });
    await queryClient.invalidateQueries({ queryKey: ['order-items', Number(id)] });
    setIsRefreshing(false);
    toast.success('Pedido atualizado!');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-foreground">Pedido não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Verifique o número do pedido</p>
        <Button onClick={() => navigate(basePath)} className="mt-6">
          Voltar ao Cardápio
        </Button>
      </div>
    );
  }

  const getStatusMessage = () => {
    switch (order.status) {
      case 'pending':
        return 'O restaurante está analisando seu pedido';
      case 'preparing':
        return 'Seu pedido está sendo preparado';
      case 'delivery':
        return 'Seu pedido está a caminho';
      case 'completed':
        return 'Pedido entregue com sucesso!';
      default:
        return 'Acompanhe seu pedido';
    }
  };

  return (
    <>
      <Helmet>
        <title>Pedido #{id} - {store?.name || 'Delivery'}</title>
      </Helmet>

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center gap-3 bg-primary px-4 py-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(basePath)}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-primary-foreground">Pedido #{id}</h1>
            <p className="text-xs text-primary-foreground/80">
              {store?.name || 'Restaurante'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </header>

        <div className="p-4 space-y-4">
          {/* Status Card */}
          <section className="rounded-2xl bg-card p-6 shadow-card">
            {/* Clipboard illustration */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-24 relative">
                <div className="absolute inset-0 bg-amber-100 rounded-lg border-2 border-amber-300" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-8 h-3 bg-amber-400 rounded-t-md" />
                <div className="absolute top-4 left-3 right-3 space-y-1.5">
                  <div className="h-1.5 bg-amber-300/60 rounded" />
                  <div className="h-1.5 bg-amber-300/60 rounded w-3/4" />
                  <div className="h-1.5 bg-amber-300/60 rounded w-1/2" />
                </div>
                <div className="absolute bottom-3 right-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-muted-foreground mb-6">
              {getStatusMessage()}
            </p>

            {/* Status Tracker */}
            <OrderStatusTracker status={order.status} />
          </section>

          {/* Order Details */}
          <section className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Detalhes do Pedido</h3>
            </div>
            <div className="space-y-3">
              {items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {item.quantity}
                    </span>
                    <span className="text-sm text-foreground">{item.product_name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(Number(item.unit_price) * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Delivery Address */}
          <section className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-foreground">Endereço de Entrega</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              {order.address_street}, {order.address_number} - {order.address_neighborhood}
            </p>
          </section>
        </div>

        {/* Fixed Bottom Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button
            variant="whatsapp"
            size="lg"
            className="w-full"
            asChild
          >
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              Falar com o Restaurante
            </a>
          </Button>
        </div>
      </div>

    </>
  );
};

export default OrderStatus;
