import { ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useNavigate, useParams } from 'react-router-dom';

export function CartButton() {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const basePath = slug ? `/r/${slug}` : '';

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 bg-gradient-to-t from-background via-background to-transparent pt-8">
      <Button
        onClick={() => navigate(`${basePath}/cart`)}
        variant="cart"
        size="xl"
        className="w-full animate-bounce-in shadow-xl rounded-full"
      >
        <div className="flex w-full items-center gap-4">
          {/* Cart icon with badge */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-bold text-primary">
              {totalItems}
            </span>
          </div>
          
          {/* Make order text with arrow */}
          <div className="flex flex-1 items-center justify-center gap-2">
            <ArrowRight className="h-5 w-5" />
            <span className="font-semibold">Fazer pedido</span>
          </div>
        </div>
      </Button>
    </div>
  );
}
