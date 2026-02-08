import { useState, useMemo } from 'react';
import { Banknote, CreditCard, QrCode, ArrowLeft, Printer, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTableOrderMutations } from '@/hooks/useTableOrders';
import { useAdminRestaurant } from '@/hooks/useAdminRestaurant';
import { printReceiptBrowser, PrintOrderData } from '@/utils/thermalPrinter';
import { toast } from 'sonner';

interface QuickSaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  observation: string;
  addons: {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    price: number;
  }[];
  totalPrice: number;
}

interface QuickSaleCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: QuickSaleItem[];
  customerName: string;
  onSuccess: () => void;
  onBack: () => void;
}

const paymentMethods = [
  { id: 'money', label: 'Dinheiro', icon: Banknote },
  { id: 'credit', label: 'Crédito', icon: CreditCard },
  { id: 'debit', label: 'Débito', icon: CreditCard },
  { id: 'pix', label: 'PIX', icon: QrCode },
];

export function QuickSaleCheckout({
  open,
  onOpenChange,
  items,
  customerName,
  onSuccess,
  onBack,
}: QuickSaleCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState('money');
  const [changeFor, setChangeFor] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const { restaurantId } = useAdminRestaurant();
  const { openTable, addItem, closeTable } = useTableOrderMutations();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  const change = useMemo(() => {
    const changeValue = parseFloat(changeFor) || 0;
    if (paymentMethod === 'money' && changeValue > total) {
      return changeValue - total;
    }
    return 0;
  }, [changeFor, total, paymentMethod]);

  const handleFinalize = async () => {
    if (!restaurantId) {
      toast.error('Restaurante não identificado');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create a quick sale order (table_id = null)
      const order = await openTable.mutateAsync({
        tableId: null, // No table for quick sale
        customerCount: 1,
        waiterName: customerName || 'Balcão',
      });

      const orderId = order.id;

      // 2. Add items to the order
      for (const item of items) {
        const addonsText = item.addons.length > 0
          ? item.addons.map(a => a.optionName).join(', ')
          : '';
        const fullObservation = [addonsText, item.observation].filter(Boolean).join(' - ');

        await addItem.mutateAsync({
          orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0),
          observation: fullObservation || undefined,
        });
      }

      // 3. Close the order immediately
      await closeTable.mutateAsync({
        orderId,
        tableId: null,
        paymentMethod,
        discount: 0,
        discountType: 'value',
        serviceFeeEnabled: false,
        totalAmount: total,
      });

      setIsComplete(true);
      toast.success('Venda finalizada com sucesso!');

      // Auto close after showing success
      setTimeout(() => {
        setIsComplete(false);
        setPaymentMethod('money');
        setChangeFor('');
        onSuccess();
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      console.error('Error processing quick sale:', error);
      toast.error('Erro ao processar venda');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    // Build print data for professional thermal printing
    const printData: PrintOrderData = {
      orderNumber: `B${Date.now().toString().slice(-6)}`, // Quick order number
      orderType: 'quick_sale',
      customerName: customerName || 'Balcão',
      items: items.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0),
        observation: item.addons.length > 0 
          ? item.addons.map(a => a.optionName).join(', ') + (item.observation ? ` - ${item.observation}` : '')
          : item.observation,
      })),
      subtotal: total,
      total: total,
      paymentMethod: paymentMethod,
      changeFor: parseFloat(changeFor) || undefined,
      createdAt: new Date(),
    };

    printReceiptBrowser(printData);
  };

  if (isComplete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Venda Finalizada!
            </h2>
            <p className="text-muted-foreground text-center">
              Total: {formatCurrency(total)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Finalizar Venda</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Items Summary */}
          <div className="border rounded-xl p-4">
            <h3 className="font-semibold mb-2">
              Resumo {customerName && `- ${customerName}`}
            </h3>
            <ScrollArea className="max-h-32">
              <div className="space-y-1 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.productName}
                    </span>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="border-t mt-3 pt-3 flex justify-between">
              <span className="font-bold">Total</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="grid grid-cols-2 gap-3"
            >
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Label
                    key={method.id}
                    className={`
                      flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors
                      ${paymentMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <RadioGroupItem value={method.id} className="sr-only" />
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{method.label}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Change calculation for cash */}
          {paymentMethod === 'money' && (
            <div className="space-y-2">
              <Label htmlFor="changeFor">Troco para</Label>
              <Input
                id="changeFor"
                type="number"
                placeholder="0,00"
                value={changeFor}
                onChange={(e) => setChangeFor(e.target.value)}
              />
              {change > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-amber-800">Troco</span>
                  <span className="text-xl font-bold text-amber-700">
                    {formatCurrency(change)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isProcessing}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isProcessing}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button
            className="flex-1"
            onClick={handleFinalize}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
