import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, RefreshCw, ChefHat, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';

export function SecuritySettings() {
  const { data: store, isLoading } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();
  
  const [kitchenPinEnabled, setKitchenPinEnabled] = useState(false);
  const [kitchenPin, setKitchenPin] = useState('');
  const [showKitchenPin, setShowKitchenPin] = useState(false);

  useEffect(() => {
    if (store) {
      loadSecuritySettings();
    }
  }, [store]);

  const loadSecuritySettings = async () => {
    if (!store?.id) return;
    
    const { data, error } = await supabase
      .from('store_config')
      .select('kitchen_pin, kitchen_pin_enabled')
      .eq('id', store.id)
      .single();
    
    if (!error && data) {
      setKitchenPinEnabled(data.kitchen_pin_enabled || false);
      setKitchenPin(data.kitchen_pin || '');
    }
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setKitchenPin(pin);
    toast({ title: 'PIN gerado!', description: `Novo PIN: ${pin}` });
  };

  const handleSaveKitchenPin = async () => {
    if (!store?.id) return;
    
    if (kitchenPinEnabled && kitchenPin.length < 4) {
      toast({
        title: 'PIN inválido',
        description: 'O PIN deve ter no mínimo 4 dígitos',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('store_config')
        .update({
          kitchen_pin: kitchenPinEnabled ? kitchenPin : null,
          kitchen_pin_enabled: kitchenPinEnabled
        })
        .eq('id', store.id);
      
      if (error) throw error;
      
      toast({ title: 'Configurações de segurança salvas!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handlePinChange = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '').slice(0, 6);
    setKitchenPin(numbersOnly);
  };

  if (isLoading) return null;

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-6">
      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
        <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        Segurança de Acesso
      </h3>

      {/* Kitchen PIN Section */}
      <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="font-medium text-foreground">PIN da Cozinha</p>
              <p className="text-xs text-muted-foreground">
                Exigir PIN para acessar a tela da cozinha
              </p>
            </div>
          </div>
          <Switch 
            checked={kitchenPinEnabled}
            onCheckedChange={setKitchenPinEnabled}
          />
        </div>

        {kitchenPinEnabled && (
          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKitchenPin ? 'text' : 'password'}
                  value={kitchenPin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="Digite o PIN (4-6 dígitos)"
                  className="pr-10 font-mono text-lg tracking-widest"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowKitchenPin(!showKitchenPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKitchenPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={generateRandomPin}
                title="Gerar PIN aleatório"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este PIN será usado por toda a equipe da cozinha para acessar o painel.
            </p>
          </div>
        )}
      </div>

      {/* Waiter PIN Info */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="font-medium text-foreground">PIN dos Garçons</p>
            <p className="text-xs text-muted-foreground">
              Configure o PIN de cada garçom na página de Garçons
            </p>
          </div>
        </div>
      </div>

      <Button 
        onClick={handleSaveKitchenPin}
        className="w-full"
        disabled={updateStore.isPending}
      >
        Salvar Configurações de Segurança
      </Button>
    </div>
  );
}
