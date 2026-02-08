import { Plus, ImageOff } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface MenuProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function MenuProductCard({ product, onSelect }: MenuProductCardProps) {
  const formattedPrice = Number(product.price).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div
      className={cn(
        "group relative flex gap-4 rounded-2xl bg-card p-4 shadow-sm border border-border/50 transition-all duration-300",
        product.is_available 
          ? "cursor-pointer hover:shadow-lg hover:border-primary/30 hover:scale-[1.01] active:scale-[0.99]" 
          : "opacity-60"
      )}
      onClick={() => product.is_available && onSelect(product)}
    >
      {/* Content */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <h4 className="font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h4>
          {product.description && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-lg font-bold text-primary">{formattedPrice}</span>
        </div>
      </div>

      {/* Image */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {product.image_url ? (
          <>
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <ImageOff className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Unavailable overlay */}
        {!product.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase text-white tracking-wider">Esgotado</span>
          </div>
        )}

        {/* Add Button - Positioned over image */}
        {product.is_available && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group-hover:animate-bounce-in"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}