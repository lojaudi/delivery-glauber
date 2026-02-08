import { useState, useEffect, useCallback } from 'react';
import { Loader2, Store, Phone, CreditCard, MapPin, Clock, MessageSquare, CalendarClock, Send } from 'lucide-react';
import { SecuritySettings } from '@/components/admin/SecuritySettings';
import { TimezoneSettings } from '@/components/admin/TimezoneSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BrandSettings } from '@/components/admin/BrandSettings';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useBusinessHours, useUpdateBusinessHour, getDayName, BusinessHour, isStoreCurrentlyOpen } from '@/hooks/useBusinessHours';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useDemoGuard } from '@/hooks/useDemoGuard';

const AdminSettings = () => {
  const { checkDemoMode, canWrite } = useDemoGuard();
  const {
    data: store,
    isLoading
  } = useStoreConfig();
  const {
    data: hours,
    isLoading: isLoadingHours
  } = useBusinessHours();
  const updateStore = useUpdateStoreConfig();
  const updateHour = useUpdateBusinessHour();
  const {
    toast
  } = useToast();
  const [editingHourId, setEditingHourId] = useState<string | null>(null);
  const [editHourData, setEditHourData] = useState({
    open_time: '',
    close_time: ''
  });
  const [manualOverride, setManualOverride] = useState(false);
  const [formData, setFormData] = useState({
    phone_whatsapp: '',
    pix_key: '',
    pix_key_type: 'Telefone',
    pix_message: '',
    msg_order_accepted: '',
    msg_order_preparing: '',
    msg_order_delivery: '',
    msg_order_completed: '',
    is_open: true,
    address: ''
  });
  
  useEffect(() => {
    if (store) {
      setFormData({
        phone_whatsapp: store.phone_whatsapp || '',
        pix_key: store.pix_key || '',
        pix_key_type: store.pix_key_type || 'Telefone',
        pix_message: store.pix_message || '',
        msg_order_accepted: store.msg_order_accepted || '',
        msg_order_preparing: store.msg_order_preparing || '',
        msg_order_delivery: store.msg_order_delivery || '',
        msg_order_completed: store.msg_order_completed || '',
        is_open: store.is_open ?? true,
        address: store.address || ''
      });
    }
  }, [store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkDemoMode()) return;
    if (!store?.id) {
      toast({
        title: 'Erro',
        description: 'Configuração não encontrada',
        variant: 'destructive'
      });
      return;
    }
    try {
      await updateStore.mutateAsync({
        id: store.id,
        phone_whatsapp: formData.phone_whatsapp || null,
        pix_key: formData.pix_key || null,
        pix_key_type: formData.pix_key_type || null,
        pix_message: formData.pix_message || null,
        msg_order_accepted: formData.msg_order_accepted || null,
        msg_order_preparing: formData.msg_order_preparing || null,
        msg_order_delivery: formData.msg_order_delivery || null,
        msg_order_completed: formData.msg_order_completed || null,
        is_open: formData.is_open,
        address: formData.address || null
      });
      toast({
        title: 'Configurações salvas!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const toggleManualOverride = async () => {
    if (!store?.id) return;
    
    const newManualOverride = !manualOverride;
    setManualOverride(newManualOverride);
    
    if (!newManualOverride && hours) {
      const shouldBeOpen = isStoreCurrentlyOpen(hours);
      try {
        await updateStore.mutateAsync({
          id: store.id,
          is_open: shouldBeOpen
        });
        setFormData({
          ...formData,
          is_open: shouldBeOpen
        });
        toast({
          title: 'Status sincronizado com horários',
          description: shouldBeOpen ? 'Loja aberta conforme horário de funcionamento' : 'Loja fechada conforme horário de funcionamento'
        });
      } catch (error) {
        toast({
          title: 'Erro ao sincronizar',
          variant: 'destructive'
        });
      }
    } else {
      toast({
        title: 'Modo manual ativado',
        description: 'Agora você pode abrir/fechar a loja manualmente'
      });
    }
  };

  const toggleStoreStatus = async () => {
    if (!store?.id) return;
    
    if (!manualOverride) {
      toast({
        title: 'Ative o modo manual',
        description: 'Para abrir/fechar manualmente, ative o modo manual primeiro',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await updateStore.mutateAsync({
        id: store.id,
        is_open: !formData.is_open
      });
      setFormData({
        ...formData,
        is_open: !formData.is_open
      });
      toast({
        title: formData.is_open ? 'Loja fechada' : 'Loja aberta'
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar status',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (!manualOverride && hours && store?.id) {
      const shouldBeOpen = isStoreCurrentlyOpen(hours);
      if (shouldBeOpen !== formData.is_open) {
        updateStore.mutateAsync({
          id: store.id,
          is_open: shouldBeOpen
        }).then(() => {
          setFormData(prev => ({ ...prev, is_open: shouldBeOpen }));
        }).catch(() => {});
      }
    }
  }, [hours, manualOverride]);

  const handleEditHour = (hour: BusinessHour) => {
    setEditingHourId(hour.id);
    setEditHourData({
      open_time: hour.open_time,
      close_time: hour.close_time
    });
  };

  const handleSaveHour = async (hour: BusinessHour) => {
    try {
      await updateHour.mutateAsync({
        id: hour.id,
        open_time: editHourData.open_time,
        close_time: editHourData.close_time
      });
      setEditingHourId(null);
      toast({
        title: 'Horário atualizado!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const toggleHourActive = async (hour: BusinessHour) => {
    try {
      await updateHour.mutateAsync({
        id: hour.id,
        is_active: !hour.is_active
      });
      toast({
        title: hour.is_active ? 'Dia desativado' : 'Dia ativado'
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return <AdminLayout title="Configurações">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>;
  }

  return <AdminLayout title="Configurações">
      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {/* Store Status Card */}
        <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${formData.is_open ? 'bg-secondary/20' : 'bg-destructive/20'}`}>
                <Store className={`h-5 w-5 sm:h-6 sm:w-6 ${formData.is_open ? 'text-secondary' : 'text-destructive'}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Status da Loja</h3>
                  <Badge variant={formData.is_open ? 'open' : 'closed'}>
                    {formData.is_open ? 'Aberta' : 'Fechada'}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {manualOverride 
                    ? 'Modo manual ativado' 
                    : 'Sincronizado com horários de funcionamento'}
                </p>
              </div>
            </div>
            <Switch 
              checked={formData.is_open} 
              onCheckedChange={toggleStoreStatus}
              disabled={!manualOverride}
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Modo Manual</p>
                <p className="text-xs text-muted-foreground">
                  Ativar para abrir/fechar manualmente
                </p>
              </div>
            </div>
            <Switch 
              checked={manualOverride} 
              onCheckedChange={toggleManualOverride}
            />
          </div>

          {hours && !isLoadingHours && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Hoje ({getDayName(new Date().getDay())}): {' '}
                {(() => {
                  const todayHours = hours.find(h => h.day_of_week === new Date().getDay());
                  if (!todayHours?.is_active) return 'Fechado';
                  return `${todayHours.open_time.slice(0, 5)} - ${todayHours.close_time.slice(0, 5)}`;
                })()}
              </p>
            </div>
          )}
        </div>

        {/* Brand Customization */}
        <BrandSettings />

        {/* Timezone Settings */}
        <TimezoneSettings />
        
        {/* Security Settings */}
        <SecuritySettings />

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Address */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Endereço
            </h3>

            <div>
              <label className="text-xs sm:text-sm text-muted-foreground">Endereço completo</label>
              <Input value={formData.address} onChange={e => setFormData({
              ...formData,
              address: e.target.value
            })} placeholder="Rua, número, bairro, cidade" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Será exibido no cardápio para os clientes</p>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Contato
            </h3>

            <div>
              <label className="text-xs sm:text-sm text-muted-foreground">WhatsApp</label>
              <Input value={formData.phone_whatsapp} onChange={e => setFormData({
              ...formData,
              phone_whatsapp: e.target.value
            })} placeholder="11999999999" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Apenas números, com DDD</p>
            </div>
          </div>

          {/* PIX */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Chave PIX
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground">Tipo da Chave</label>
                <Select value={formData.pix_key_type} onValueChange={value => setFormData({
                ...formData,
                pix_key_type: value
              })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Telefone">Telefone</SelectItem>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Aleatória">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground">Chave PIX</label>
                <Input value={formData.pix_key} onChange={e => setFormData({
                ...formData,
                pix_key: e.target.value
              })} placeholder="Sua chave PIX" className="mt-1" />
              </div>
            </div>
          </div>

          {/* WhatsApp Messages */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Mensagens WhatsApp por Fase
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure mensagens personalizadas para enviar ao cliente em cada fase do pedido via WhatsApp.
            </p>

            <Accordion type="single" collapsible className="w-full">
              {/* PIX Message */}
              <AccordionItem value="pix">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💠</span>
                    <span>Cobrança PIX</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <Textarea 
                    value={formData.pix_message} 
                    onChange={e => setFormData({
                      ...formData,
                      pix_message: e.target.value
                    })} 
                    placeholder="Oi, {nome}! Seu pedido de {total} está aguardando o pagamento; para finalizar, basta copiar a chave Pix que vou enviar logo abaixo. 😊&#10;&#10;💠 *Chave Pix ({tipo_chave}):*&#10;{chave_pix}"
                    className="min-h-[100px] font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: <code className="bg-muted px-1 rounded">{'{nome}'}</code>, <code className="bg-muted px-1 rounded">{'{pedido}'}</code>, <code className="bg-muted px-1 rounded">{'{total}'}</code>, <code className="bg-muted px-1 rounded">{'{chave_pix}'}</code>, <code className="bg-muted px-1 rounded">{'{tipo_chave}'}</code>
                  </p>
                </AccordionContent>
              </AccordionItem>

              {/* Order Accepted */}
              <AccordionItem value="accepted">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✅</span>
                    <span>Pedido Aceito</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <Textarea 
                    value={formData.msg_order_accepted} 
                    onChange={e => setFormData({
                      ...formData,
                      msg_order_accepted: e.target.value
                    })} 
                    placeholder="Olá {nome}, seu pedido foi confirmado e está sendo preparado 🥰&#10;&#10;*Pedido: #{pedido}*&#10;---------------------------------------&#10;📦 *Produtos*&#10;{produtos}&#10;---------------------------------------&#10;{subtotal} Total dos produtos&#10;{taxa_entrega} Taxa de entrega&#10;*{total} Total*&#10;&#10;Forma de pagamento: {forma_pagamento}&#10;{status_pagamento}&#10;---------------------------------------&#10;👤 Nome: {nome}&#10;📍 Bairro: {bairro}&#10;🏠 Rua: {rua}&#10;🔢 Número: {numero}&#10;{complemento}🕐 Previsão de entrega: {previsao}&#10;&#10;Obrigado pela preferência 😉"
                    className="min-h-[150px] font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: <code className="bg-muted px-1 rounded">{'{nome}'}</code>, <code className="bg-muted px-1 rounded">{'{pedido}'}</code>, <code className="bg-muted px-1 rounded">{'{total}'}</code>, <code className="bg-muted px-1 rounded">{'{subtotal}'}</code>, <code className="bg-muted px-1 rounded">{'{taxa_entrega}'}</code>, <code className="bg-muted px-1 rounded">{'{produtos}'}</code>, <code className="bg-muted px-1 rounded">{'{forma_pagamento}'}</code>, <code className="bg-muted px-1 rounded">{'{status_pagamento}'}</code>, <code className="bg-muted px-1 rounded">{'{bairro}'}</code>, <code className="bg-muted px-1 rounded">{'{rua}'}</code>, <code className="bg-muted px-1 rounded">{'{numero}'}</code>, <code className="bg-muted px-1 rounded">{'{complemento}'}</code>, <code className="bg-muted px-1 rounded">{'{previsao}'}</code>
                  </p>
                </AccordionContent>
              </AccordionItem>
              {/* Order Out for Delivery */}
              <AccordionItem value="delivery">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛵</span>
                    <span>Saiu para Entrega</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <Textarea 
                    value={formData.msg_order_delivery} 
                    onChange={e => setFormData({
                      ...formData,
                      msg_order_delivery: e.target.value
                    })} 
                    placeholder="Olá, {nome}! 🛵&#10;&#10;Seu pedido #{pedido} saiu para entrega!&#10;&#10;Em breve chegará até você! 📍"
                    className="min-h-[100px] font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: <code className="bg-muted px-1 rounded">{'{nome}'}</code>, <code className="bg-muted px-1 rounded">{'{pedido}'}</code>, <code className="bg-muted px-1 rounded">{'{total}'}</code>, <code className="bg-muted px-1 rounded">{'{endereco}'}</code>
                  </p>
                </AccordionContent>
              </AccordionItem>

              {/* Order Completed */}
              <AccordionItem value="completed">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎉</span>
                    <span>Pedido Entregue</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <Textarea 
                    value={formData.msg_order_completed} 
                    onChange={e => setFormData({
                      ...formData,
                      msg_order_completed: e.target.value
                    })} 
                    placeholder="Olá {nome}! 🎉&#10;&#10;Seu pedido #{pedido} foi entregue com sucesso!&#10;&#10;Obrigado pela preferência! ❤️&#10;Esperamos você novamente em breve!"
                    className="min-h-[100px] font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: <code className="bg-muted px-1 rounded">{'{nome}'}</code>, <code className="bg-muted px-1 rounded">{'{pedido}'}</code>, <code className="bg-muted px-1 rounded">{'{total}'}</code>
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Submit Button */}
          <Button type="submit" size="lg" className="w-full" disabled={updateStore.isPending}>
            {updateStore.isPending ? <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </> : 'Salvar Configurações'}
          </Button>
        </form>

        {/* Business Hours */}
        <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Horários de Funcionamento
          </h3>

          {isLoadingHours ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : hours && hours.length > 0 ? (
            <div className="space-y-2">
              {hours.map((hour) => (
                <div 
                  key={hour.id} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    hour.is_active ? "bg-background" : "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={hour.is_active}
                      onCheckedChange={() => toggleHourActive(hour)}
                    />
                    <span className={cn(
                      "font-medium text-sm min-w-[80px]",
                      !hour.is_active && "text-muted-foreground"
                    )}>
                      {getDayName(hour.day_of_week)}
                    </span>
                  </div>
                  
                  {editingHourId === hour.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={editHourData.open_time}
                        onChange={(e) => setEditHourData({ ...editHourData, open_time: e.target.value })}
                        className="w-28 h-8 text-sm"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={editHourData.close_time}
                        onChange={(e) => setEditHourData({ ...editHourData, close_time: e.target.value })}
                        className="w-28 h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveHour(hour)}
                        disabled={updateHour.isPending}
                      >
                        {updateHour.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingHourId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm",
                        !hour.is_active && "text-muted-foreground"
                      )}>
                        {hour.open_time.slice(0, 5)} - {hour.close_time.slice(0, 5)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditHour(hour)}
                        disabled={!hour.is_active}
                      >
                        Editar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum horário configurado
            </p>
          )}
        </div>
      </div>
    </AdminLayout>;
};

export default AdminSettings;
