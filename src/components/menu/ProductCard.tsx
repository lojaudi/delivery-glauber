import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const formattedPrice = Number(product.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <button
      onClick={() => product.is_available && onSelect(product)}
      disabled={!product.is_available}
      className={cn(
        "group flex w-full gap-3 rounded-2xl bg-card p-3 text-left shadow-card transition-all duration-200",
        product.is_available 
          ? "hover:shadow-card-hover active:scale-[0.98]" 
          : "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-foreground leading-tight">{product.name}</h3>
            {!product.is_available && (
              <Badge variant="closed" className="text-[10px]">Esgotado</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-bold text-foreground">{formattedPrice}</span>
          {product.is_available && (
            <Button
              size="icon-sm"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(product);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {product.image_url && (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          {product.is_available && (
            <div className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card md:hidden">
              <Plus className="h-4 w-4" />
            </div>
          )}
        </div>
      )}
    </button>
  );
}
