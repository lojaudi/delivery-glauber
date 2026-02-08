import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Loader2, MessageCircle, CreditCard, ArrowRight, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLandingCheckout } from '@/hooks/useLandingCheckout';

interface Plan {
  id: string;
  name: string;
  monthly_fee: number;
  setup_fee?: number;
  trial_days: number;
  features: string[];
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  primaryColor: string;
  resellerId: string;
  whatsappLink: string;
  mpEnabled?: boolean;
}

type CheckoutStep = 'info' | 'payment' | 'success';

export function CheckoutModal({ 
  isOpen, 
  onClose, 
  plan, 
  primaryColor, 
  resellerId, 
  whatsappLink,
  mpEnabled = false 
}: CheckoutModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<CheckoutStep>('info');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: '',
  });

  const checkout = useLandingCheckout();

  const businessTypes = [
    'Hamburgueria',
    'Pizzaria',
    'Restaurante',
    'Lanchonete',
    'Doceria/Confeitaria',
    'Bar',
    'Cafeteria',
    'Food Truck',
    'Marmitaria',
    'Outro',
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.businessName) {
      toast({
        title: 'Preencha todos os campos',
        description: 'Nome, email, telefone e nome do estabelecimento são obrigatórios.',
        variant: 'destructive',
      });
      return false;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmitInfo = () => {
    if (!validateForm()) return;
    setStep('payment');
  };

  const handleMercadoPagoCheckout = async () => {
    if (!plan || !resellerId || resellerId === 'demo') {
      toast({
        title: 'Pagamento indisponível',
        description: 'Entre em contato via WhatsApp para finalizar sua contratação.',
        variant: 'destructive',
      });
      return;
    }

    // Check if plan has a valid ID (not mock IDs)
    if (['basic', 'professional', 'enterprise'].includes(plan.id)) {
      toast({
        title: 'Plano de demonstração',
        description: 'Este é um plano de demonstração. Entre em contato via WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    checkout.mutate({
      resellerId,
      planId: plan.id,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      businessName: formData.businessName,
      businessType: formData.businessType,
    });
  };

  const handleWhatsAppCheckout = () => {
    const message = encodeURIComponent(
      `Olá! Tenho interesse no plano ${plan?.name}.\n\n` +
      `*Dados do contato:*\n` +
      `Nome: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Telefone: ${formData.phone}\n` +
      `Estabelecimento: ${formData.businessName}\n` +
      `Tipo: ${formData.businessType || 'Não informado'}`
    );
    
    const whatsappUrl = whatsappLink.includes('?') 
      ? whatsappLink.replace(/text=.*/, `text=${message}`)
      : `${whatsappLink}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    setStep('success');
  };

  const resetModal = () => {
    setStep('info');
    setFormData({
      name: '',
      email: '',
      phone: '',
      businessName: '',
      businessType: '',
    });
    onClose();
  };

  if (!plan) return null;

  const totalAmount = (plan.setup_fee || 0) + plan.monthly_fee;
  const isValidReseller = resellerId && resellerId !== 'demo';
  const isValidPlan = plan.id && !['basic', 'professional', 'enterprise'].includes(plan.id);
  const canUseMercadoPago = mpEnabled && isValidReseller && isValidPlan;

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 'info' && 'Seus Dados'}
            {step === 'payment' && 'Finalizar Contratação'}
            {step === 'success' && 'Quase lá!'}
          </DialogTitle>
        </DialogHeader>

        {/* Plan Summary */}
        {step !== 'success' && (
          <div 
            className="p-4 rounded-xl mb-4"
            style={{ backgroundColor: `hsl(${primaryColor} / 0.1)` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{plan.name}</p>
                {plan.trial_days > 0 && (
                  <p className="text-sm" style={{ color: `hsl(${primaryColor})` }}>
                    {plan.trial_days} dias grátis
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: `hsl(${primaryColor})` }}>
                  R$ {plan.monthly_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">/mês</p>
              </div>
            </div>
            {(plan.setup_fee && plan.setup_fee > 0) && (
              <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de ativação:</span>
                <span className="font-medium">
                  R$ {plan.setup_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step: Info */}
        {step === 'info' && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phone">WhatsApp *</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="businessName">Nome do estabelecimento *</Label>
              <Input
                id="businessName"
                placeholder="Nome do seu negócio"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="businessType">Tipo de negócio</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => handleInputChange('businessType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full py-6 text-base font-semibold mt-4"
              style={{ backgroundColor: `hsl(${primaryColor})` }}
              onClick={handleSubmitInfo}
            >
              Continuar
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step: Payment */}
        {step === 'payment' && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-center">
              Escolha como deseja finalizar sua contratação:
            </p>

            {/* Mercado Pago Option */}
            {canUseMercadoPago && (
              <>
                <Button
                  className="w-full py-6 text-base font-semibold"
                  style={{ backgroundColor: `hsl(${primaryColor})` }}
                  onClick={handleMercadoPagoCheckout}
                  disabled={checkout.isPending}
                >
                  {checkout.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-5 w-5" />
                  )}
                  {checkout.isPending ? 'Gerando pagamento...' : 'Pagar com Cartão ou PIX'}
                </Button>

                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    <span>Cartão</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <QrCode className="h-4 w-4" />
                    <span>PIX</span>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>Total: <strong>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
              </>
            )}

            {/* WhatsApp Option */}
            <Button
              className={`w-full py-6 text-base font-semibold ${canUseMercadoPago ? 'bg-green-600 hover:bg-green-700' : ''}`}
              style={!canUseMercadoPago ? { backgroundColor: `hsl(${primaryColor})` } : undefined}
              onClick={handleWhatsAppCheckout}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Finalizar via WhatsApp
            </Button>

            {!canUseMercadoPago && (
              <p className="text-xs text-center text-muted-foreground">
                Nossa equipe entrará em contato para finalizar sua contratação
              </p>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep('info')}
            >
              Voltar
            </Button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: `hsl(${primaryColor} / 0.1)` }}
            >
              <Check 
                className="h-10 w-10"
                style={{ color: `hsl(${primaryColor})` }}
              />
            </div>
            
            <h3 className="text-xl font-bold">Recebemos seus dados!</h3>
            <p className="text-muted-foreground">
              Nossa equipe entrará em contato em breve pelo WhatsApp para finalizar sua contratação e ativar seu sistema.
            </p>

            <Button
              className="w-full py-6 text-base font-semibold mt-4"
              style={{ backgroundColor: `hsl(${primaryColor})` }}
              onClick={resetModal}
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
