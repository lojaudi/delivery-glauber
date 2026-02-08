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
import { Plus, Pencil, Trash2, User, Phone, Loader2, DollarSign, Key, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useDemoGuard } from '@/hooks/useDemoGuard';
import { useAdminRestaurant } from '@/hooks/useAdminRestaurant';

interface Waiter {
  id: string;
  name: string;
  phone: string | null;
  pin: string | null;
  is_active: boolean;
  created_at?: string;
}

interface WaiterStats {
  waiterId: string;
  tableCount: number;
  totalRevenue: number;
  totalTips: number;
}

export default function Waiters() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', pin: '' });
  const [showPin, setShowPin] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkDemoMode } = useDemoGuard();
  const { restaurantId, isLoading: loadingRestaurant } = useAdminRestaurant();

  // Fetch waiters from database - filtered by restaurant
  const { data: waiters = [], isLoading } = useQuery({
    queryKey: ['waiters', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('waiters')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) throw error;
      return data as Waiter[];
    },
    enabled: !!restaurantId,
  });

  // Calculate waiter stats from database - filtered by restaurant
  const { data: waiterStats = [] } = useQuery({
    queryKey: ['waiter-stats', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: paidOrders, error } = await supabase
        .from('table_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'paid')
        .gte('closed_at', today.toISOString());

      if (error) throw error;
      
      const statsMap = new Map<string, WaiterStats>();
      
      (paidOrders || []).forEach(order => {
        if (!order.waiter_id) return;
        
        const existing = statsMap.get(order.waiter_id) || {
          waiterId: order.waiter_id,
          tableCount: 0,
          totalRevenue: 0,
          totalTips: 0,
        };
        
        existing.tableCount += 1;
        existing.totalRevenue += Number(order.total_amount) || 0;
        
        if (order.service_fee_enabled && order.subtotal) {
          existing.totalTips += (Number(order.subtotal) * (Number(order.service_fee_percentage) || 10)) / 100;
        }
        
        statsMap.set(order.waiter_id, existing);
      });
      
      return Array.from(statsMap.values());
    },
    enabled: !!restaurantId,
  });

  // Create waiter - with restaurant_id
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; pin: string }) => {
      if (!restaurantId) throw new Error('Restaurant ID not found');
      
      const { data: newWaiter, error } = await supabase
        .from('waiters')
        .insert({
          name: data.name,
          phone: data.phone || null,
          pin: data.pin || null,
          is_active: true,
          restaurant_id: restaurantId,
        })
        .select()
        .single();

      if (error) throw error;
      return newWaiter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiters', restaurantId] });
      toast({ title: 'Garçom cadastrado com sucesso!' });
      setIsDialogOpen(false);
      setFormData({ name: '', phone: '', pin: '' });
      setShowPin(false);
    },
    onError: () => {
      toast({ title: 'Erro ao cadastrar garçom', variant: 'destructive' });
    },
  });

  // Update waiter
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Waiter> }) => {
      const { data: updated, error } = await supabase
        .from('waiters')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiters', restaurantId] });
      toast({ title: 'Garçom atualizado!' });
      setIsDialogOpen(false);
      setEditingWaiter(null);
      setFormData({ name: '', phone: '', pin: '' });
      setShowPin(false);
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    },
  });

  // Delete waiter
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('waiters')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiters', restaurantId] });
      toast({ title: 'Garçom removido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkDemoMode()) return;
    if (!formData.name.trim()) return;
    
    if (editingWaiter) {
      updateMutation.mutate({ id: editingWaiter.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (checkDemoMode()) return;
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (waiter: Waiter) => {
    if (checkDemoMode()) return;
    updateMutation.mutate({ id: waiter.id, data: { is_active: !waiter.is_active } });
  };

  const openEditDialog = (waiter: Waiter) => {
    setEditingWaiter(waiter);
    setFormData({ name: waiter.name, phone: waiter.phone || '', pin: waiter.pin || '' });
    setShowPin(false);
    setIsDialogOpen(true);
  };
  
  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({ ...formData, pin });
    setShowPin(true);
  };
  
  const handlePinChange = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '').slice(0, 6);
    setFormData({ ...formData, pin: numbersOnly });
  };


  const getWaiterStats = (waiterId: string) => {
    return waiterStats.find(s => s.waiterId === waiterId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <AdminLayout title="Garçons">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Gerencie a equipe de garçons</p>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingWaiter(null);
              setFormData({ name: '', phone: '', pin: '' });
              setShowPin(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Novo Garçom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingWaiter ? 'Editar Garçom' : 'Novo Garçom'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do garçom"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    placeholder="(11) 99999-9999"
                    className="mt-1.5"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="pin" className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    PIN de Acesso (4-6 dígitos)
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="relative flex-1">
                      <Input
                        id="pin"
                        type={showPin ? 'text' : 'password'}
                        value={formData.pin}
                        onChange={(e) => handlePinChange(e.target.value)}
                        placeholder="PIN para login"
                        className="pr-10 font-mono tracking-widest"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateRandomPin}
                      title="Gerar PIN aleatório"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe vazio para permitir acesso sem PIN
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingWaiter ? 'Salvar' : 'Cadastrar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Garçons Ativos</p>
                <p className="text-xl font-bold text-foreground">
                  {waiters.filter(w => w.is_active).length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gorjetas Hoje</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(waiterStats.reduce((sum, s) => sum + s.totalTips, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Hoje</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(waiterStats.reduce((sum, s) => sum + s.totalRevenue, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Waiters Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Garçons</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : waiters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum garçom cadastrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mesas Hoje</TableHead>
                    <TableHead>Gorjetas Hoje</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waiters.map((waiter) => {
                    const stats = getWaiterStats(waiter.id);
                    return (
                      <TableRow key={waiter.id}>
                        <TableCell className="font-medium">{waiter.name}</TableCell>
                        <TableCell>
                          {waiter.phone ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {waiter.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={waiter.is_active}
                              onCheckedChange={() => handleToggleActive(waiter)}
                            />
                            <Badge variant={waiter.is_active ? 'default' : 'secondary'}>
                              {waiter.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{stats?.tableCount || 0}</TableCell>
                        <TableCell>{formatCurrency(stats?.totalTips || 0)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(waiter)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover garçom?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O garçom será removido permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(waiter.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
