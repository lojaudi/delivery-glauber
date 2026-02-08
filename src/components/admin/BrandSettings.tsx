import { useState, useEffect } from 'react';
import { Loader2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';

interface BrandSettingsProps {
  className?: string;
}

export function BrandSettings({ className }: BrandSettingsProps) {
  const { data: store, isLoading } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    pwa_name: '',
    pwa_short_name: '',
  });

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        logo_url: store.logo_url || '',
        pwa_name: store.pwa_name || store.name || '',
        pwa_short_name: store.pwa_short_name || '',
      });
    }
  }, [store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id) return;

    try {
      await updateStore.mutateAsync({
        id: store.id,
        name: formData.name,
        logo_url: formData.logo_url || null,
        pwa_name: formData.pwa_name || formData.name,
        pwa_short_name: formData.pwa_short_name || formData.pwa_name?.slice(0, 12) || formData.name.slice(0, 12),
      });
      toast({ title: 'Marca atualizada com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading || !store) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-6">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
          <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Personalização da Marca
        </h3>

        {/* Store Name */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm text-muted-foreground">Nome do Restaurante</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do seu restaurante"
          />
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm text-muted-foreground">
            Logo (também será o ícone do app instalado)
          </Label>
          <ImageUpload
            bucket="store-assets"
            currentUrl={formData.logo_url}
            onUpload={(url) => setFormData({ ...formData, logo_url: url })}
            onRemove={() => setFormData({ ...formData, logo_url: '' })}
          />
          <p className="text-xs text-muted-foreground">
            Recomendado: imagem quadrada de pelo menos 512x512 pixels
          </p>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm text-muted-foreground">Preview</Label>
          <div className="p-4 rounded-lg border bg-background flex items-center gap-4">
            {formData.logo_url ? (
              <img 
                src={formData.logo_url} 
                alt="Logo" 
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div 
                className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold bg-primary"
              >
                {formData.name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              <p className="font-semibold">{formData.name || 'Nome do Restaurante'}</p>
            </div>
          </div>
        </div>

        {/* PWA Settings */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="font-medium text-sm">Configurações do App Instalável (PWA)</h4>
          
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground">
              Nome do App (exibido na tela inicial)
            </Label>
            <Input
              value={formData.pwa_name}
              onChange={(e) => setFormData({ ...formData, pwa_name: e.target.value })}
              placeholder="Nome completo do app"
              maxLength={45}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground">
              Nome Curto (abaixo do ícone)
            </Label>
            <Input
              value={formData.pwa_short_name}
              onChange={(e) => setFormData({ ...formData, pwa_short_name: e.target.value })}
              placeholder="Nome curto (máx. 12 caracteres)"
              maxLength={12}
            />
            <p className="text-xs text-muted-foreground">
              Aparece abaixo do ícone quando o app é instalado
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={updateStore.isPending}>
          {updateStore.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar Personalização'
          )}
        </Button>
      </div>
    </form>
  );
}
