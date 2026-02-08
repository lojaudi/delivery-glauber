import { Category } from '@/hooks/useCategories';
import { ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { CategoriesModal } from './CategoriesModal';

interface CategoryIconsProps {
  categories: Category[];
  onCategorySelect: (categoryId: string) => void;
}

const categoryEmojis: Record<string, string> = {
  'Lanches': '🍔',
  'Hambúrgueres': '🍔',
  'Porções': '🍟',
  'Acompanhamentos': '🍟',
  'Bebidas': '🥤',
  'Combos': '🍱',
  'Sobremesas': '🍨',
};

export function CategoryIcons({ categories, onCategorySelect }: CategoryIconsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const handleSelect = (categoryId: string | null) => {
    setSelectedId(categoryId);
    if (categoryId) {
      onCategorySelect(categoryId);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="mt-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">Categorias</h3>
          </div>
          <button 
            onClick={() => setShowAllCategories(true)}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Ver todas
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
          {/* Todos - Special styling */}
          <button
            onClick={() => handleSelect(null)}
            className="flex flex-col items-center gap-2 min-w-[80px] group"
          >
            <div className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
              selectedId === null 
                ? "gradient-primary shadow-lg scale-105" 
                : "bg-gradient-to-br from-muted to-muted/50 group-hover:scale-105 group-hover:shadow-md"
            )}>
              {selectedId === null && (
                <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-md -z-10" />
              )}
              <span className="text-2xl">🍽️</span>
            </div>
            <span className={cn(
              "text-xs font-medium text-center transition-colors",
              selectedId === null ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
            )}>
              Todos
            </span>
          </button>

          {categories.map((category, index) => {
            const emoji = categoryEmojis[category.name] || '🍴';
            const isSelected = selectedId === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => handleSelect(category.id)}
                className="flex flex-col items-center gap-2 min-w-[80px] group animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn(
                  "relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 overflow-hidden",
                  isSelected 
                    ? "gradient-primary shadow-lg scale-105" 
                    : "bg-gradient-to-br from-muted to-muted/50 group-hover:scale-105 group-hover:shadow-md"
                )}>
                  {isSelected && (
                    <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-md -z-10" />
                  )}
                  {category.image_url ? (
                    <img 
                      src={category.image_url} 
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <span className="text-2xl transition-transform duration-300 group-hover:scale-110">{emoji}</span>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium text-center line-clamp-1 transition-colors",
                  isSelected ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <CategoriesModal
        open={showAllCategories}
        onOpenChange={setShowAllCategories}
        categories={categories}
        onCategorySelect={handleSelect}
      />
    </>
  );
}