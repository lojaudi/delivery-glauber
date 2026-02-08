import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, User, CreditCard, Clock, Printer } from 'lucide-react';
import { useOrderItems, Order } from '@/hooks/useOrders';
import { useStoreConfig } from '@/hooks/useStore';
import { PrintReceiptButton } from '@/components/pdv/PrintReceiptButton';
import { PrintOrderData } from '@/utils/thermalPrinter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  preparing: { label: 'Em Preparo', color: 'bg-blue-100 text-blue-800' },
  delivery: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Finalizado', color: 'bg-green-100 text-green-800' },
};

const paymentConfig: Record<string, { label: string; icon: string }> = {
  pix: { label: 'PIX', icon: '💠' },
  money: { label: 'Dinheiro', icon: '💵' },
  card: { label: 'Cartão', icon: '💳' },
};

export function OrderDetailModal({ order, open, onOpenChange }: OrderDetailModalProps) {
  const { data: items } = useOrderItems(order?.id ?? null);
  const { data: store } = useStoreConfig();

  const formatCurrency = (value: number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getPrintData = (): PrintOrderData | null => {
    if (!order || !items) return null;
    
    return {
      orderNumber: order.id,
      orderType: 'delivery',
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      address: {
        street: order.address_street,
        number: order.address_number,
        neighborhood: order.address_neighborhood,
        complement: order.address_complement || undefined,
      },
      items: items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        observation: item.observation || undefined,
      })),
      subtotal: items.reduce((sum, item) => sum + (item.quantity * Number(item.unit_price)), 0),
      deliveryFee: store?.delivery_fee || 0,
      total: Number(order.total_amount),
      paymentMethod: paymentConfig[order.payment_method]?.label || order.payment_method,
      createdAt: new Date(order.created_at),
    };
  };

  const printData = getPrintData();

  if (!order) return null;

  const status = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-800' };
  const payment = paymentConfig[order.payment_method] || { label: order.payment_method, icon: '💰' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Pedido #{order.id}</DialogTitle>
            <Badge className={status.color}>{status.label}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">CLIENTE</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{order.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer_phone}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Address */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">ENDEREÇO DE ENTREGA</h3>
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  {order.address_street}, {order.address_number}
                </p>
                {order.address_complement && (
                  <p className="text-sm text-muted-foreground">{order.address_complement}</p>
                )}
                <p className="text-sm text-muted-foreground">{order.address_neighborhood}</p>
                {order.address_reference && (
                  <p className="text-sm text-muted-foreground italic">
                    Ref: {order.address_reference}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">ITENS DO PEDIDO</h3>
            <div className="space-y-2">
              {items?.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.quantity}x {item.product_name}
                    </p>
                    {item.observation && (
                      <p className="text-xs text-warning">📝 {item.observation}</p>
                    )}
                  </div>
                  <span className="font-medium">
                    {formatCurrency(item.quantity * Number(item.unit_price))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">PAGAMENTO</h3>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>
                {payment.icon} {payment.label}
              </span>
              {order.payment_method === 'money' && order.change_for && (
                <span className="text-muted-foreground">
                  (Troco p/ {formatCurrency(order.change_for)})
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>

          {/* Print Button */}
          {printData && (
            <PrintReceiptButton 
              orderData={printData} 
              variant="outline"
              className="w-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
