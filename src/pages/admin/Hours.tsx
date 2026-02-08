import { useState } from 'react';
import { Loader2, Clock, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useBusinessHours, useUpdateBusinessHour, useCreateBusinessHours, useDeleteBusinessHour, getDayName, BusinessHour } from '@/hooks/useBusinessHours';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDemoGuard } from '@/hooks/useDemoGuard';

const AdminHours = () => {
  const { data: hours, isLoading } = useBusinessHours();
  const updateHour = useUpdateBusinessHour();
  const createHours = useCreateBusinessHours();
  const deleteHour = useDeleteBusinessHour();
  const { toast } = useToast();
  const { checkDemoMode } = useDemoGuard();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    open_time: '',
    close_time: '',
  });

  const handleEdit = (hour: BusinessHour) => {
    setEditingId(hour.id);
    setEditData({
      open_time: hour.open_time,
      close_time: hour.close_time,
    });
  };

  const handleSave = async (hour: BusinessHour) => {
    if (checkDemoMode()) return;
    try {
      await updateHour.mutateAsync({
        id: hour.id,
        open_time: editData.open_time,
        close_time: editData.close_time,
      });
      setEditingId(null);
      toast({ title: 'Horário atualizado!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (hour: BusinessHour) => {
    if (checkDemoMode()) return;
    try {
      await updateHour.mutateAsync({
        id: hour.id,
        is_active: !hour.is_active,
      });
      toast({ title: hour.is_active ? 'Dia desativado' : 'Dia ativado' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleCreateHours = async () => {
    if (checkDemoMode()) return;
    try {
      await createHours.mutateAsync();
      toast({ title: 'Horários criados com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao criar horários', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteHour = async (id: string) => {
    if (checkDemoMode()) return;
    try {
      await deleteHour.mutateAsync(id);
      toast({ title: 'Horário excluído!' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Horários">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Show create button if no hours exist
  if (!hours || hours.length === 0) {
    return (
      <AdminLayout title="Horários de Funcionamento">
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-primary/10 rounded-xl">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm sm:text-base">Configure os horários de funcionamento</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Defina quando sua loja está aberta para receber pedidos
              </p>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-card p-6 sm:p-8 text-center">
            <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">Nenhum horário cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Clique no botão abaixo para criar os horários de funcionamento para todos os dias da semana.
            </p>
            <Button onClick={handleCreateHours} disabled={createHours.isPending}>
              {createHours.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Horários
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Horários de Funcionamento">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-primary/10 rounded-xl">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm sm:text-base">Configure os horários de funcionamento</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Defina quando sua loja está aberta para receber pedidos
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          {hours?.map((hour) => (
            <div 
              key={hour.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 border-b border-border last:border-0",
                !hour.is_active && "opacity-60"
              )}
            >
              {/* Mobile: First row with switch, day name, and actions */}
              <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={hour.is_active}
                    onCheckedChange={() => toggleActive(hour)}
                  />
                  <p className={cn(
                    "font-medium text-sm sm:text-base w-16 sm:w-20",
                    hour.is_active ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {getDayName(hour.day_of_week)}
                  </p>
                </div>

                {/* Actions - visible on mobile when not editing */}
                {editingId !== hour.id && (
                  <div className="flex items-center gap-1 sm:hidden">
                    <Button 
                      size="icon-sm"
                      variant="action-icon"
                      onClick={() => handleEdit(hour)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon-sm"
                      variant="action-icon-destructive"
                      onClick={() => handleDeleteHour(hour.id)}
                      disabled={deleteHour.isPending}
                    >
                      {deleteHour.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Time display/edit */}
              {editingId === hour.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={editData.open_time}
                    onChange={(e) => setEditData({ ...editData, open_time: e.target.value })}
                    className="w-full sm:w-28"
                  />
                  <span className="text-muted-foreground text-sm shrink-0">às</span>
                  <Input
                    type="time"
                    value={editData.close_time}
                    onChange={(e) => setEditData({ ...editData, close_time: e.target.value })}
                    className="w-full sm:w-28"
                  />
                  <Button 
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary shrink-0"
                    onClick={() => handleSave(hour)}
                    disabled={updateHour.isPending}
                  >
                    {updateHour.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button 
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 flex-1">
                  <p className={cn(
                    "text-sm",
                    hour.is_active ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {hour.open_time.slice(0, 5)} às {hour.close_time.slice(0, 5)}
                  </p>
                  
                  {/* Actions - visible on desktop */}
                  <div className="hidden sm:flex items-center gap-1">
                    <Button 
                      size="icon-sm"
                      variant="action-icon"
                      onClick={() => handleEdit(hour)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon-sm"
                      variant="action-icon-destructive"
                      onClick={() => handleDeleteHour(hour.id)}
                      disabled={deleteHour.isPending}
                    >
                      {deleteHour.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Os horários são salvos automaticamente ao clicar em salvar
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminHours;