import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Store, Phone, CreditCard, Truck, ChevronRight, Check, Sparkles, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';

const steps = [
  { id: 'info', title: 'Informações', icon: Store },
  { id: 'contact', title: 'Contato', icon: Phone },
  { id: 'payment', title: 'Pagamento', icon: CreditCard },
  { id: 'delivery', title: 'Entrega', icon: Truck },
];

const AdminSetup = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const basePath = slug ? `/r/${slug}/admin` : '/admin';
  const { data: store, isLoading } = useStoreConfig();
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

  // Pre-populate form with existing data
  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        logo_url: store.logo_url || '',
        cover_url: store.cover_url || '',
        address: store.address || '',
        phone_whatsapp: store.phone_whatsapp || '',
        pix_key_type: store.pix_key_type || 'Telefone',
        pix_key: store.pix_key || '',
        delivery_fee: store.delivery_fee?.toString() || '5',
        delivery_time_min: store.delivery_time_min?.toString() || '30',
        delivery_time_max: store.delivery_time_max?.toString() || '45',
      });
    }
  }, [store]);

  const handleNavigateBack = () => {
    navigate(basePath);
  };

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
    } else {
      handleNavigateBack();
    }
  };

  const handleComplete = async () => {
    if (!store?.id) return;

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

      navigate(basePath);
      return;

      
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Configurar Restaurante - {store?.name || 'Admin'}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center gap-3 bg-background px-4 py-4 border-b border-border">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNavigateBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Configure seu Restaurante</h1>
              <p className="text-xs text-muted-foreground">Vamos configurar as informações básicas</p>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* Steps indicator */}
          <div className="flex justify-between overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={`flex flex-col items-center gap-1 transition-colors min-w-[60px] ${
                    isActive ? 'text-primary' : isCompleted ? 'text-secondary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-[10px] font-medium">{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Step content */}
          <div className="bg-card rounded-xl p-6 shadow-card min-h-[300px]">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
              type="button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={updateStore.isPending}
              className="flex-1"
              type="button"
            >
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
        </div>
      </div>
    </>
  );
};

export default AdminSetup;
