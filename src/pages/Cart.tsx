import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Pencil, Minus, Plus, Trash2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useStoreConfig } from '@/hooks/useStore';

const Cart = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { items, totalItems, totalPrice, updateQuantity, removeItem, restaurantSlug, setRestaurantSlug } = useCart();
  const { data: store } = useStoreConfig();

  // Use URL slug first, then fall back to persisted slug
  const effectiveSlug = slug || restaurantSlug;
  const basePath = effectiveSlug ? `/r/${effectiveSlug}` : '';

  // Persist slug when available from URL
  useEffect(() => {
    if (slug && slug !== restaurantSlug) {
      setRestaurantSlug(slug);
    }
  }, [slug, restaurantSlug, setRestaurantSlug]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-xl font-bold text-foreground">Carrinho vazio</h1>
        <p className="mt-2 text-muted-foreground">Adicione itens do cardápio para continuar</p>
        <Button onClick={() => navigate(basePath)} className="mt-6 rounded-full">
          Ver Cardápio
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Meu Carrinho - {store?.name || 'Delivery'}</title>
      </Helmet>

      <div className="min-h-screen bg-background pb-32">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center gap-3 bg-primary px-4 py-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(basePath)}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20">
            <ShoppingCart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Meu Carrinho</h1>
            <p className="text-sm text-primary-foreground/80">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
          </div>
        </header>

        {/* Cart Items */}
        <div className="p-4 space-y-4">
          {items.map((item) => (
            <div key={item.product.id} className="bg-card rounded-2xl p-4 shadow-card">
              <div className="flex gap-3">
                {/* Product Image */}
                <img
                  src={item.product.image_url || '/placeholder.svg'}
                  alt={item.product.name}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{item.product.name}</h3>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="shrink-0 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        const addonsParam = item.selectedAddons 
                          ? encodeURIComponent(JSON.stringify(item.selectedAddons))
                          : '';
                        const url = `${basePath}/?product=${item.product.id}&observation=${encodeURIComponent(item.observation || '')}&quantity=${item.quantity}&returnTo=cart${addonsParam ? `&addons=${addonsParam}` : ''}`;
                        navigate(url);
                      }}
                      aria-label="Editar produto"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  {item.observation && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      📝 {item.observation}
                    </p>
                  )}
                  <p className="text-primary font-semibold mt-1">
                    {formatCurrency(item.product.price * item.quantity)}
                  </p>
                </div>
              </div>
              
              {/* Actions Row */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                {/* Remove Button */}
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="flex items-center gap-1.5 text-sm text-destructive font-medium hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </button>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                    className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center font-semibold text-foreground">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Add More Items Button */}
          {effectiveSlug && (
            <button
              onClick={() => navigate(basePath)}
              className="w-full py-4 text-center text-muted-foreground font-medium border-2 border-dashed border-border rounded-2xl hover:border-primary hover:text-primary transition-colors"
            >
              + Adicionar mais itens
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-foreground">{formatCurrency(totalPrice)}</span>
          </div>
          <Button
            onClick={() => navigate(`${basePath}/checkout`)}
            size="xl"
            className="w-full rounded-full"
          >
            Continuar para pagamento
          </Button>
        </div>
      </div>
    </>
  );
};

export default Cart;
