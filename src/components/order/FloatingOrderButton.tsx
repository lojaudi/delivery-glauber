import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

const ORDER_STORAGE_KEY = 'last_order_id';

export function saveLastOrderId(orderId: number) {
  localStorage.setItem(ORDER_STORAGE_KEY, String(orderId));
}

export function getLastOrderId(): number | null {
  const id = localStorage.getItem(ORDER_STORAGE_KEY);
  return id ? Number(id) : null;
}

export function clearLastOrderId() {
  localStorage.removeItem(ORDER_STORAGE_KEY);
}

interface FloatingOrderButtonProps {
  orderId: number;
  onDismiss?: () => void;
}

export function FloatingOrderButton({ orderId, onDismiss }: FloatingOrderButtonProps) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const basePath = slug ? `/r/${slug}` : '';
  const [isVisible, setIsVisible] = useState(true);

  // Subscribe to order status changes and hide when completed
  useEffect(() => {
    // Check initial status
    const checkOrderStatus = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      
      if (data?.status === 'completed' || data?.status === 'cancelled') {
        handleDismiss();
      }
    };

    checkOrderStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`floating-order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus === 'completed' || newStatus === 'cancelled') {
            handleDismiss();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const handleDismiss = () => {
    setIsVisible(false);
    clearLastOrderId();
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-1">
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-md"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      
      {/* Order button */}
      <Button
        onClick={() => navigate(`${basePath}/order/${orderId}`)}
        className="h-14 w-14 rounded-full shadow-lg animate-bounce-subtle"
        size="icon"
      >
        <ClipboardList className="h-6 w-6" />
      </Button>
    </div>
  );
}
