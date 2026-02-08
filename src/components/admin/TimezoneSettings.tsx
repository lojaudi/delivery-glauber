import { useState, useEffect } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStoreConfig, useUpdateStoreConfig } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';
import { useDemoGuard } from '@/hooks/useDemoGuard';

const BRAZIL_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)', description: 'SP, RJ, MG, RS, PR, SC...' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)', description: 'AM, RR, RO, MT, MS' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)', description: 'MT, MS' },
  { value: 'America/Belem', label: 'Belém (GMT-3)', description: 'PA, AP' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)', description: 'CE, RN, PB, PE, AL, SE, MA, PI, BA' },
  { value: 'America/Recife', label: 'Recife (GMT-3)', description: 'PE, PB, RN, CE' },
  { value: 'America/Bahia', label: 'Salvador (GMT-3)', description: 'BA' },
  { value: 'America/Campo_Grande', label: 'Campo Grande (GMT-4)', description: 'MS' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)', description: 'RO, AC' },
  { value: 'America/Boa_Vista', label: 'Boa Vista (GMT-4)', description: 'RR' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)', description: 'AC' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)', description: 'PE (Ilhas)' },
];

export function TimezoneSettings() {
  const { checkDemoMode } = useDemoGuard();
  const { data: store, isLoading } = useStoreConfig();
  const updateStore = useUpdateStoreConfig();
  const { toast } = useToast();
  const [timezone, setTimezone] = useState('America/Sao_Paulo');

  useEffect(() => {
    if (store?.timezone) {
      setTimezone(store.timezone);
    }
  }, [store?.timezone]);

  const handleSave = async () => {
    if (checkDemoMode()) return;
    if (!store?.id) return;

    try {
      await updateStore.mutateAsync({
        id: store.id,
        timezone,
      });
      toast({ title: 'Fuso horário salvo!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card">
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const currentTz = BRAZIL_TIMEZONES.find(tz => tz.value === timezone);

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
        <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        Fuso Horário
      </h3>

      <div className="space-y-2">
        <label className="text-xs sm:text-sm text-muted-foreground">
          Selecione o fuso horário do restaurante
        </label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o fuso horário" />
          </SelectTrigger>
          <SelectContent>
            {BRAZIL_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{tz.label}</span>
                  <span className="text-xs text-muted-foreground">{tz.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentTz && (
          <p className="text-xs text-muted-foreground">
            Este fuso será usado para os horários de funcionamento e pedidos.
          </p>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={updateStore.isPending || timezone === store?.timezone}
        className="w-full sm:w-auto"
      >
        {updateStore.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Salvar Fuso Horário
      </Button>
    </div>
  );
}
