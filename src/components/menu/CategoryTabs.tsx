import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Category } from '@/hooks/useCategories';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      
      const scrollLeft = button.offsetLeft - containerRect.width / 2 + buttonRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeCategory]);

  return (
    <div className="sticky top-[152px] z-20 bg-background">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide"
      >
        {categories.map((category) => (
          <button
            key={category.id}
            ref={activeCategory === category.id ? activeRef : null}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              activeCategory === category.id
                ? "bg-primary text-primary-foreground shadow-card"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
