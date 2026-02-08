import { useState } from 'react';
import { Clock, Phone, MapPin, Bike, ChevronRight, Star } from 'lucide-react';
import { StoreConfig } from '@/hooks/useStore';
import { useBusinessHours, getDayName } from '@/hooks/useBusinessHours';
import { useStoreOpenStatus } from '@/hooks/useStoreOpenStatus';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface StoreInfoProps {
  store: StoreConfig;
}

export function StoreInfo({ store }: StoreInfoProps) {
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const { data: businessHours } = useBusinessHours();
  const { isOpen, manualOverride, withinBusinessHours } = useStoreOpenStatus(store.restaurant_id);

  const formatPhone = (phone: string | null) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const currentDay = new Date().getDay();

  const getClosedReason = () => {
    if (!manualOverride) {
      return 'Loja fechada manualmente';
    }
    if (!withinBusinessHours) {
      return 'Fora do horário de atendimento';
    }
    return 'Fechado';
  };

  return (
    <>
      {/* Quick Info Bar */}
      <div className="mt-4 px-4">
        <div className="flex items-center justify-center gap-6 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>{store.delivery_time_min || 30}-{store.delivery_time_max || 45} min</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bike className="h-4 w-4 text-primary" />
            <span>R$ {Number(store.delivery_fee).toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="font-medium">4.8</span>
          </div>
        </div>
      </div>

      {/* Info Cards - Modern Grid Layout */}
      <div className="mt-2 px-4 space-y-2">
        {/* Status Card - Highlighted */}
        <button 
          onClick={() => setHoursModalOpen(true)}
          className="w-full flex items-center justify-between rounded-2xl bg-gradient-to-r from-card to-muted/30 p-4 shadow-sm border border-border/50 transition-all duration-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isOpen ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <Clock className={`h-6 w-6 ${isOpen ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                {isOpen ? 'Aberto agora' : 'Fechado'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOpen ? 'Recebendo pedidos' : getClosedReason()}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Contact & Location Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Phone */}
          {store.phone_whatsapp && (
            <a 
              href={`https://wa.me/55${store.phone_whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 shadow-sm border border-border/50 transition-all duration-300 hover:shadow-md hover:border-green-500/50 hover:bg-green-500/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                <Phone className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-xs font-medium text-foreground">WhatsApp</span>
            </a>
          )}

          {/* Location */}
          {store.address ? (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 shadow-sm border border-border/50 transition-all duration-300 hover:shadow-md hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">Localização</span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 shadow-sm border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Sem endereço</span>
            </div>
          )}
        </div>
      </div>

      {/* Hours Modal */}
      <Dialog open={hoursModalOpen} onOpenChange={setHoursModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              Horários de Funcionamento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 mt-4">
            {businessHours?.map((hour) => (
              <div 
                key={hour.id} 
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  hour.day_of_week === currentDay 
                    ? 'bg-primary/10 border-2 border-primary/30 shadow-sm' 
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${hour.day_of_week === currentDay ? 'text-primary' : 'text-foreground'}`}>
                    {getDayName(hour.day_of_week)}
                  </span>
                  {hour.day_of_week === currentDay && (
                    <Badge variant="default" className="text-xs px-2 py-0.5">Hoje</Badge>
                  )}
                </div>
                <div className="text-right">
                  {hour.is_active ? (
                    <span className="text-sm font-medium text-foreground">
                      {formatTime(hour.open_time)} - {formatTime(hour.close_time)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Fechado</span>
                  )}
                </div>
              </div>
            ))}

            {(!businessHours || businessHours.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Horários não configurados
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}