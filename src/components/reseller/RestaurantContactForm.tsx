import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Mail, Loader2, Save } from 'lucide-react';
import { useUpdateRestaurant } from '@/hooks/useReseller';
import { useToast } from '@/hooks/use-toast';

interface RestaurantContactFormProps {
  restaurantId: string;
  initialData: {
    owner_name?: string | null;
    phone?: string | null;
    contact_email?: string | null;
  };
}

export function RestaurantContactForm({ restaurantId, initialData }: RestaurantContactFormProps) {
  const [ownerName, setOwnerName] = useState(initialData.owner_name || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [contactEmail, setContactEmail] = useState(initialData.contact_email || '');
  const [hasChanges, setHasChanges] = useState(false);
  
  const updateRestaurant = useUpdateRestaurant();
  const { toast } = useToast();

  useEffect(() => {
    const changed = 
      ownerName !== (initialData.owner_name || '') ||
      phone !== (initialData.phone || '') ||
      contactEmail !== (initialData.contact_email || '');
    setHasChanges(changed);
  }, [ownerName, phone, contactEmail, initialData]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
  };

  const handleSave = async () => {
    try {
      await updateRestaurant.mutateAsync({
        id: restaurantId,
        owner_name: ownerName || null,
        phone: phone || null,
        contact_email: contactEmail || null,
      });
      
      toast({ title: 'Dados de contato salvos!' });
      setHasChanges(false);
    } catch (error: any) {
      toast({ 
        title: 'Erro ao salvar', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Dados de Contato
        </CardTitle>
        <CardDescription>
          Informações do responsável pelo restaurante
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="owner_name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome do Proprietário
            </Label>
            <Input
              id="owner_name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="João da Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone / WhatsApp
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            E-mail de Contato
          </Label>
          <Input
            id="contact_email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contato@restaurante.com"
          />
          <p className="text-xs text-muted-foreground">
            E-mail para comunicações (pode ser diferente do e-mail de cobrança)
          </p>
        </div>

        {hasChanges && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={updateRestaurant.isPending}>
              {updateRestaurant.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}