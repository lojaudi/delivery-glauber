import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  XCircle,
  Check,
  Loader2,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateMPSubscription, useCancelMPSubscription } from '@/hooks/useMercadoPago';
import { Restaurant, SubscriptionStatus } from '@/types/reseller';
import { WhatsAppButton } from './WhatsAppButton';
import { useUpdateRestaurant } from '@/hooks/useReseller';

interface BillingManagerProps {
  restaurant: Restaurant & {
    phone?: string | null;
    owner_name?: string | null;
    contact_email?: string | null;
  };
  resellerId: string;
  mpIntegrationEnabled: boolean;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Aguardando Pagamento', variant: 'secondary', icon: <Clock className="h-4 w-4" /> },
  authorized: { label: 'Pago e Ativo', variant: 'default', icon: <CheckCircle2 className="h-4 w-4" /> },
  paused: { label: 'Pausado', variant: 'outline', icon: <Clock className="h-4 w-4" /> },
  cancelled: { label: 'Cancelado', variant: 'destructive', icon: <Ban className="h-4 w-4" /> },
};

const subscriptionStatusConfig: Record<SubscriptionStatus, { label: string; color: string }> = {
  trial: { label: 'Período de Teste', color: 'bg-blue-500' },
  active: { label: 'Ativo', color: 'bg-green-500' },
  suspended: { label: 'Suspenso', color: 'bg-yellow-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
};

export function BillingManager({ restaurant, resellerId, mpIntegrationEnabled }: BillingManagerProps) {
  const { toast } = useToast();
  const [payerEmail, setPayerEmail] = useState(restaurant.mp_payer_email || restaurant.contact_email || '');
  const [copied, setCopied] = useState(false);
  
  const createSubscription = useCreateMPSubscription();
  const cancelSubscription = useCancelMPSubscription();
  const updateRestaurant = useUpdateRestaurant();

  const handleCopyLink = async () => {
    if (!restaurant.mp_init_point) return;
    
    try {
      await navigator.clipboard.writeText(restaurant.mp_init_point);
      setCopied(true);
      toast({ title: 'Link copiado!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleCreateSubscription = () => {
    if (!payerEmail.trim()) {
      toast({ title: 'E-mail obrigatório', description: 'Informe o e-mail do pagador.', variant: 'destructive' });
      return;
    }

    createSubscription.mutate({
      restaurantId: restaurant.id,
      payerEmail: payerEmail.trim(),
      resellerId,
    });
  };

  const handleCancelSubscription = () => {
    if (!confirm('Tem certeza que deseja cancelar a assinatura? O restaurante perderá o acesso.')) return;
    
    cancelSubscription.mutate({
      restaurantId: restaurant.id,
      resellerId,
    });
  };

  const handleStatusChange = async (status: SubscriptionStatus) => {
    try {
      await updateRestaurant.mutateAsync({
        id: restaurant.id,
        subscription_status: status,
        is_active: status === 'active' || status === 'trial',
      });
      toast({
        title: 'Status atualizado',
        description: 'O status da assinatura foi atualizado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const hasActiveSubscription = restaurant.mp_subscription_id && 
    restaurant.mp_subscription_status !== 'cancelled';

  const mpStatusInfo = statusConfig[restaurant.mp_subscription_status || 'pending'] || statusConfig.pending;
  const subStatus = subscriptionStatusConfig[restaurant.subscription_status];

  // Check if MP is configured
  if (!mpIntegrationEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cobrança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O Mercado Pago não está configurado. Configure em <strong>Configurações → Mercado Pago</strong> para gerar cobranças automáticas.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 space-y-3">
            <Label>Gerenciar Status Manualmente</Label>
            <Select 
              value={restaurant.subscription_status} 
              onValueChange={(v) => handleStatusChange(v as SubscriptionStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Período de Teste</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full ${subStatus.color} flex items-center justify-center`}>
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status da Assinatura</p>
                <p className="text-xl font-bold">{subStatus.label}</p>
                {restaurant.mp_subscription_status && (
                  <Badge variant={mpStatusInfo.variant} className="mt-1">
                    {mpStatusInfo.icon}
                    <span className="ml-1">MP: {mpStatusInfo.label}</span>
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Mensalidade</p>
              <p className="text-2xl font-bold text-primary">R$ {restaurant.monthly_fee.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Actions */}
      <Card>
        <CardHeader>
          <CardTitle>
            {hasActiveSubscription ? 'Gerenciar Cobrança' : 'Gerar Cobrança'}
          </CardTitle>
          <CardDescription>
            {hasActiveSubscription 
              ? 'Envie o link de pagamento ou gerencie a assinatura'
              : 'Gere um link de pagamento recorrente para o cliente'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gerar nova cobrança */}
          {!hasActiveSubscription && (
            <div className="space-y-4 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 text-primary">
                <Send className="h-5 w-5" />
                <span className="font-medium">Nova Cobrança Recorrente</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payer-email">E-mail do cliente (usado no Mercado Pago)</Label>
                <Input
                  id="payer-email"
                  type="email"
                  placeholder="cliente@email.com"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                />
              </div>
              
              <Button 
                className="w-full"
                size="lg"
                onClick={handleCreateSubscription}
                disabled={createSubscription.isPending}
              >
                {createSubscription.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Gerar Link de Pagamento
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Após gerar, você poderá enviar o link via WhatsApp ou E-mail
              </p>
            </div>
          )}

          {/* Link de pagamento existente */}
          {restaurant.mp_init_point && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Link de Pagamento</Label>
                {restaurant.mp_subscription_status === 'pending' && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Aguardando cliente autorizar
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input 
                  value={restaurant.mp_init_point} 
                  readOnly 
                  className="text-xs font-mono"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => window.open(restaurant.mp_init_point!, '_blank')}
                  title="Abrir link"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Enviar para cliente */}
              <div className="grid sm:grid-cols-2 gap-3">
                <WhatsAppButton
                  restaurantId={restaurant.id}
                  phone={restaurant.phone || null}
                  ownerName={restaurant.owner_name || null}
                  restaurantName={restaurant.name}
                  paymentLink={restaurant.mp_init_point}
                  monthlyFee={restaurant.monthly_fee}
                  className="w-full"
                  variant="default"
                />
                <Button variant="outline" asChild>
                  <a href={`mailto:${payerEmail || restaurant.contact_email || ''}?subject=Link de Pagamento - ${restaurant.name}&body=${encodeURIComponent(`Olá!\n\nSegue o link para ativar sua assinatura do sistema:\n\n${restaurant.mp_init_point}\n\nApós autorizar, seu acesso será liberado automaticamente.\n\nQualquer dúvida, estou à disposição!`)}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar por E-mail
                  </a>
                </Button>
              </div>

              {restaurant.mp_subscription_status === 'pending' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    O cliente precisa clicar no link e autorizar a cobrança no Mercado Pago. 
                    Após autorizar, o acesso será <strong>liberado automaticamente</strong>.
                  </AlertDescription>
                </Alert>
              )}

              {restaurant.mp_subscription_status === 'authorized' && (
                <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Assinatura ativa! As cobranças serão feitas automaticamente todo mês.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Ações adicionais */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-2 block">Alterar status manualmente</Label>
              <Select 
                value={restaurant.subscription_status} 
                onValueChange={(v) => handleStatusChange(v as SubscriptionStatus)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Período de Teste</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {hasActiveSubscription && (
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleCancelSubscription}
                  disabled={cancelSubscription.isPending}
                >
                  {cancelSubscription.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Cancelar Assinatura MP
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info da assinatura */}
      {restaurant.mp_subscription_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Informações da Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID Mercado Pago:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{restaurant.mp_subscription_id}</code>
            </div>
            {restaurant.mp_payer_email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">E-mail do Pagador:</span>
                <span>{restaurant.mp_payer_email}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
