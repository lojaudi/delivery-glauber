import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Clock, Banknote, CreditCard, QrCode, ChevronRight, Pencil, Trash2, Plus, Minus, Tag, X, AlertCircle, Store, MapPin, Truck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useStoreConfig } from '@/hooks/useStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { useValidateCoupon, calculateDiscount, Coupon } from '@/hooks/useCoupons';
import { useDeliveryZones, DeliveryZone } from '@/hooks/useDeliveryZones';
import { saveLastOrderId } from '@/components/order/FloatingOrderButton';
import { useBusinessHours, isStoreCurrentlyOpen } from '@/hooks/useBusinessHours';
import { AddressSelector } from '@/components/checkout/AddressSelector';
import { PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';

type DisplayPaymentMethod = 'money' | 'debit' | 'credit' | 'pix';

const CHECKOUT_STORAGE_KEY = 'delivery-checkout';

const paymentOptions: { id: DisplayPaymentMethod; dbValue: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'money', dbValue: 'money', label: 'Dinheiro', icon: Banknote },
  { id: 'debit', dbValue: 'card', label: 'Débito', icon: CreditCard },
  { id: 'credit', dbValue: 'card', label: 'Crédito', icon: CreditCard },
  { id: 'pix', dbValue: 'pix', label: 'Pix', icon: QrCode },
];

interface CheckoutFormData {
  deliveryType: 'delivery' | 'pickup';
  name: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  selectedPayment: DisplayPaymentMethod | null;
}

function loadCheckoutFromStorage(): CheckoutFormData | null {
  try {
    const stored = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading checkout from storage:', error);
  }
  return null;
}

function saveCheckoutToStorage(data: CheckoutFormData) {
  try {
    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving checkout to storage:', error);
  }
}

function clearCheckoutStorage() {
  localStorage.removeItem(CHECKOUT_STORAGE_KEY);
}

