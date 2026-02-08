import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  AlertTriangle,
  Key,
  Webhook,
  CreditCard,
  Settings,
  ArrowRight,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MercadoPagoGuide() {
  const { toast } = useToast();
  const webhookUrl = `https://olskejbqciwegcohnuwg.supabase.co/functions/v1/mercadopago-webhook`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência.`,
    });
  };

  return (
    <ResellerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Guia de Configuração do Mercado Pago</h1>
          <p className="text-muted-foreground mt-2">
            Siga este tutorial passo a passo para configurar a integração com o Mercado Pago e começar a receber pagamentos de assinaturas automaticamente.
          </p>
        </div>

        {/* Requisitos */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Requisitos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-amber-700 dark:text-amber-400">Antes de começar, você precisa:</p>
            <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-400 space-y-1">
              <li>Ter uma conta no Mercado Pago (Pessoa Física ou Jurídica)</li>
              <li>Conta verificada e ativa para receber pagamentos</li>
              <li>Acesso ao painel de desenvolvedor do Mercado Pago</li>
            </ul>
          </CardContent>
        </Card>

        {/* Passo 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="h-8 w-8 rounded-full flex items-center justify-center p-0 text-lg">1</Badge>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Obter as Credenciais de Produção
                </CardTitle>
                <CardDescription>Acesse o painel de desenvolvedor do Mercado Pago</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Acesse o painel de desenvolvedor</p>
                  <p className="text-sm text-muted-foreground">
                    Vá para <span className="font-mono bg-muted px-1 rounded">mercadopago.com.br/developers</span> e faça login com sua conta
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Navegue até "Suas integrações"</p>
                  <p className="text-sm text-muted-foreground">
                    No menu lateral, clique em "Suas integrações" ou acesse diretamente
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Crie uma nova aplicação (se necessário)</p>
                  <p className="text-sm text-muted-foreground">
                    Clique em "Criar aplicação", dê um nome (ex: "Sistema de Assinaturas") e selecione "Pagamentos online"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Copie as credenciais de PRODUÇÃO</p>
                  <p className="text-sm text-muted-foreground">
                    Na sua aplicação, vá em "Credenciais de produção" e copie:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                    <li>• <strong>Access Token:</strong> Começa com <span className="font-mono bg-muted px-1 rounded">APP_USR-...</span></li>
                    <li>• <strong>Public Key:</strong> Começa com <span className="font-mono bg-muted px-1 rounded">APP_USR-...</span> (mais curta)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button variant="outline" className="gap-2" asChild>
              <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" rel="noopener noreferrer">
                Abrir Painel do Mercado Pago
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  <p className="font-medium">Importante!</p>
                  <p>Use sempre as credenciais de <strong>PRODUÇÃO</strong>, não as de teste/sandbox. As credenciais de teste não processam pagamentos reais.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passo 2 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="h-8 w-8 rounded-full flex items-center justify-center p-0 text-lg">2</Badge>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Configurar o Webhook
                </CardTitle>
                <CardDescription>Necessário para receber notificações de pagamento</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O webhook permite que o sistema receba notificações automáticas quando um pagamento é aprovado, cancelado ou atualizado.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Na sua aplicação do Mercado Pago</p>
                  <p className="text-sm text-muted-foreground">
                    Acesse a aplicação que você criou e vá em "Webhooks" ou "Notificações IPN"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Adicione a URL do webhook</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Clique em "Adicionar URL" ou "Configurar notificações" e cole a URL abaixo:
                  </p>
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                    <code className="text-sm flex-1 break-all">{webhookUrl}</code>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(webhookUrl, 'URL do webhook')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Selecione os eventos</p>
                  <p className="text-sm text-muted-foreground">
                    Marque os seguintes eventos para receber notificações:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">Pagamentos (payment)</Badge>
                    <Badge variant="secondary">Assinaturas (subscription_preapproval)</Badge>
                    <Badge variant="secondary">Planos (plan)</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Salve as configurações</p>
                  <p className="text-sm text-muted-foreground">
                    Clique em "Salvar" para ativar as notificações
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passo 3 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="h-8 w-8 rounded-full flex items-center justify-center p-0 text-lg">3</Badge>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurar no Sistema
                </CardTitle>
                <CardDescription>Adicione as credenciais no painel de configurações</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Acesse as Configurações</p>
                  <p className="text-sm text-muted-foreground">
                    No menu lateral, clique em "Configurações"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Encontre a seção "Integração Mercado Pago"</p>
                  <p className="text-sm text-muted-foreground">
                    Role a página até encontrar o card de configuração do Mercado Pago
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Cole as credenciais</p>
                  <p className="text-sm text-muted-foreground">
                    Cole o Access Token e a Public Key nos campos correspondentes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Teste a conexão</p>
                  <p className="text-sm text-muted-foreground">
                    Clique em "Testar Conexão" para verificar se as credenciais estão corretas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Ative a integração</p>
                  <p className="text-sm text-muted-foreground">
                    Marque a opção "Habilitar integração" e clique em "Salvar"
                  </p>
                </div>
              </div>
            </div>

            <Button className="gap-2" asChild>
              <a href="/reseller/settings">
                Ir para Configurações
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Passo 4 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="h-8 w-8 rounded-full flex items-center justify-center p-0 text-lg">4</Badge>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Criar sua Primeira Assinatura
                </CardTitle>
                <CardDescription>Teste a integração com um restaurante</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Acesse os detalhes de um restaurante</p>
                  <p className="text-sm text-muted-foreground">
                    Vá em "Restaurantes" e clique em um restaurante para ver os detalhes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Encontre a seção "Assinatura Mercado Pago"</p>
                  <p className="text-sm text-muted-foreground">
                    Na página de detalhes, você verá um card para gerenciar a assinatura
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Gere o link de pagamento</p>
                  <p className="text-sm text-muted-foreground">
                    Informe o e-mail do pagador e clique em "Gerar Link de Pagamento"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Envie o link para o cliente</p>
                  <p className="text-sm text-muted-foreground">
                    Copie o link ou envie diretamente por WhatsApp/E-mail
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Como sei se o webhook está funcionando?</p>
              <p className="text-sm text-muted-foreground">
                Quando um cliente pagar a assinatura, o status do restaurante será atualizado automaticamente para "Ativo". Se isso não acontecer, verifique se a URL do webhook está correta.
              </p>
            </div>

            <div>
              <p className="font-medium">Posso usar credenciais de teste/sandbox?</p>
              <p className="text-sm text-muted-foreground">
                Não recomendamos. As credenciais de teste não processam pagamentos reais e podem causar comportamentos inesperados. Use sempre as credenciais de produção.
              </p>
            </div>

            <div>
              <p className="font-medium">O que acontece se o cliente cancelar a assinatura?</p>
              <p className="text-sm text-muted-foreground">
                O sistema receberá uma notificação via webhook e atualizará o status do restaurante automaticamente. Você também pode cancelar manualmente pelo painel.
              </p>
            </div>

            <div>
              <p className="font-medium">Quanto tempo leva para o pagamento ser confirmado?</p>
              <p className="text-sm text-muted-foreground">
                Pagamentos por Pix e cartão de crédito são confirmados em segundos. Boleto pode levar até 3 dias úteis após o pagamento.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResellerLayout>
  );
}
