import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ExternalLink, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Reseller } from '@/types/reseller';

interface MercadoPagoConfigProps {
  reseller: Reseller & {
    mp_access_token?: string | null;
    mp_public_key?: string | null;
    mp_integration_enabled?: boolean;
  };
  onUpdate: () => void;
}

export function MercadoPagoConfig({ reseller, onUpdate }: MercadoPagoConfigProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    mp_access_token: '',
    mp_public_key: '',
    mp_integration_enabled: false,
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`;

  useEffect(() => {
    if (reseller) {
      setFormData({
        mp_access_token: reseller.mp_access_token || '',
        mp_public_key: reseller.mp_public_key || '',
        mp_integration_enabled: reseller.mp_integration_enabled || false,
      });
    }
  }, [reseller]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('resellers')
        .update({
          mp_access_token: formData.mp_access_token || null,
          mp_public_key: formData.mp_public_key || null,
          mp_integration_enabled: formData.mp_integration_enabled,
        })
        .eq('id', reseller.id);

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'Integração com Mercado Pago atualizada.',
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.mp_access_token) {
      toast({
        title: 'Token não informado',
        description: 'Insira o Access Token para testar a conexão.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${formData.mp_access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult('success');
        toast({
          title: 'Conexão bem-sucedida!',
          description: `Conectado como: ${data.nickname || data.email}`,
        });
      } else {
        setTestResult('error');
        toast({
          title: 'Falha na conexão',
          description: 'Access Token inválido ou expirado.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setTestResult('error');
      toast({
        title: 'Erro ao testar',
        description: 'Não foi possível conectar ao Mercado Pago.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'URL copiada!',
      description: 'Cole esta URL nas configurações de webhook do Mercado Pago.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Integração Mercado Pago
              {formData.mp_integration_enabled && formData.mp_access_token ? (
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configure para automatizar cobranças de assinaturas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="mp_integration_enabled" className="text-base font-medium">
                Ativar integração
              </Label>
              <p className="text-sm text-muted-foreground">
                Habilita cobranças automáticas via Mercado Pago
              </p>
            </div>
            <Switch
              id="mp_integration_enabled"
              checked={formData.mp_integration_enabled}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, mp_integration_enabled: checked })
              }
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mp_access_token">Access Token</Label>
              <div className="flex gap-2">
                <Input
                  id="mp_access_token"
                  type="password"
                  value={formData.mp_access_token}
                  onChange={(e) => setFormData({ ...formData, mp_access_token: e.target.value })}
                  placeholder="APP_USR-..."
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing || !formData.mp_access_token}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : testResult === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : testResult === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    'Testar'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtenha em: Mercado Pago → Seu negócio → Configurações → Credenciais
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mp_public_key">Public Key (opcional)</Label>
              <Input
                id="mp_public_key"
                value={formData.mp_public_key}
                onChange={(e) => setFormData({ ...formData, mp_public_key: e.target.value })}
                placeholder="APP_USR-..."
                className="font-mono"
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyWebhookUrl}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure esta URL no painel do Mercado Pago para receber notificações automáticas.
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="p-0 h-auto"
              asChild
            >
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                Abrir painel do Mercado Pago
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