const Checkout = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { items, totalPrice, clearCart, updateQuantity, removeItem, restaurantSlug, setRestaurantSlug } = useCart();
  
  // Use URL slug first, then fall back to persisted slug
  const effectiveSlug = slug || restaurantSlug;
  const basePath = effectiveSlug ? `/r/${effectiveSlug}` : '';

  // Persist slug when available from URL
  useEffect(() => {
    if (slug && slug !== restaurantSlug) {
      setRestaurantSlug(slug);
    }
  }, [slug, restaurantSlug, setRestaurantSlug]);

  const { toast } = useToast();
  const { data: store } = useStoreConfig();
  const { data: businessHours } = useBusinessHours();
  const { zones: deliveryZones, isLoading: isLoadingZones } = useDeliveryZones();
  const createOrder = useCreateOrder();
  const validateCoupon = useValidateCoupon();

  const savedData = loadCheckoutFromStorage();

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>(savedData?.deliveryType || 'delivery');
  const [deliveryData, setDeliveryData] = useState({
    name: savedData?.name || '',
    phone: savedData?.phone || '',
    street: savedData?.street || '',
    number: savedData?.number || '',
    neighborhood: savedData?.neighborhood || '',
  });
  const [selectedPayment, setSelectedPayment] = useState<DisplayPaymentMethod | null>(savedData?.selectedPayment || null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [changeFor, setChangeFor] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Get active delivery zones
  const activeZones = useMemo(() => 
    deliveryZones.filter((z: DeliveryZone) => z.is_active), 
    [deliveryZones]
  );

  // Get selected zone and its fee
  const selectedZone = useMemo(() => 
    activeZones.find((z: DeliveryZone) => z.id === selectedZoneId),
    [activeZones, selectedZoneId]
  );

  // Use zones if available, otherwise fall back to store delivery fee
  const useZonesMode = activeZones.length > 0 && store?.delivery_fee_mode === 'zones';

  // Persist checkout data whenever it changes
  useEffect(() => {
    saveCheckoutToStorage({
      deliveryType,
      name: deliveryData.name,
      phone: deliveryData.phone,
      street: deliveryData.street,
      number: deliveryData.number,
      neighborhood: deliveryData.neighborhood,
      selectedPayment,
    });
  }, [deliveryType, deliveryData, selectedPayment]);

  // Calculate delivery fee based on mode (zones or fixed)
  const deliveryFee = useMemo(() => {
    if (deliveryType === 'pickup') return 0;
    
    // If using zones mode and a zone is selected
    if (useZonesMode && selectedZone) {
      return Number(selectedZone.fee);
    }
    
    // Fall back to fixed delivery fee
    return Number(store?.delivery_fee || 5.99);
  }, [deliveryType, useZonesMode, selectedZone, store?.delivery_fee]);

  // Check if zone has minimum order requirement
  const zoneMinOrderValue = selectedZone?.min_order_value || null;

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  
  // Calculate subtotal - product.price already includes addons from ProductModal
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
  }, [items]);
  
  const discount = appliedCoupon ? calculateDiscount(appliedCoupon, subtotal) : 0;
  const finalTotal = subtotal + deliveryFee - discount;
  const minOrderValue = Number(store?.min_order_value || 0);
  const isStoreOpen = businessHours ? isStoreCurrentlyOpen(businessHours) : true;

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({ title: 'Digite o código do cupom', variant: 'destructive' });
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const coupon = await validateCoupon.mutateAsync({
        code: couponCode,
        orderTotal: subtotal,
      });
      setAppliedCoupon(coupon);
      toast({
        title: 'Cupom aplicado!',
        description: `Desconto de ${coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)}`,
      });
    } catch (error: any) {
      toast({
        title: 'Cupom inválido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleSubmit = async () => {
    // Validate store is open
    if (!isStoreOpen) {
      toast({
        title: 'Loja fechada',
        description: 'Não é possível fazer pedidos fora do horário de funcionamento.',
        variant: 'destructive',
      });
      return;
    }



    if (!deliveryData.name.trim()) {
      toast({ title: 'Preencha seu nome', variant: 'destructive' });
      return;
    }
    if (deliveryData.phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Telefone inválido', variant: 'destructive' });
      return;
    }
    if (deliveryType === 'delivery' && (!deliveryData.street.trim() || !deliveryData.number.trim() || !deliveryData.neighborhood.trim())) {
      toast({ title: 'Preencha o endereço completo', variant: 'destructive' });
      return;
    }
    if (deliveryType === 'delivery' && useZonesMode && !selectedZoneId) {
      toast({ title: 'Selecione a zona de entrega', variant: 'destructive' });
      return;
    }
    if (!selectedPayment) {
      toast({ title: 'Selecione a forma de pagamento', variant: 'destructive' });
      return;
    }
    // Check zone minimum order value
    if (zoneMinOrderValue && subtotal < zoneMinOrderValue) {
      toast({ 
        title: 'Pedido mínimo não atingido', 
        description: `Esta zona requer pedido mínimo de ${formatCurrency(zoneMinOrderValue)}`,
        variant: 'destructive' 
      });
      return;
    }

    // Get the correct payment method for database
    const paymentOption = paymentOptions.find(p => p.id === selectedPayment);
    const paymentMethod = paymentOption?.dbValue || 'money';

    try {
      const order = await createOrder.mutateAsync({
        order: {
          customer_name: deliveryData.name,
          customer_phone: deliveryData.phone,
          address_street: deliveryType === 'delivery' ? deliveryData.street : 'Retirada no local',
          address_number: deliveryType === 'delivery' ? deliveryData.number : '-',
          address_neighborhood: deliveryType === 'delivery' ? deliveryData.neighborhood : '-',
          total_amount: finalTotal,
          payment_method: paymentMethod,
          change_for: selectedPayment === 'money' && changeFor ? parseFloat(changeFor.replace(',', '.')) : null,
        },
        items: items.map(item => ({
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          observation: item.observation || null,
        })),
      });

      toast({
        title: '🎉 Pedido enviado!',
        description: `Pedido #${order.id} recebido com sucesso.`,
      });

      clearCart();
      clearCheckoutStorage();
      saveLastOrderId(order.id);
      navigate(`${basePath}/order/${order.id}`);
    } catch (error) {
      toast({
        title: 'Erro ao enviar pedido',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

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

  const isBelowMinimum = subtotal < minOrderValue;
  const isBelowZoneMinimum = zoneMinOrderValue ? subtotal < zoneMinOrderValue : false;
  const needsZoneSelection = deliveryType === 'delivery' && useZonesMode && !selectedZoneId;
  const canOrder = isStoreOpen && !isBelowMinimum && !isBelowZoneMinimum && !needsZoneSelection;

  return (
    <>
      <Helmet>
        <title>Checkout - {store?.name || 'Delivery'}</title>
      </Helmet>

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center gap-3 bg-background px-4 py-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/cart`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Finalize seu pedido</h1>
        </header>

        {/* Store Closed Warning */}
        {!isStoreOpen && (
          <div className="mx-4 mt-4 flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <Store className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Loja fechada</p>
              <p className="text-xs text-muted-foreground">
                Não estamos aceitando pedidos no momento
              </p>
            </div>
          </div>
        )}

        {/* Minimum Order Warning */}
        {isStoreOpen && isBelowMinimum && (
          <div className="mx-4 mt-4 flex items-center gap-3 p-4 bg-warning/10 border border-warning/30 rounded-xl">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Pedido mínimo não atingido</p>
              <p className="text-xs text-muted-foreground">
                Adicione mais {formatCurrency(minOrderValue - subtotal)} para continuar
              </p>
            </div>
          </div>
        )}

        {/* Delivery Type Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setDeliveryType('delivery')}
            className={cn(
              "flex-1 py-3 text-center font-medium transition-colors",
              deliveryType === 'delivery' 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground"
            )}
          >
            Entrega
          </button>
          <button
            onClick={() => setDeliveryType('pickup')}
            className={cn(
              "flex-1 py-3 text-center font-medium transition-colors",
              deliveryType === 'pickup' 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground"
            )}
          >
            Retirada
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Address Section */}
          {deliveryType === 'delivery' && (
            <section className="bg-card rounded-2xl p-4 shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Endereço para entrega</h3>
              
              {/* Address Selector - shows when phone is filled */}
              <AddressSelector
                phone={deliveryData.phone}
                selectedAddress={{
                  street: deliveryData.street,
                  number: deliveryData.number,
                  neighborhood: deliveryData.neighborhood,
                }}
                onAddressChange={(addr) => setDeliveryData({
                  ...deliveryData,
                  street: addr.street,
                  number: addr.number,
                  neighborhood: addr.neighborhood,
                })}
              />

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Rua</label>
                  <Input
                    placeholder="Nome da rua"
                    value={deliveryData.street}
                    onChange={(e) => setDeliveryData({ ...deliveryData, street: e.target.value })}
                    className="mt-1 bg-muted/50 border-0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Número</label>
                    <Input
                      placeholder="Nº"
                      value={deliveryData.number}
                      onChange={(e) => setDeliveryData({ ...deliveryData, number: e.target.value })}
                      className="mt-1 bg-muted/50 border-0"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Bairro</label>
                    <Input
                      placeholder="Bairro"
                      value={deliveryData.neighborhood}
                      onChange={(e) => setDeliveryData({ ...deliveryData, neighborhood: e.target.value })}
                      className="mt-1 bg-muted/50 border-0"
                    />
                  </div>
                </div>

                {/* Delivery Zone Selector */}
                {useZonesMode && (
                  <div className="mt-4">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Zona de entrega
                    </label>
                    <Select
                      value={selectedZoneId || ''}
                      onValueChange={(value) => setSelectedZoneId(value)}
                    >
                      <SelectTrigger className="mt-1 bg-muted/50 border-0">
                        <SelectValue placeholder="Selecione sua região" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeZones.map((zone: DeliveryZone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{zone.name}</span>
                              <span className="text-muted-foreground text-sm">
                                {formatCurrency(zone.fee)}
                                {zone.min_order_value && ` (mín. ${formatCurrency(zone.min_order_value)})`}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedZone && selectedZone.min_order_value && subtotal < selectedZone.min_order_value && (
                      <p className="text-xs text-warning mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Pedido mínimo: {formatCurrency(selectedZone.min_order_value)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Pickup Store Address */}
          {deliveryType === 'pickup' && store?.address && (
            <section className="bg-card rounded-2xl p-4 shadow-card">
              <h3 className="font-semibold text-foreground mb-3">Local para retirada</h3>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-foreground">{store.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Previsão: 15-25 min após confirmação
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Customer Data Section */}
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">Dados do cliente</h3>
            <div className="bg-card rounded-2xl p-4 shadow-card space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nome completo</label>
                <Input
                  placeholder="Seu nome"
                  value={deliveryData.name}
                  onChange={(e) => setDeliveryData({ ...deliveryData, name: e.target.value })}
                  className="mt-1 bg-muted/50 border-0"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Telefone</label>
                <Input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={deliveryData.phone}
                  onChange={(e) => setDeliveryData({ ...deliveryData, phone: formatPhone(e.target.value) })}
                  className="mt-1 bg-muted/50 border-0"
                  maxLength={15}
                />
              </div>
            </div>
          </section>

          {/* Payment Method Section */}
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">Método de pagamento</h3>
            <p className="text-sm text-primary">Pague na entrega</p>
            <div className="grid grid-cols-2 gap-3">
              {paymentOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedPayment(option.id)}
                  className={cn(
                    "flex items-center gap-2 p-4 rounded-xl border-2 transition-colors",
                    selectedPayment === option.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  )}
                >
                  <option.icon className={cn(
                    "h-5 w-5",
                    selectedPayment === option.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    selectedPayment === option.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
            
            {selectedPayment === 'money' && (
              <div className="animate-slide-up rounded-xl bg-primary/10 p-4 mt-3">
                <label className="text-sm font-medium text-primary">Troco para quanto?</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 50,00"
                  value={changeFor}
                  onChange={(e) => setChangeFor(e.target.value)}
                  className="mt-2 bg-card border-primary/30"
                />
              </div>
            )}
          </section>

          {/* Order Summary Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-foreground text-center">Resumo do pedido</h3>
            
            {items.map((item) => (
              <div key={item.product.id} className="bg-card rounded-2xl p-3 shadow-card">
                <div className="flex gap-3">
                  <img
                    src={item.product.image_url || '/placeholder.svg'}
                    alt={item.product.name}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground truncate">{item.product.name}</p>
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        className="shrink-0 h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          const addonsParam = item.selectedAddons 
                            ? encodeURIComponent(JSON.stringify(item.selectedAddons))
                            : '';
                          const url = `${basePath}/?product=${item.product.id}&observation=${encodeURIComponent(item.observation || '')}&quantity=${item.quantity}&returnTo=checkout${addonsParam ? `&addons=${addonsParam}` : ''}`;
                          navigate(url);
                        }}
                        aria-label="Editar produto"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {item.observation && (
                      <p className="text-xs text-muted-foreground truncate">📝 {item.observation}</p>
                    )}
                    <p className="text-sm text-primary font-semibold mt-1">
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="flex items-center gap-1 text-xs text-destructive font-medium"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </button>
                  
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                      className="h-7 w-7 rounded-full bg-muted"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-5 text-center font-semibold text-sm">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="h-7 w-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add More Items */}
            {effectiveSlug && (
              <button
                onClick={() => navigate(basePath)}
                className="flex items-center justify-between w-full p-4 rounded-2xl bg-card shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Esqueceu algum produto?</p>
                    <p className="text-sm text-muted-foreground">Adicione mais itens</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-primary" />
              </button>
            )}
          </section>

          {/* Coupon Section */}
          {appliedCoupon ? (
            <div className="flex items-center justify-between p-4 bg-secondary/10 border border-secondary/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-secondary" />
                <div>
                  <p className="font-medium text-foreground">{appliedCoupon.code}</p>
                  <p className="text-sm text-secondary">
                    -{appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatCurrency(appliedCoupon.discount_value)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={removeCoupon}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Cupom de desconto"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 bg-card border-border"
              />
              <Button 
                variant="outline" 
                className="text-primary border-primary hover:bg-primary/10"
                onClick={handleApplyCoupon}
                disabled={isApplyingCoupon}
              >
                {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
              </Button>
            </div>
          )}

          {/* Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            {deliveryType === 'delivery' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span className="text-foreground">{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            {appliedCoupon && discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Desconto</span>
                <span className="text-secondary">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-foreground">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* Delivery Estimate */}
          <div className="flex items-center gap-3 p-4 bg-card rounded-2xl shadow-card">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-primary font-medium uppercase">Previsão de entrega</p>
              <p className="font-semibold text-foreground">30-45 min</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background p-4 pb-6 border-t border-border">
          <Button
            onClick={handleSubmit}
            disabled={createOrder.isPending || !canOrder}
            size="xl"
            className="w-full rounded-full"
          >
            {createOrder.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : !isStoreOpen ? (
              'Loja Fechada'
            ) : isBelowMinimum ? (
              `Faltam ${formatCurrency(minOrderValue - subtotal)}`
            ) : needsZoneSelection ? (
              'Selecione a zona de entrega'
            ) : isBelowZoneMinimum && zoneMinOrderValue ? (
              `Mín. zona: ${formatCurrency(zoneMinOrderValue - subtotal)}`
            ) : (
              `Finalizar Pedido • ${formatCurrency(finalTotal)}`
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export default Checkout;
