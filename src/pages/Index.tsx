import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { HeroHeader } from '@/components/menu/HeroHeader';
import { StoreInfo } from '@/components/menu/StoreInfo';
import { CategoryIcons } from '@/components/menu/CategoryIcons';
import { MenuSection } from '@/components/menu/MenuSection';
import { ProductModal } from '@/components/menu/ProductModal';
import { CartButton } from '@/components/cart/CartButton';
import { FloatingOrderButton, getLastOrderId } from '@/components/order/FloatingOrderButton';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { useStoreConfig } from '@/hooks/useStore';
import { useCategories } from '@/hooks/useCategories';
import { useProducts, Product } from '@/hooks/useProducts';
import { useTheme } from '@/hooks/useTheme';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface EditingProduct {
  product: Product;
  quantity: number;
  observation: string;
  returnTo: string | null;
  selectedAddons?: Record<string, string[]>;
}

const Index = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  const basePath = slug ? `/r/${slug}` : '';

  // Check if any reseller exists (system is configured)
  const { data: hasReseller, isLoading: resellerCheckLoading } = useQuery({
    queryKey: ['has-reseller'],
    queryFn: async () => {
      const { count } = await supabase
        .from('resellers')
        .select('*', { count: 'exact', head: true });
      return (count || 0) > 0;
    },
    enabled: !slug, // Only check on root route
  });

  const { data: store, isLoading: storeLoading } = useStoreConfig();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: products, isLoading: productsLoading } = useProducts();

  // Apply dynamic theme based on store colors
  useTheme();

  const isLoading = storeLoading || categoriesLoading || productsLoading || resellerCheckLoading;

  // If on root route and no reseller exists, redirect to setup
  if (!slug && hasReseller === false && !resellerCheckLoading) {
    return <Navigate to="/setup" replace />;
  }

  // Check for last order on mount
  useEffect(() => {
    const orderId = getLastOrderId();
    setLastOrderId(orderId);
  }, []);

  // Handle URL params for editing products from cart/checkout
  useEffect(() => {
    const productId = searchParams.get('product');
    const rawObservation = searchParams.get('observation') || '';
    const quantity = parseInt(searchParams.get('quantity') || '1', 10);
    const returnTo = searchParams.get('returnTo');
    const addonsParam = searchParams.get('addons');

    const sanitizeObservation = (value: string) => {
      const v = value.trim();
      if (!v) return '';

      // Legacy format previously stored: "Adicionais: ... | Obs: ..."
      const obsMarker = 'Obs:';
      if (v.includes(obsMarker)) {
        const idx = v.lastIndexOf(obsMarker);
        const extracted = v.slice(idx + obsMarker.length).trim();
        return extracted;
      }

      // If it only contains legacy addons text, drop it
      if (v.startsWith('Adicionais:')) return '';

      return v;
    };

    if (productId && products) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        let selectedAddons: Record<string, string[]> | undefined;
        if (addonsParam) {
          try {
            selectedAddons = JSON.parse(decodeURIComponent(addonsParam));
          } catch (e) {
            console.error('Error parsing addons:', e);
          }
        }

        setEditingProduct({
          product,
          quantity,
          observation: sanitizeObservation(rawObservation),
          returnTo,
          selectedAddons,
        });
        // Clear the URL params
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, products, setSearchParams]);

  const scrollToCategory = (categoryId: string) => {
    const element = sectionRefs.current[categoryId];
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setEditingProduct(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center p-6">
          <p className="text-muted-foreground mb-4">Restaurante não configurado</p>
          <a 
            href="/setup"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Configurar aplicativo
          </a>
        </div>
      </div>
    );
  }

  // Filter products by search
  const filteredProducts = products?.filter(product => 
    searchQuery === '' || 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  ) || [];

  // Group products by category
  const productsByCategory = categories?.map(category => ({
    category,
    products: filteredProducts.filter(p => p.category_id === category.id)
  })).filter(group => group.products.length > 0) || [];

  const totalItems = filteredProducts.length;

  // Determine which modal to show
  const modalProduct = editingProduct?.product || selectedProduct;
  const isEditing = !!editingProduct;

  return (
    <>
      <Helmet>
        <title>{store.name} - Cardápio Digital</title>
        <meta name="description" content={`Peça online no ${store.name}. Lanches, bebidas e muito mais com entrega rápida.`} />
      </Helmet>

      <div className="min-h-screen bg-background pb-24">
        {/* Hero Header */}
        <HeroHeader store={store} />

        {/* Store Info */}
        <StoreInfo store={store} />

        {/* Search Bar - Enhanced */}
        <div className="px-4 mt-6">
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Input
              type="text"
              placeholder="O que você deseja hoje?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="relative h-14 w-full rounded-2xl border-2 border-border bg-card pl-5 pr-14 text-base shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-0 transition-all duration-300"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Search className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <CategoryIcons 
            categories={categories} 
            onCategorySelect={scrollToCategory}
          />
        )}

        {/* Cardápio Header */}
        <div className="px-4 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1 w-6 rounded-full bg-primary" />
            <h2 className="text-xl font-bold text-foreground">Cardápio</h2>
          </div>
          <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {/* Menu Sections */}
        <div className="px-4 space-y-8">
          {productsByCategory.map(({ category, products }) => (
            <MenuSection
              key={category.id}
              ref={(el) => { sectionRefs.current[category.id] = el; }}
              category={category}
              products={products}
              onProductSelect={setSelectedProduct}
            />
          ))}

          {productsByCategory.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4 text-lg">
                {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
              </p>
              {!searchQuery && store.name === 'Meu Restaurante' && (
                <a 
                  href={`${basePath}/admin`}
                  className="inline-flex items-center justify-center rounded-xl gradient-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shadow-lg"
                >
                  Acessar Painel Admin
                </a>
              )}
            </div>
          )}
        </div>

        {/* Floating Order Button */}
        {lastOrderId && (
          <FloatingOrderButton 
            orderId={lastOrderId} 
            onDismiss={() => setLastOrderId(null)} 
          />
        )}

        {/* PWA Install Prompt */}
        <InstallPrompt />

        <CartButton />
        
        {modalProduct && (
          <ProductModal
            product={modalProduct}
            onClose={handleCloseModal}
            initialQuantity={editingProduct?.quantity}
            initialObservation={editingProduct?.observation}
            initialAddons={editingProduct?.selectedAddons}
            isEditing={isEditing}
            returnTo={editingProduct?.returnTo}
          />
        )}
      </div>
    </>
  );
};

export default Index;
