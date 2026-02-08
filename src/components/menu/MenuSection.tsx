import { forwardRef } from 'react';
import { Category } from '@/hooks/useCategories';
import { Product } from '@/hooks/useProducts';
import { MenuProductCard } from './MenuProductCard';

interface MenuSectionProps {
  category: Category;
  products: Product[];
  onProductSelect: (product: Product) => void;
}

const categoryEmojis: Record<string, string> = {
  'Lanches': '🍔',
  'Hambúrgueres': '🍔',
  'Porções': '🍟',
  'Acompanhamentos': '🍟',
  'Bebidas': '🥤',
  'Combos': '🎁',
  'Sobremesas': '🍰',
};

export const MenuSection = forwardRef<HTMLDivElement, MenuSectionProps>(
  ({ category, products, onProductSelect }, ref) => {
    const emoji = categoryEmojis[category.name] || '📦';

    return (
      <div ref={ref} className="animate-fade-in">
        {/* Section Header - Modern style */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
            {category.image_url ? (
              <img 
                src={category.image_url} 
                alt={category.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl">{emoji}</span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{category.name}</h3>
            <p className="text-xs text-muted-foreground">{products.length} {products.length === 1 ? 'item' : 'itens'}</p>
          </div>
        </div>

        {/* Products Grid */}
        <div className="space-y-3">
          {products.map((product, index) => (
            <div 
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <MenuProductCard
                product={product}
                onSelect={onProductSelect}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);

MenuSection.displayName = 'MenuSection';