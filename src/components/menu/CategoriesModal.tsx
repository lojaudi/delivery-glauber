import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Category } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface CategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCategorySelect: (categoryId: string | null) => void;
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

export function CategoriesModal({ open, onOpenChange, categories, onCategorySelect }: CategoriesModalProps) {
  const handleSelect = (categoryId: string | null) => {
    onCategorySelect(categoryId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center">Todas as Categorias</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid grid-cols-3 gap-4 px-2">
            {/* Todos */}
            <button
              onClick={() => handleSelect(null)}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-md">
                <span className="text-3xl">🍽️</span>
              </div>
              <span className="text-xs font-medium text-primary text-center">
                Todos
              </span>
            </button>

            {categories.map((category) => {
              const emoji = categoryEmojis[category.name] || '🍴';
              
              return (
                <button
                  key={category.id}
                  onClick={() => handleSelect(category.id)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted transition-colors hover:bg-primary/20 overflow-hidden">
                    {category.image_url ? (
                      <img 
                        src={category.image_url} 
                        alt={category.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">{emoji}</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground text-center line-clamp-2">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
