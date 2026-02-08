import { useState } from 'react';
import { Loader2, Store, Phone, CreditCard, Truck, ChevronRight, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useUpdateStoreConfig, StoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';

interface SetupWizardProps {
  store: StoreConfig;
  open: boolean;
  onComplete: () => void;
}

const steps = [
  { id: 'info', title: 'Informações', icon: Store },
  { id: 'contact', title: 'Contato', icon: Phone },
  { id: 'payment', title: 'Pagamento', icon: CreditCard },
  { id: 'delivery', title: 'Entrega', icon: Truck },
];

export function SetupWizard({ store, open, onComplete }: SetupWizardProps) {
  const { toast } = useToast();
  const updateStore = useUpdateStoreConfig();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    cover_url: '',
    address: '',
    phone_whatsapp: '',
    pix_key_type: 'Telefone',
    pix_key: '',
    delivery_fee: '5',
    delivery_time_min: '30',
    delivery_time_max: '45',
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome do seu restaurante',
        variant: 'destructive',
      });
      setCurrentStep(0);
      return;
    }

    try {
      await updateStore.mutateAsync({
        id: store.id,
        name: formData.name.trim(),
        logo_url: formData.logo_url || null,
        cover_url: formData.cover_url || null,
        address: formData.address || null,
        phone_whatsapp: formData.phone_whatsapp || null,
        pix_key_type: formData.pix_key_type,
        pix_key: formData.pix_key || null,
        delivery_fee: parseFloat(formData.delivery_fee.replace(',', '.')) || 5,
        delivery_time_min: parseInt(formData.delivery_time_min) || 30,
        delivery_time_max: parseInt(formData.delivery_time_max) || 45,
      });

      toast({
        title: '🎉 Configuração concluída!',
        description: 'Seu restaurante está pronto para receber pedidos.',
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome do Restaurante *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Pizzaria do João"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Logo</label>
              <ImageUpload
                bucket="store-assets"
                currentUrl={formData.logo_url}
                onUpload={(url) => setFormData({ ...formData, logo_url: url })}
                onRemove={() => setFormData({ ...formData, logo_url: '' })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Imagem de Capa</label>
              <ImageUpload
                bucket="store-assets"
                currentUrl={formData.cover_url}
                onUpload={(url) => setFormData({ ...formData, cover_url: url })}
                onRemove={() => setFormData({ ...formData, cover_url: '' })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Endereço</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">WhatsApp</label>
              <Input
                value={formData.phone_whatsapp}
                onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })}
                placeholder="11999999999"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Apenas números, com DDD. Os clientes usarão para contato.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Tipo da Chave PIX</label>
              <Select
                value={formData.pix_key_type}
                onValueChange={(value) => setFormData({ ...formData, pix_key_type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="CNPJ">CNPJ</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Aleatória">Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Chave PIX</label>
              <Input
                value={formData.pix_key}
                onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                placeholder="Sua chave PIX"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Taxa de Entrega (R$)</label>
              <Input
                value={formData.delivery_fee}
                onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                placeholder="5,00"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Tempo Mínimo (min)</label>
                <Input
                  value={formData.delivery_time_min}
                  onChange={(e) => setFormData({ ...formData, delivery_time_min: e.target.value })}
                  placeholder="30"
                  className="mt-1"
                  type="number"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Tempo Máximo (min)</label>
                <Input
                  value={formData.delivery_time_max}
                  onChange={(e) => setFormData({ ...formData, delivery_time_max: e.target.value })}
                  placeholder="45"
                  className="mt-1"
                  type="number"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo estimado de entrega que aparecerá para os clientes.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg" hideCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Configure seu Restaurante</DialogTitle>
              <DialogDescription>
                Vamos configurar as informações básicas do seu negócio
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-secondary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className="text-xs font-medium">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[240px]">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            Voltar
          </Button>
          <Button onClick={handleNext} disabled={updateStore.isPending}>
            {updateStore.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                Concluir
                <Check className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}