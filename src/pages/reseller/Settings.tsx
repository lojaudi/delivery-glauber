import { useState, useEffect } from 'react';
import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useCurrentReseller } from '@/hooks/useReseller';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MercadoPagoConfig } from '@/components/reseller/MercadoPagoConfig';
import { SubscriptionPlansManager } from '@/components/reseller/SubscriptionPlansManager';
import { ColorSettings } from '@/components/reseller/ColorSettings';
import { LandingPageSettings } from '@/components/reseller/LandingPageSettings';
import { useDemoGuard } from '@/hooks/useDemoGuard';

function SettingsContent() {
  const { data: reseller, isLoading, refetch } = useCurrentReseller();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const { checkDemoMode } = useDemoGuard();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
  });

  useEffect(() => {
    if (reseller) {
      setFormData({
        name: reseller.name || '',
        email: reseller.email || '',
        phone: reseller.phone || '',
        company_name: reseller.company_name || '',
      });
    }
  }, [reseller]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkDemoMode()) return;
    if (!reseller) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('resellers')
        .update(formData)
        .eq('id', reseller.id);

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'Suas configurações foram atualizadas com sucesso.',
      });
      
      refetch();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações e integrações
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações de contato e empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Nome da sua empresa"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {reseller && (
        <ColorSettings 
          reseller={reseller as any} 
          onUpdate={refetch} 
        />
      )}

      {reseller && (
        <LandingPageSettings 
          reseller={reseller as any} 
          onUpdate={refetch} 
        />
      )}

      <SubscriptionPlansManager />

      {reseller && (
        <MercadoPagoConfig 
          reseller={reseller as any} 
          onUpdate={refetch} 
        />
      )}
    </div>
  );
}

export default function ResellerSettings() {
  return (
    <ResellerLayout title="Configurações">
      <SettingsContent />
    </ResellerLayout>
  );
}
