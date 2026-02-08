import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2, MapPin, Loader2, ToggleLeft, ToggleRight, Truck, Clock, Save } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useDeliveryZones, DeliveryZone } from '@/hooks/useDeliveryZones';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useDemoGuard } from '@/hooks/useDemoGuard';

export default function DeliveryZones() {
  const { checkDemoMode } = useDemoGuard();
  const { zones, isLoading, createZone, updateZone, deleteZone } = useDeliveryZones();
  const { data: store, isLoading: isLoadingStore } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    fee: '',
    min_order_value: '',
    is_active: true,
  });

  // Form data for fixed fee and delivery times
  const [deliverySettings, setDeliverySettings] = useState({
    delivery_fee: '',
    delivery_time_min: '30',
    delivery_time_max: '45',
    min_order_value: '',
  });

  const deliveryFeeMode = store?.delivery_fee_mode || 'fixed';

  // Sync delivery settings with store config
  useEffect(() => {
    if (store) {
      setDeliverySettings({
        delivery_fee: store.delivery_fee?.toString() || '',
        delivery_time_min: store.delivery_time_min?.toString() || '30',
        delivery_time_max: store.delivery_time_max?.toString() || '45',
        min_order_value: store.min_order_value?.toString() || '',
      });
    }
  }, [store]);

  const handleOpenCreate = () => {
    setEditingZone(null);
    setFormData({ name: '', fee: '', min_order_value: '', is_active: true });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      fee: zone.fee.toString(),
      min_order_value: zone.min_order_value?.toString() || '',
      is_active: zone.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (checkDemoMode()) return;
    
    const payload = {
      name: formData.name.trim(),
      fee: parseFloat(formData.fee) || 0,
      min_order_value: formData.min_order_value ? parseFloat(formData.min_order_value) : null,
      is_active: formData.is_active,
      sort_order: editingZone ? editingZone.sort_order : zones.length,
    };

    if (editingZone) {
      await updateZone.mutateAsync({ id: editingZone.id, ...payload });
    } else {
      await createZone.mutateAsync(payload);
    }
    
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (checkDemoMode()) return;
    
    if (deleteId) {
      await deleteZone.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleModeChange = async (mode: string) => {
    if (checkDemoMode()) return;
    
    if (store?.id) {
      await updateStore.mutateAsync({ id: store.id, delivery_fee_mode: mode as 'fixed' | 'zones' });
    }
  };

  const handleSaveDeliverySettings = async () => {
    if (checkDemoMode()) return;
    if (!store?.id) return;
    
    try {
      await updateStore.mutateAsync({
        id: store.id,
        delivery_fee: parseFloat(deliverySettings.delivery_fee.replace(',', '.')) || 0,
        delivery_time_min: parseInt(deliverySettings.delivery_time_min) || 30,
        delivery_time_max: parseInt(deliverySettings.delivery_time_max) || 45,
        min_order_value: parseFloat(deliverySettings.min_order_value.replace(',', '.')) || 0,
      });
      toast({ title: 'Configurações de entrega salvas!' });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao salvar', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading || isLoadingStore) {
    return (
      <AdminLayout title="Taxas de Entrega">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Taxas de Entrega">
      <Helmet>
        <title>Taxas de Entrega - Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Tempo de Entrega - sempre visível */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tempo de Entrega
            </CardTitle>
            <CardDescription>
              Defina o tempo estimado para as entregas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tempo Mínimo (min)</Label>
                <Input
                  type="number"
                  value={deliverySettings.delivery_time_min}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, delivery_time_min: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo Máximo (min)</Label>
                <Input
                  type="number"
                  value={deliverySettings.delivery_time_max}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, delivery_time_max: e.target.value })}
                  placeholder="45"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Será exibido como: {deliverySettings.delivery_time_min || '30'}-{deliverySettings.delivery_time_max || '45'} min
            </p>
          </CardContent>
        </Card>

        {/* Modo de Taxa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Modo de Cobrança
            </CardTitle>
            <CardDescription>
              Escolha como será calculada a taxa de entrega
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={deliveryFeeMode} 
              onValueChange={handleModeChange}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Label 
                htmlFor="fixed" 
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${deliveryFeeMode === 'fixed' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              >
                <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                <div>
                  <p className="font-medium">Taxa Fixa</p>
                  <p className="text-sm text-muted-foreground">
                    Valor único para todas as entregas
                  </p>
                </div>
              </Label>
              
              <Label 
                htmlFor="zones" 
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${deliveryFeeMode === 'zones' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              >
                <RadioGroupItem value="zones" id="zones" className="mt-1" />
                <div>
                  <p className="font-medium">Por Bairro/Zona</p>
                  <p className="text-sm text-muted-foreground">
                    Taxa diferente para cada bairro ou região
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Configuração Taxa Fixa */}
        {deliveryFeeMode === 'fixed' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Taxa Fixa de Entrega
              </CardTitle>
              <CardDescription>
                Configure o valor único para todas as entregas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Taxa de Entrega (R$)</Label>
                  <Input
                    type="text"
                    value={deliverySettings.delivery_fee}
                    onChange={(e) => setDeliverySettings({ ...deliverySettings, delivery_fee: e.target.value })}
                    placeholder="5,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pedido Mínimo (R$)</Label>
                  <Input
                    type="text"
                    value={deliverySettings.min_order_value}
                    onChange={(e) => setDeliverySettings({ ...deliverySettings, min_order_value: e.target.value })}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">Deixe vazio ou 0 para não exigir</p>
                </div>
              </div>
              
              <Button 
                onClick={handleSaveDeliverySettings}
                disabled={updateStore.isPending}
                className="w-full sm:w-auto"
              >
                {updateStore.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Lista de Zonas */}
        {deliveryFeeMode === 'zones' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Zonas de Entrega</CardTitle>
                <CardDescription>
                  Configure a taxa para cada bairro ou região
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Zona
              </Button>
            </CardHeader>
            <CardContent>
              {zones.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma zona de entrega cadastrada</p>
                  <Button variant="link" onClick={handleOpenCreate}>
                    Adicionar primeira zona
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {zones.map((zone) => (
                    <div 
                      key={zone.id} 
                      className={`flex items-center justify-between p-4 rounded-xl border ${zone.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{zone.name}</p>
                            {!zone.is_active && (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              {formatCurrency(zone.fee)}
                            </span>
                            {zone.min_order_value && (
                              <span>• Pedido mín: {formatCurrency(zone.min_order_value)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => updateZone.mutate({ id: zone.id, is_active: !zone.is_active })}
                        >
                          {zone.is_active ? (
                            <ToggleRight className="h-5 w-5 text-primary" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenEdit(zone)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setDeleteId(zone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingZone ? 'Editar Zona' : 'Nova Zona de Entrega'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Bairro/Zona *</Label>
              <Input
                id="name"
                placeholder="Ex: Centro, Zona Sul, Jardim América"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Taxa de Entrega (R$) *</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min_order">Pedido Mínimo (R$)</Label>
                <Input
                  id="min_order"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional"
                  value={formData.min_order_value}
                  onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label htmlFor="is_active" className="cursor-pointer">
                Zona ativa
              </Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name.trim() || !formData.fee || createZone.isPending || updateZone.isPending}
            >
              {(createZone.isPending || updateZone.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingZone ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir zona de entrega?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A zona será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
