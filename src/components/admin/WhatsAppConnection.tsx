import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Wifi, WifiOff, QrCode, Loader2, RefreshCw, Trash2, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRestaurant } from '@/hooks/useAdminRestaurant';
import { useStoreConfig } from '@/hooks/useStore';

type ConnectionState = 'idle' | 'creating' | 'loading_qr' | 'waiting_scan' | 'connected' | 'error';

export function WhatsAppConnection() {
  const { restaurantId } = useAdminRestaurant();
  const { data: store } = useStoreConfig();
  const { toast } = useToast();
  
  const [state, setState] = useState<ConnectionState>('idle');
  const [instanceName, setInstanceName] = useState('');
  const [customName, setCustomName] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [polling, setPolling] = useState(false);

  const existingInstance = (store as any)?.evolution_instance_name || '';

  // Check status on mount if instance exists
  useEffect(() => {
    if (existingInstance) {
      setInstanceName(existingInstance);
      checkStatus(existingInstance);
    }
  }, [existingInstance]);

  // Poll status while waiting for QR scan
  useEffect(() => {
    if (!polling || !instanceName) return;
    
    const interval = setInterval(() => {
      checkStatus(instanceName);
    }, 5000);

    return () => clearInterval(interval);
  }, [polling, instanceName]);

  const callEvolutionApi = async (action: string, instance_name?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Não autenticado');

    const res = await supabase.functions.invoke('evolution-api', {
      body: {
        action,
        instance_name: instance_name || instanceName,
        restaurant_id: restaurantId,
      },
    });

    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  const checkStatus = useCallback(async (name: string) => {
    try {
      const data = await callEvolutionApi('status', name);
      if (data.connected) {
        setState('connected');
        setPolling(false);
        setQrCode(null);
      } else if (state === 'waiting_scan') {
        // Still waiting, keep polling
      } else {
        setState('idle');
      }
    } catch (err) {
      // Instance may not exist yet
      setState('idle');
    }
  }, [restaurantId, state]);

  const handleCreate = async () => {
    if (!restaurantId) return;
    setState('creating');
    setErrorMsg('');
    
    try {
      const name = customName.trim() || undefined;
      const data = await callEvolutionApi('create', name);
      
      setInstanceName(data.instance_name);
      
      if (data.qrcode) {
        setQrCode(data.qrcode);
        setState('waiting_scan');
        setPolling(true);
      } else {
        // Fetch QR code separately
        await fetchQrCode(data.instance_name);
      }
      
      toast({ title: 'Instância criada!', description: 'Escaneie o QR Code com seu WhatsApp' });
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message || 'Erro ao criar instância');
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const fetchQrCode = async (name?: string) => {
    setState('loading_qr');
    try {
      const data = await callEvolutionApi('qrcode', name || instanceName);
      if (data.qrcode) {
        setQrCode(data.qrcode);
        setState('waiting_scan');
        setPolling(true);
      } else {
        setState('error');
        setErrorMsg('QR Code não disponível. Tente novamente.');
      }
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message || 'Erro ao obter QR Code');
    }
  };

  const handleDisconnect = async () => {
    try {
      await callEvolutionApi('disconnect');
      setState('idle');
      setInstanceName('');
      setQrCode(null);
      setPolling(false);
      toast({ title: 'WhatsApp desconectado' });
    } catch (err: any) {
      toast({ title: 'Erro ao desconectar', description: err.message, variant: 'destructive' });
    }
  };

  const handleRefreshQr = () => {
    fetchQrCode();
  };

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          WhatsApp - Notificações Automáticas
        </h3>
        {state === 'connected' && (
          <Badge variant="open" className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            Conectado
          </Badge>
        )}
        {(state === 'idle' && existingInstance) && (
          <Badge variant="closed" className="flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Desconectado
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Conecte seu WhatsApp para receber notificações automáticas a cada novo pedido.
      </p>

      {/* Connected State */}
      {state === 'connected' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg border border-secondary/20">
            <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">WhatsApp conectado</p>
              <p className="text-xs text-muted-foreground truncate">
                Instância: {instanceName}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => checkStatus(instanceName)}
              className="flex-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Verificar Status
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDisconnect}
              className="flex-1"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Desconectar
            </Button>
          </div>
        </div>
      )}

      {/* QR Code Display */}
      {(state === 'waiting_scan' || state === 'loading_qr') && (
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
            {state === 'loading_qr' ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : qrCode ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Smartphone className="h-4 w-4" />
                  Escaneie com seu WhatsApp
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <img 
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                    alt="QR Code WhatsApp" 
                    className="w-56 h-56 object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar um aparelho → Escaneie o código
                </p>
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Aguardando leitura do QR Code...
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">QR Code não disponível</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshQr} className="flex-1">
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar QR Code
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{errorMsg}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setState('idle')}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Idle / Setup State */}
      {(state === 'idle' || state === 'creating') && !existingInstance && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Nome da instância (opcional)
            </label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
              placeholder="Ex: meu-restaurante"
              className="mt-1"
              disabled={state === 'creating'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Se não preencher, será gerado automaticamente.
            </p>
          </div>

          <Button 
            onClick={handleCreate} 
            disabled={state === 'creating'}
            className="w-full"
          >
            {state === 'creating' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando instância...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Conectar WhatsApp
              </>
            )}
          </Button>
        </div>
      )}

      {/* Idle with existing instance but disconnected */}
      {state === 'idle' && existingInstance && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Instância <strong>{existingInstance}</strong> está desconectada.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => fetchQrCode()} className="flex-1" size="sm">
              <QrCode className="h-3 w-3 mr-1" />
              Reconectar
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} size="sm" className="flex-1">
              <Trash2 className="h-3 w-3 mr-1" />
              Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
