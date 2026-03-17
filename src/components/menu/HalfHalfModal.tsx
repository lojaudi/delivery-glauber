import { useState, useMemo } from 'react';
import { X, Check, Pizza } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';

interface HalfHalfModalProps {
  product: Product;
  sameCategoryProducts: Product[];
  onClose: () => void;
}

export function HalfHalfModal({ product, sameCategoryProducts, onClose }: HalfHalfModalProps) {
  const [secondFlavor, setSecondFlavor] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const { addItem } = useCart();

  // Available second flavors: same category, allows_half, available, not the same product
  const availableFlavors = useMemo(() => 
    sameCategoryProducts.filter(p => 
      p.id !== product.id && p.allows_half && p.is_available
    ),
    [sameCategoryProducts, product.id]
  );

  // Price: highest of the two
  const finalPrice = secondFlavor 
    ? Math.max(Number(product.price), Number(secondFlavor.price))
    : Number(product.price);

  const totalPrice = (finalPrice * quantity).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const handleAdd = () => {
    const halfHalfName = secondFlavor 
      ? `½ ${product.name} + ½ ${secondFlavor.name}`
      : product.name;

    addItem(
      {
        id: product.id,
        category_id: product.category_id || '',
        name: halfHalfName,
        description: product.description || '',
        price: finalPrice,
        image_url: product.image_url || '',
        is_available: product.is_available,
      },
      quantity,
      observation.trim() || undefined,
      undefined,
      secondFlavor ? {
        isHalfHalf: true,
        secondProduct: {
          id: secondFlavor.id,
          name: secondFlavor.name,
          price: Number(secondFlavor.price),
          image_url: secondFlavor.image_url || '',
        }
      } : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-slide-up bg-background sm:rounded-3xl sm:m-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-full">
              <X className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold text-foreground">Pizza Meio a Meio</h2>
            <div className="w-9" />
          </div>
        </div>

        {/* First flavor - locked */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
            <span className="text-sm font-semibold text-foreground">Primeiro sabor</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-3">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center"><span className="text-xl">🍕</span></div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{product.name}</p>
              <p className="text-sm text-primary font-medium">
                {Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <Check className="h-5 w-5 text-primary shrink-0" />
          </div>
        </div>

        {/* Second flavor selector */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
              secondFlavor ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>2</div>
            <span className="text-sm font-semibold text-foreground">Segundo sabor</span>
            <span className="text-xs text-muted-foreground">(opcional)</span>
          </div>
        </div>

        {/* Scrollable flavor list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {availableFlavors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Nenhum outro sabor disponível para meio a meio nesta categoria.
            </p>
          ) : (
            <div className="space-y-2">
              {availableFlavors.map(flavor => {
                const isSelected = secondFlavor?.id === flavor.id;
                return (
                  <button
                    key={flavor.id}
                    onClick={() => setSecondFlavor(isSelected ? null : flavor)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl border-2 p-3 transition-all text-left",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    {flavor.image_url ? (
                      <img src={flavor.image_url} alt={flavor.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center"><span className="text-xl">🍕</span></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-sm">{flavor.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {Number(flavor.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 shrink-0 transition-colors",
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Price info */}
          {secondFlavor && (
            <div className="mt-3 rounded-xl bg-muted/50 p-3 flex items-center gap-2">
              <Pizza className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                O valor cobrado será do sabor mais caro: <span className="font-semibold text-foreground">
                  {finalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </p>
            </div>
          )}

          {/* Observation */}
          <div className="mt-4">
            <label className="text-sm font-medium text-foreground">Alguma observação?</label>
            <Textarea
              placeholder="Ex: Sem cebola, borda recheada..."
              value={observation}
              onChange={e => setObservation(e.target.value)}
              className="mt-2 resize-none rounded-xl bg-muted border-0 text-sm"
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-background p-4 pb-6 safe-area-bottom border-t border-border">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="h-10 w-10 rounded-full">-</Button>
            <span className="text-lg font-bold w-8 text-center">{quantity}</span>
            <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)} className="h-10 w-10 rounded-full">+</Button>
          </div>
          <Button onClick={handleAdd} className="w-full rounded-full" size="xl">
            Adicionar • {totalPrice}
          </Button>
        </div>
      </div>
    </div>
  );
}
