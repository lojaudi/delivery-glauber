import { Product } from '@/hooks/useProducts';
import { Category } from '@/hooks/useCategories';
import { ProductCard } from './ProductCard';

interface ProductListProps {
  products: Product[];
  categories: Category[];
  activeCategory: string;
  searchQuery: string;
  onProductSelect: (product: Product) => void;
}

export function ProductList({ 
  products, 
  categories, 
  activeCategory, 
  searchQuery,
  onProductSelect 
}: ProductListProps) {
  const filteredProducts = products.filter(product => {
    const matchesCategory = product.category_id === activeCategory;
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    return matchesCategory && matchesSearch;
  });

  const activeCategoryName = categories.find(c => c.id === activeCategory)?.name || '';

  return (
    <div className="px-4 pb-32">
      <h2 className="mb-3 text-lg font-bold text-foreground">{activeCategoryName}</h2>
      <div className="flex flex-col gap-3">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onProductSelect}
            />
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'Nenhum produto encontrado' 
                : 'Nenhum produto nesta categoria'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
