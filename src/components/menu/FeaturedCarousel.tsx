import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';

interface FeaturedCarouselProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
}

export const FeaturedCarousel = ({ products, onProductSelect }: FeaturedCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 260;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const formatCurrency = (value: number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="px-4 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Star className="h-4 w-4 text-primary fill-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Destaques</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="flex-shrink-0 w-[200px] snap-start bg-card rounded-2xl shadow-card overflow-hidden cursor-pointer group transition-transform hover:scale-[1.02]"
            onClick={() => onProductSelect(product)}
          >
            {/* Image */}
            <div className="h-[140px] w-full bg-muted overflow-hidden relative">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-4xl">🍔</div>
              )}
              <div className="absolute top-2 left-2">
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Destaque
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <h3 className="font-semibold text-foreground text-sm truncate">{product.name}</h3>
              {product.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-primary text-sm">{formatCurrency(product.price)}</span>
                <Button size="sm" className="h-7 text-xs px-3 rounded-full">
                  Pedir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
