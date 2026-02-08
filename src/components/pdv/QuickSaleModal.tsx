import { useState, useMemo } from 'react';
import { Search, Plus, Minus, ShoppingBag, Trash2, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useProductAddons, AddonGroup, AddonOption } from '@/hooks/useAddons';
import { cn } from '@/lib/utils';

interface QuickSaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  observation: string;
  addons: SelectedAddon[];
  totalPrice: number;
}

interface SelectedAddon {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

interface QuickSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: (items: QuickSaleItem[], customerName: string) => void;
}

export function QuickSaleModal({ open, onOpenChange, onCheckout }: QuickSaleModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<QuickSaleItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  
  // Product selection state
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: categories } = useCategories();
  const { data: productAddons } = useProductAddons(selectedProduct?.id || '');

  const availableProducts = products?.filter(p => p.is_available) || [];

  const filteredProducts = availableProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const cartTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  const currentItemTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    return (selectedProduct.price + addonsTotal) * quantity;
  }, [selectedProduct, selectedAddons, quantity]);

  const handleAddonToggle = (group: AddonGroup & { options: AddonOption[] }, option: AddonOption) => {
    setSelectedAddons(prev => {
      const existing = prev.find(a => a.optionId === option.id);
      if (existing) {
        return prev.filter(a => a.optionId !== option.id);
      }
      
      // If max_selections is 1, replace any existing selection in this group
      if (group.max_selections === 1) {
        const filtered = prev.filter(a => a.groupId !== group.id);
        return [...filtered, {
          groupId: group.id,
          groupName: group.title,
          optionId: option.id,
          optionName: option.name,
          price: option.price,
        }];
      }
      
      // Check if we've reached max selections for this group
      const groupSelections = prev.filter(a => a.groupId === group.id);
      if (groupSelections.length >= group.max_selections) {
        return prev;
      }
      
      return [...prev, {
        groupId: group.id,
        groupName: group.title,
        optionId: option.id,
        optionName: option.name,
        price: option.price,
      }];
    });
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const newItem: QuickSaleItem = {
      id: `${Date.now()}-${Math.random()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      unitPrice: selectedProduct.price,
      observation,
      addons: selectedAddons,
      totalPrice: currentItemTotal,
    };

    setItems(prev => [...prev, newItem]);
    
    // Reset selection
    setSelectedProduct(null);
    setQuantity(1);
    setObservation('');
    setSelectedAddons([]);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleProductClick = (product: typeof filteredProducts[0]) => {
    setSelectedProduct({
      id: product.id,
      name: product.name,
      price: Number(product.price),
    });
    setSelectedAddons([]);
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    onCheckout(items, customerName);
    
    // Reset everything
    setItems([]);
    setCustomerName('');
    setSearch('');
    setSelectedCategory(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setObservation('');
    setSelectedAddons([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Venda Rápida / Balcão
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 gap-4 min-h-0">
          {/* Left side - Product selection */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedProduct ? (
              <>
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                  <Button
                    variant={selectedCategory === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    Todos
                  </Button>
                  {categories?.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat.id)}
                      className="whitespace-nowrap"
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>

                {/* Products Grid */}
                <ScrollArea className="flex-1">
                  {loadingProducts ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando produtos...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum produto encontrado
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className={cn(
                            "text-left p-3 rounded-xl border transition-all hover:border-primary hover:shadow-md",
                            "bg-card"
                          )}
                        >
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-16 object-cover rounded-lg mb-2"
                            />
                          )}
                          <p className="font-medium text-sm text-foreground line-clamp-2">
                            {product.name}
                          </p>
                          <p className="text-primary font-bold text-sm mt-1">
                            {formatCurrency(Number(product.price))}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              /* Product Details with Addons */
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-2">
                  <div className="bg-muted rounded-xl p-4">
                    <h3 className="font-bold text-lg">{selectedProduct.name}</h3>
                    <p className="text-primary font-bold text-xl">
                      {formatCurrency(selectedProduct.price)}
                    </p>
                  </div>

                  {/* Addons */}
                  {productAddons && productAddons.length > 0 && (
                    <div className="space-y-4">
                      {productAddons.map((group) => (
                        <div key={group.id} className="border rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{group.title}</h4>
                              {group.subtitle && (
                                <p className="text-sm text-muted-foreground">{group.subtitle}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {group.is_required && (
                                <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                Máx: {group.max_selections}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {group.options?.map((option) => {
                              const isSelected = selectedAddons.some(a => a.optionId === option.id);
                              return (
                                <label
                                  key={option.id}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleAddonToggle(group, option)}
                                    />
                                    <span>{option.name}</span>
                                  </div>
                                  {option.price > 0 && (
                                    <span className="text-sm font-medium text-primary">
                                      +{formatCurrency(option.price)}
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Observation */}
                  <Textarea
                    placeholder="Observações (opcional)"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    rows={2}
                  />

                  {/* Item Total */}
                  <div className="bg-primary/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Total do item</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(currentItemTotal)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedProduct(null);
                        setSelectedAddons([]);
                        setQuantity(1);
                        setObservation('');
                      }}
                    >
                      Voltar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleAddToCart}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Right side - Cart */}
          <div className="w-72 flex flex-col border-l pl-4">
            <div className="mb-3">
              <Input
                placeholder="Nome do cliente (opcional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Carrinho</h3>
              <Badge variant="secondary">{items.length} itens</Badge>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum item adicionado
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-muted rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">
                            {item.quantity}x {item.productName}
                          </p>
                          {item.addons.length > 0 && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.addons.map(a => a.optionName).join(', ')}
                            </p>
                          )}
                          {item.observation && (
                            <p className="text-xs text-muted-foreground italic line-clamp-1">
                              {item.observation}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-primary">
                            {formatCurrency(item.totalPrice)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="border-t pt-3 mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              
              <Button
                className="w-full"
                size="lg"
                disabled={items.length === 0}
                onClick={handleCheckout}
              >
                Finalizar
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
