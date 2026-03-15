import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Truck, Phone, Loader2, Key, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useDemoGuard } from '@/hooks/useDemoGuard';
import { useAdminRestaurant } from '@/hooks/useAdminRestaurant';

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  pin: string | null;
  is_active: boolean;
}

export default function Drivers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', pin: '' });
  const [showPin, setShowPin] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkDemoMode } = useDemoGuard();
  const { restaurantId } = useAdminRestaurant();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, phone, pin, is_active')
        .eq('restaurant_id', restaurantId)
        .order('name');
      if (error) throw error;
      return data as Driver[];
    },
    enabled: !!restaurantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; pin: string }) => {
      if (!restaurantId) throw new Error('Restaurant ID not found');
      const { error } = await supabase.from('drivers').insert({
        name: data.name,
        phone: data.phone || null,
        pin: data.pin || null,
        is_active: true,
        restaurant_id: restaurantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', restaurantId] });
      toast({ title: 'Entregador cadastrado com sucesso!' });
      setIsDialogOpen(false);
      setFormData({ name: '', phone: '', pin: '' });
    },
    onError: () => toast({ title: 'Erro ao cadastrar entregador', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Driver> }) => {
      const { error } = await supabase.from('drivers').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', restaurantId] });
      toast({ title: 'Entregador atualizado!' });
      setIsDialogOpen(false);
      setEditingDriver(null);
      setFormData({ name: '', phone: '', pin: '' });
    },
    onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', restaurantId] });
      toast({ title: 'Entregador removido!' });
    },
    onError: () => toast({ title: 'Erro ao remover', variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkDemoMode()) return;
    if (!formData.name.trim()) return;
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({ name: driver.name, phone: driver.phone || '', pin: driver.pin || '' });
    setShowPin(false);
    setIsDialogOpen(true);
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({ ...formData, pin });
    setShowPin(true);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <AdminLayout title="Entregadores">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Gerencie a equipe de entregadores</p>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setEditingDriver(null); setFormData({ name: '', phone: '', pin: '' }); setShowPin(false); }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />Novo Entregador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDriver ? 'Editar Entregador' : 'Novo Entregador'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do entregador" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" className="mt-1.5" maxLength={15} />
                </div>
                <div>
                  <Label htmlFor="pin" className="flex items-center gap-2"><Key className="w-4 h-4" />PIN de Acesso (4-6 dígitos)</Label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="relative flex-1">
                      <Input id="pin" type={showPin ? 'text' : 'password'} value={formData.pin} onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="PIN para login" className="pr-10 font-mono tracking-widest" maxLength={6} />
                      <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={generateRandomPin} title="Gerar PIN aleatório">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Deixe vazio para permitir acesso sem PIN</p>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDriver ? 'Salvar' : 'Cadastrar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>Lista de Entregadores</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum entregador cadastrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>
                        {driver.phone ? (
                          <span className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{driver.phone}</span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={driver.is_active} onCheckedChange={() => {
                            if (checkDemoMode()) return;
                            updateMutation.mutate({ id: driver.id, data: { is_active: !driver.is_active } });
                          }} />
                          <Badge variant={driver.is_active ? 'default' : 'secondary'}>
                            {driver.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(driver)}><Pencil className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover entregador?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { if (checkDemoMode()) return; deleteMutation.mutate(driver.id); }}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
