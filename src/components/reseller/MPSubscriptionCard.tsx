import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  XCircle,
  Check,
  Loader2,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateMPSubscription, useCancelMPSubscription } from '@/hooks/useMercadoPago';
import { Restaurant } from '@/types/reseller';
import { WhatsAppButton } from './WhatsAppButton';

interface MPSubscriptionCardProps {
  restaurant: Restaurant & {
    phone?: string | null;
    owner_name?: string | null;
  };
  resellerId: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  authorized: { label: 'Autorizada', variant: 'default' },
  paused: { label: 'Pausada', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export function MPSubscriptionCard({ restaurant, resellerId }: MPSubscriptionCardProps) {
  const { toast } = useToast();
  const [payerEmail, setPayerEmail] = useState(restaurant.mp_payer_email || '');
  const [copied, setCopied] = useState(false);
  
  const createSubscription = useCreateMPSubscription();
  const cancelSubscription = useCancelMPSubscription();

  const handleCopyLink = async () => {
    if (!restaurant.mp_init_point) return;
    
    try {
      await navigator.clipboard.writeText(restaurant.mp_init_point);
      setCopied(true);
      toast({ title: 'Link copiado!', description: 'Envie para o cliente realizar o pagamento.' });
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

  const hasActiveSubscription = restaurant.mp_subscription_id && 
    restaurant.mp_subscription_status !== 'cancelled';

  const statusInfo = statusConfig[restaurant.mp_subscription_status || 'pending'] || statusConfig.pending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Assinatura Mercado Pago</CardTitle>
          </div>
          {restaurant.mp_subscription_id && (
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          )}
        </div>
        <CardDescription>
          Gerencie a assinatura recorrente deste restaurante
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info da assinatura atual */}
        {restaurant.mp_subscription_id && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">ID da Assinatura:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {restaurant.mp_subscription_id}
              </code>
            </div>
            {restaurant.mp_payer_email && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">E-mail do Pagador:</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {restaurant.mp_payer_email}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Link de pagamento */}
        {restaurant.mp_init_point && (
          <div className="space-y-3">
            <Label>Link de Pagamento</Label>
            <div className="flex gap-2">
              <Input 
                value={restaurant.mp_init_point} 
                readOnly 
                className="text-xs"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => window.open(restaurant.mp_init_point!, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Botão WhatsApp */}
            <div className="flex gap-2">
              <WhatsAppButton
                restaurantId={restaurant.id}
                phone={restaurant.phone || null}
                ownerName={restaurant.owner_name || null}
                restaurantName={restaurant.name}
                paymentLink={restaurant.mp_init_point}
                monthlyFee={restaurant.monthly_fee}
                className="flex-1"
              />
              <Button variant="outline" className="flex-1" asChild>
                <a href={`mailto:${restaurant.mp_payer_email || ''}?subject=Link de Pagamento - ${restaurant.name}&body=${encodeURIComponent(`Olá!\n\nSegue o link para ativar sua assinatura:\n${restaurant.mp_init_point}\n\nAtenciosamente,`)}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  E-mail
                </a>
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Envie o link via WhatsApp ou e-mail para o cliente autorizar a cobrança.
            </p>
          </div>
        )}

        {/* Criar nova assinatura */}
        {!hasActiveSubscription && (
          <div className="space-y-3 pt-2 border-t">
            <Label htmlFor="payer-email">E-mail do Pagador</Label>
            <div className="flex gap-2">
              <Input
                id="payer-email"
                type="email"
                placeholder="cliente@email.com"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
              />
              <Button 
                onClick={handleCreateSubscription}
                disabled={createSubscription.isPending}
              >
                {createSubscription.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Link
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Ações */}
        {hasActiveSubscription && (
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleCancelSubscription}
              disabled={cancelSubscription.isPending}
            >
              {cancelSubscription.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancelar Assinatura
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
