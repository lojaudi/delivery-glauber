import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/types';
import { useCart } from '@/hooks/useCart';

interface CartItemCardProps {
  item: CartItem;
}

export function CartItemCard({ item }: CartItemCardProps) {
  const { updateQuantity, removeItem } = useCart();
  
  const formattedPrice = (item.product.price * item.quantity).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="flex gap-3 rounded-xl bg-card p-3 shadow-card">
      <img
        src={item.product.image_url}
        alt={item.product.name}
        className="h-20 w-20 shrink-0 rounded-lg object-cover"
      />
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{item.product.name}</h3>
          {item.observation && (
            <p className="text-xs text-muted-foreground mt-0.5">
              📝 {item.observation}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground">{formattedPrice}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                if (item.quantity === 1) {
                  removeItem(item.product.id);
                } else {
                  updateQuantity(item.product.id, item.quantity - 1);
                }
              }}
              className="h-8 w-8 rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive"
            >
              {item.quantity === 1 ? (
                <Trash2 className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>
            <span className="w-6 text-center font-semibold">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
              className="h-8 w-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
