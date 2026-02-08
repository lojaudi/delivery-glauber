import { Banknote, CreditCard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';

interface PaymentSelectorProps {
  selected: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  changeFor: string;
  onChangeForUpdate: (value: string) => void;
}

const paymentOptions = [
  {
    id: 'money' as PaymentMethod,
    label: 'Dinheiro',
    icon: Banknote,
    description: 'Pagamento na entrega',
  },
  {
    id: 'card' as PaymentMethod,
    label: 'Cartão',
    icon: CreditCard,
    description: 'Levamos a maquininha',
  },
  {
    id: 'pix' as PaymentMethod,
    label: 'PIX',
    icon: QrCode,
    description: 'Chave enviada após confirmar',
  },
];

export function PaymentSelector({ 
  selected, 
  onChange, 
  changeFor, 
  onChangeForUpdate 
}: PaymentSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Forma de Pagamento</h3>
      <div className="grid gap-3">
        {paymentOptions.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={selected === option.id ? 'payment-selected' : 'payment'}
            onClick={() => onChange(option.id)}
            className="h-auto flex-col items-start p-4"
          >
            <div className="flex w-full items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                selected === option.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                <option.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">{option.label}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Change For Input */}
      {selected === 'money' && (
        <div className="animate-slide-up rounded-xl bg-warning/10 p-4">
          <label className="text-sm font-medium text-warning">
            Troco para quanto?
          </label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="R$ 50,00"
            value={changeFor}
            onChange={(e) => onChangeForUpdate(e.target.value)}
            className="mt-2 border-warning/30 bg-card focus:border-warning"
          />
        </div>
      )}

      {selected === 'pix' && (
        <div className="animate-slide-up rounded-xl bg-blue-500/10 p-4">
          <p className="text-sm text-blue-600">
            💠 Você receberá a chave PIX no WhatsApp após confirmar o pedido.
          </p>
        </div>
      )}
    </div>
  );
}
