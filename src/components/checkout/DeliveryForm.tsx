import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeliveryFormData {
  name: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
}

interface DeliveryFormProps {
  data: DeliveryFormData;
  onChange: (data: DeliveryFormData) => void;
}

export function DeliveryForm({ data, onChange }: DeliveryFormProps) {
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    onChange({ ...data, phone: formatted });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Dados para Entrega</h3>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="phone">WhatsApp</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            value={data.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="mt-1.5"
            maxLength={15}
          />
        </div>

        <div>
          <Label htmlFor="street">Rua / Avenida</Label>
          <Input
            id="street"
            type="text"
            placeholder="Nome da rua"
            value={data.street}
            onChange={(e) => onChange({ ...data, street: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              type="text"
              placeholder="123"
              value={data.number}
              onChange={(e) => onChange({ ...data, number: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              type="text"
              placeholder="Seu bairro"
              value={data.neighborhood}
              onChange={(e) => onChange({ ...data, neighborhood: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
