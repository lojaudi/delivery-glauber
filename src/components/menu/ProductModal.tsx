import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Product } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useProductAddons, AddonGroup, AddonOption } from '@/hooks/useAddons';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  initialQuantity?: number;
  initialObservation?: string;
  initialAddons?: Record<string, string[]>;
  isEditing?: boolean;
  returnTo?: string | null;
}

interface AddonGroupWithOptions extends AddonGroup {
  options: AddonOption[];
}

export function ProductModal({
  product,
  onClose,
  initialQuantity = 1,
  initialObservation = '',
  initialAddons,
  isEditing = false,
  returnTo = null,
}: ProductModalProps) {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [observation, setObservation] = useState(initialObservation);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, string[]>>(initialAddons || {});
  const { addItem, removeItem } = useCart();
  
  const { data: addonGroups, isLoading: addonsLoading } = useProductAddons(product.id);

  // Block body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Initialize selected add-ons when data loads (only if not editing with pre-selected addons)
  useEffect(() => {
    if (addonGroups && !initialAddons) {
      const initial: Record<string, string[]> = {};
      addonGroups.forEach((group: AddonGroupWithOptions) => {
        if (group.is_required && group.options.length > 0) {
          // Pre-select first option if required
          initial[group.id] = [group.options[0].id];
        } else {
          initial[group.id] = [];
        }
      });
      setSelectedAddOns(initial);
    }
  }, [addonGroups, initialAddons]);

  // Calculate add-ons total
  const addOnsTotal = useMemo(() => {
    if (!addonGroups) return 0;
    
    let total = 0;
    addonGroups.forEach((group: AddonGroupWithOptions) => {
      const selected = selectedAddOns[group.id] || [];
      selected.forEach(optionId => {
        const option = group.options.find(o => o.id === optionId);
        if (option) {
          total += Number(option.price);
        }
      });
    });
    return total;
  }, [addonGroups, selectedAddOns]);

  const basePrice = Number(product.price);
  const unitPrice = basePrice + addOnsTotal;
  const totalPrice = (unitPrice * quantity).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  const formattedPrice = basePrice.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const handleSingleSelect = (groupId: string, optionId: string) => {
    setSelectedAddOns(prev => ({
      ...prev,
      [groupId]: [optionId]
    }));
  };

  const handleMultiSelect = (groupId: string, optionId: string, maxSelections: number) => {
    setSelectedAddOns(prev => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) };
      } else if (current.length < maxSelections) {
        return { ...prev, [groupId]: [...current, optionId] };
      }
      return prev;
    });
  };

  const handleAddToCart = () => {
    if (isEditing) {
      removeItem(product.id);
    }

    addItem(
      {
        id: product.id,
        category_id: product.category_id || '',
        name: product.name,
        description: product.description || '',
        price: unitPrice, // Price with add-ons
        image_url: product.image_url || '',
        is_available: product.is_available,
      },
      quantity,
      observation.trim() ? observation.trim() : undefined,
      selectedAddOns
    );

    if (isEditing && returnTo) {
      navigate(`/${returnTo}`);
    } else {
      onClose();
    }
  };

  const hasAddons = addonGroups && addonGroups.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-slide-up bg-background sm:rounded-3xl sm:m-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image Header with Close Button */}
          <div className="relative h-56 sm:h-64 w-full bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <span className="text-6xl">🍔</span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="absolute left-3 top-3 h-9 w-9 rounded-full bg-foreground/80 text-background hover:bg-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Product Info */}
          <div className="p-4 sm:p-5 border-b border-border">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">{product.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
            <p className="mt-3 text-xl sm:text-2xl font-bold text-primary italic">
              {formattedPrice}
            </p>
          </div>

          {/* Add-ons Sections */}
          {addonsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : hasAddons ? (
            addonGroups.map((group: AddonGroupWithOptions) => (
              <div key={group.id} className="border-b border-border">
                {/* Section Header */}
                <div className="bg-muted/50 px-4 sm:px-5 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">{group.title}</h3>
                    {group.is_required && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                        Obrigatório
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {group.subtitle || `Escolha ${group.max_selections === 1 ? '1 opção' : `até ${group.max_selections} opções`}`}
                  </p>
                </div>
                
                {/* Options */}
                {group.max_selections === 1 ? (
                  <RadioGroup 
                    value={selectedAddOns[group.id]?.[0] || ''} 
                    onValueChange={(value) => handleSingleSelect(group.id, value)} 
                    className="px-4 sm:px-5 py-2"
                  >
                    {group.options.map((option) => (
                      <div 
                        key={option.id} 
                        className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                      >
                        <Label 
                          htmlFor={`${group.id}-${option.id}`} 
                          className="flex-1 cursor-pointer font-normal text-sm sm:text-base text-foreground"
                        >
                          {option.name}
                          {Number(option.price) > 0 && (
                            <span className="text-muted-foreground ml-2 text-sm">
                              +{Number(option.price).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </span>
                          )}
                        </Label>
                        <RadioGroupItem 
                          value={option.id} 
                          id={`${group.id}-${option.id}`} 
                          className="h-5 w-5 sm:h-6 sm:w-6 border-2 border-muted-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary" 
                        />
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="px-4 sm:px-5 py-2">
                    {group.options.map((option) => {
                      const isSelected = selectedAddOns[group.id]?.includes(option.id) || false;
                      return (
                        <div 
                          key={option.id} 
                          className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                        >
                          <Label 
                            htmlFor={`${group.id}-${option.id}`} 
                            className="flex-1 cursor-pointer font-normal text-sm sm:text-base text-foreground"
                          >
                            {option.name}
                            {Number(option.price) > 0 && (
                              <span className="text-muted-foreground ml-2 text-sm">
                                +{Number(option.price).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </span>
                            )}
                          </Label>
                          <Checkbox
                            id={`${group.id}-${option.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleMultiSelect(group.id, option.id, group.max_selections)}
                            className="h-5 w-5 sm:h-6 sm:w-6"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          ) : null}

          {/* Observation */}
          <div className="p-4 sm:p-5">
            <label className="text-sm font-medium text-foreground">
              Alguma observação?
            </label>
            <Textarea 
              placeholder="Ex: Sem cebola, molho à parte..." 
              value={observation} 
              onChange={e => setObservation(e.target.value)} 
              className="mt-2 resize-none rounded-xl bg-muted border-0 text-sm" 
              rows={3} 
            />
          </div>
        </div>

        {/* Footer - Add Button */}
        <div className="shrink-0 bg-background p-4 pb-6 safe-area-bottom border-t border-border">
          {/* Quantity Selector */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="h-10 w-10 rounded-full"
            >
              -
            </Button>
            <span className="text-lg font-bold w-8 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
              className="h-10 w-10 rounded-full"
            >
              +
            </Button>
          </div>
          
          <Button onClick={handleAddToCart} className="w-full rounded-full" size="xl">
            {isEditing ? 'Atualizar' : 'Adicionar'} • {totalPrice}
          </Button>
        </div>
      </div>
    </div>
  );
}
