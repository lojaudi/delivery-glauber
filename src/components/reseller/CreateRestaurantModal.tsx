import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ExternalLink, Copy, CheckCircle2, MessageCircle } from 'lucide-react';
import { useCreateRestaurant, useCurrentReseller } from '@/hooks/useReseller';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useCreateMPSubscription } from '@/hooks/useMercadoPago';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionStatus } from '@/types/reseller';
import { supabase } from '@/integrations/supabase/client';

interface CreateRestaurantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRestaurantModal({ open, onOpenChange }: CreateRestaurantModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [customMonthlyFee, setCustomMonthlyFee] = useState('99.90');
  const [payerEmail, setPayerEmail] = useState('');
  const [createSubscription, setCreateSubscription] = useState(false);
  const [createdInitPoint, setCreatedInitPoint] = useState<string | null>(null);
  const [createdRestaurant, setCreatedRestaurant] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  
  const createRestaurant = useCreateRestaurant();
  const createMPSubscription = useCreateMPSubscription();
  const { data: reseller } = useCurrentReseller();
  const { data: plans } = useSubscriptionPlans();
  const { toast } = useToast();

  const activePlans = plans?.filter(p => p.is_active) || [];
  const mpEnabled = (reseller as any)?.mp_integration_enabled && (reseller as any)?.mp_access_token;

  const selectedPlan = activePlans.find(p => p.id === selectedPlanId);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const getMonthlyFee = () => {
    if (selectedPlan) return selectedPlan.monthly_fee;
    return parseFloat(customMonthlyFee) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !slug.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e slug são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    if (createSubscription && !payerEmail.trim()) {
      toast({
        title: 'Erro',
        description: 'E-mail do pagador é obrigatório para criar assinatura',
        variant: 'destructive',
      });
      return;
    }

    try {
      const restaurant = await createRestaurant.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        owner_name: ownerName.trim() || null,
        phone: phone.trim() || null,
        monthly_fee: getMonthlyFee(),
        trial_days: 0,
        is_active: true,
        subscription_status: 'trial' as SubscriptionStatus,
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: null,
        plan_id: selectedPlanId || null,
      });

      // Create Mercado Pago subscription if enabled
      if (createSubscription && mpEnabled && reseller && restaurant?.id) {
        try {
          const result = await createMPSubscription.mutateAsync({
            restaurantId: restaurant.id,
            payerEmail: payerEmail.trim(),
            resellerId: reseller.id,
          });

          if (result.initPoint) {
            setCreatedInitPoint(result.initPoint);
            setCreatedRestaurant({ ...restaurant, owner_name: ownerName, phone });
            toast({
              title: 'Restaurante e assinatura criados!',
              description: 'Envie o link de pagamento ao cliente.',
            });
            return; // Don't close modal yet - show the payment link
          }
        } catch (mpError) {
          toast({
            title: 'Restaurante criado',
            description: 'Mas houve um erro ao criar a assinatura. Tente novamente nos detalhes.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Restaurante criado',
          description: 'O restaurante foi criado com sucesso.',
        });
      }

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao criar restaurante',
        description: error.message || 'Ocorreu um erro ao criar o restaurante.',
        variant: 'destructive',
      });
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const resetForm = () => {
    setName('');
    setSlug('');
    setOwnerName('');
    setPhone('');
    setSelectedPlanId('');
    setCustomMonthlyFee('99.90');
    setPayerEmail('');
    setCreateSubscription(false);
    setCreatedInitPoint(null);
    setCreatedRestaurant(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const copyPaymentLink = async () => {
    if (createdInitPoint) {
      await navigator.clipboard.writeText(createdInitPoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copiado!',
        description: 'Envie este link ao cliente para pagamento.',
      });
    }
  };

  const sendViaWhatsApp = async () => {
    if (!createdInitPoint || !createdRestaurant) return;
    
    const ownerNameForMessage = createdRestaurant.owner_name || 'cliente';
    const message = `Olá${ownerNameForMessage !== 'cliente' ? ` ${ownerNameForMessage}` : ''}! 👋

Segue o link para ativar sua assinatura do sistema *${createdRestaurant.name}*:

💳 *Link de Pagamento:*
${createdInitPoint}

💰 *Valor:* ${formatCurrency(getMonthlyFee())}/mês

Após a confirmação do pagamento, seu acesso será liberado automaticamente.

Qualquer dúvida, estou à disposição! 🙂`;
    
    const formattedPhone = createdRestaurant.phone ? createdRestaurant.phone.replace(/\D/g, '') : '';
    const phoneWithCountry = formattedPhone.length >= 10 ? `55${formattedPhone}` : formattedPhone;
    
    const whatsappUrl = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');

    // Log communication
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && createdRestaurant.id) {
        await supabase
          .from('communication_logs')
          .insert({
            restaurant_id: createdRestaurant.id,
            type: 'whatsapp',
            message: `Link de pagamento enviado via WhatsApp na criação do restaurante`,
            sent_by: user.id,
          });
      }
    } catch (error) {
      console.error('Erro ao registrar comunicação:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Show payment link after creation
  if (createdInitPoint) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Restaurante Criado!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie o link abaixo para o cliente realizar o pagamento da primeira mensalidade:
            </p>

            <div className="flex gap-2">
              <Input
                value={createdInitPoint}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyPaymentLink}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={sendViaWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar via WhatsApp
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <a href={createdInitPoint} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir
                  </a>
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Concluir
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Restaurante</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Restaurante</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Pizzaria do João"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL (slug)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/r/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="pizzaria-do-joao"
                required
              />
            </div>
          </div>

          {/* Contact Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Nome do Proprietário</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* Plan Selection */}
          {activePlans.length > 0 ? (
            <div className="space-y-2">
              <Label>Plano de Assinatura</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.monthly_fee)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlan && selectedPlan.description && (
                <p className="text-xs text-muted-foreground">
                  {selectedPlan.description}
                </p>
              )}
            </div>
          ) : null}

          {/* Custom pricing (shown when no plan selected or no plans exist) */}
          {(!selectedPlanId || selectedPlanId === 'custom' || activePlans.length === 0) && (
            <div className="space-y-2">
              <Label htmlFor="monthlyFee">Mensalidade (R$)</Label>
              <Input
                id="monthlyFee"
                type="number"
                step="0.01"
                min="0"
                value={customMonthlyFee}
                onChange={(e) => setCustomMonthlyFee(e.target.value)}
                required
              />
            </div>
          )}

          {mpEnabled && (
            <>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="createSubscription" className="font-medium">
                    Criar assinatura automática
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Gera link de pagamento via Mercado Pago
                  </p>
                </div>
                <Switch
                  id="createSubscription"
                  checked={createSubscription}
                  onCheckedChange={setCreateSubscription}
                />
              </div>

              {createSubscription && (
                <div className="space-y-2">
                  <Label htmlFor="payerEmail">E-mail do Pagador</Label>
                  <Input
                    id="payerEmail"
                    type="email"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="dono@restaurante.com"
                    required={createSubscription}
                  />
                  <p className="text-xs text-muted-foreground">
                    E-mail do dono do restaurante para receber cobranças
                  </p>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createRestaurant.isPending || createMPSubscription.isPending}
            >
              {(createRestaurant.isPending || createMPSubscription.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar Restaurante
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
