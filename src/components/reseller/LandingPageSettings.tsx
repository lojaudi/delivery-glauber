import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Globe, Upload, ExternalLink, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Reseller } from '@/types/reseller';

interface LandingPageSettingsProps {
  reseller: Reseller;
  onUpdate: () => void;
}

export function LandingPageSettings({ reseller, onUpdate }: LandingPageSettingsProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    slug: '',
    landing_page_title: 'Cardápio Digital Completo',
    landing_page_subtitle: 'Venda mais, pague menos taxas',
    landing_page_whatsapp: '',
    landing_page_email: '',
    landing_page_enabled: true,
    landing_page_logo: '',
  });

  useEffect(() => {
    if (reseller) {
      setFormData({
        slug: reseller.slug || '',
        landing_page_title: reseller.landing_page_title || 'Cardápio Digital Completo',
        landing_page_subtitle: reseller.landing_page_subtitle || 'Venda mais, pague menos taxas',
        landing_page_whatsapp: reseller.landing_page_whatsapp || '',
        landing_page_email: reseller.landing_page_email || reseller.email || '',
        landing_page_enabled: reseller.landing_page_enabled !== false,
        landing_page_logo: reseller.landing_page_logo || '',
      });
    }
  }, [reseller]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${reseller.id}-landing-logo.${fileExt}`;
      const filePath = `landing-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setFormData({ ...formData, landing_page_logo: publicUrl });
      
      toast({
        title: 'Logo enviada',
        description: 'A logo foi carregada com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar logo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.slug.trim()) {
      toast({
        title: 'Erro',
        description: 'O slug é obrigatório para a landing page',
        variant: 'destructive',
      });
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.slug)) {
      toast({
        title: 'Erro',
        description: 'O slug deve conter apenas letras minúsculas, números e hífens',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('resellers')
        .update({
          slug: formData.slug,
          landing_page_title: formData.landing_page_title,
          landing_page_subtitle: formData.landing_page_subtitle,
          landing_page_whatsapp: formData.landing_page_whatsapp,
          landing_page_email: formData.landing_page_email,
          landing_page_enabled: formData.landing_page_enabled,
          landing_page_logo: formData.landing_page_logo,
        })
        .eq('id', reseller.id);

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'As configurações da landing page foram atualizadas.',
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

  const landingUrl = formData.slug 
    ? `${window.location.origin}/lp/${formData.slug}` 
    : '';

  const handleCopyUrl = () => {
    if (landingUrl) {
      navigator.clipboard.writeText(landingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copiado!',
        description: 'O link da landing page foi copiado para a área de transferência.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Landing Page
              </CardTitle>
              <CardDescription>
                Configure sua página de vendas personalizada
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="landing_enabled" className="text-sm">
                Ativar
              </Label>
              <Switch
                id="landing_enabled"
                checked={formData.landing_page_enabled}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, landing_page_enabled: checked })
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL Preview */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL da página)</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                  {window.location.origin}/lp/
                </span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="minha-empresa"
                  className="rounded-l-none"
                />
              </div>
              {formData.slug && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUrl}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(landingUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Use apenas letras minúsculas, números e hífens
            </p>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo da Landing Page</Label>
            <div className="flex items-center gap-4">
              {formData.landing_page_logo ? (
                <div className="w-20 h-20 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                  <img 
                    src={formData.landing_page_logo} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
                  <Globe className="h-8 w-8" />
                </div>
              )}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Enviando...' : 'Enviar Logo'}
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG ou SVG. Recomendado: 200x200px
                </p>
              </div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landing_title">Título Principal</Label>
              <Input
                id="landing_title"
                value={formData.landing_page_title}
                onChange={(e) => setFormData({ ...formData, landing_page_title: e.target.value })}
                placeholder="Cardápio Digital Completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landing_subtitle">Subtítulo</Label>
              <Input
                id="landing_subtitle"
                value={formData.landing_page_subtitle}
                onChange={(e) => setFormData({ ...formData, landing_page_subtitle: e.target.value })}
                placeholder="Venda mais, pague menos taxas"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landing_whatsapp">WhatsApp para Contato</Label>
              <Input
                id="landing_whatsapp"
                value={formData.landing_page_whatsapp}
                onChange={(e) => setFormData({ ...formData, landing_page_whatsapp: e.target.value })}
                placeholder="5511999999999"
              />
              <p className="text-xs text-muted-foreground">
                Número com código do país, sem espaços
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="landing_email">E-mail para Contato</Label>
              <Input
                id="landing_email"
                type="email"
                value={formData.landing_page_email}
                onChange={(e) => setFormData({ ...formData, landing_page_email: e.target.value })}
                placeholder="contato@suaempresa.com"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
