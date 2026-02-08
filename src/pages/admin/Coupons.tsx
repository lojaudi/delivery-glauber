import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Ticket, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, Coupon } from '@/hooks/useCoupons';
import { useToast } from '@/hooks/use-toast';
import { useDemoGuard } from '@/hooks/useDemoGuard';

const AdminCoupons = () => {
  const { checkDemoMode } = useDemoGuard();
  const { data: coupons, isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_value: '',
    max_uses: '',
    expires_at: '',
    is_active: true,
  });

  const formatCurrency = (value: number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '',
      max_uses: '',
      expires_at: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type as 'percentage' | 'fixed',
      discount_value: coupon.discount_value.toString(),
      min_order_value: coupon.min_order_value?.toString() || '',
      max_uses: coupon.max_uses?.toString() || '',
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      is_active: coupon.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkDemoMode()) return;

    if (!formData.code.trim()) {
      toast({ title: 'Código é obrigatório', variant: 'destructive' });
      return;
    }

    const discountValue = parseFloat(formData.discount_value.replace(',', '.'));
    if (isNaN(discountValue) || discountValue <= 0) {
      toast({ title: 'Valor do desconto inválido', variant: 'destructive' });
      return;
    }

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: discountValue,
        min_order_value: formData.min_order_value ? parseFloat(formData.min_order_value.replace(',', '.')) : 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: formData.is_active,
      };

      if (editingCoupon) {
        await updateCoupon.mutateAsync({ id: editingCoupon.id, ...couponData });
        toast({ title: 'Cupom atualizado!' });
      } else {
        await createCoupon.mutateAsync(couponData);
        toast({ title: 'Cupom criado!' });
      }

      setIsModalOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (checkDemoMode()) return;
    if (!confirm(`Deseja excluir o cupom "${coupon.code}"?`)) return;

    try {
      await deleteCoupon.mutateAsync(coupon.id);
      toast({ title: 'Cupom excluído!' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    if (checkDemoMode()) return;
    try {
      await updateCoupon.mutateAsync({
        id: coupon.id,
        is_active: !coupon.is_active,
      });
      toast({ title: coupon.is_active ? 'Cupom desativado' : 'Cupom ativado' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return formatCurrency(coupon.discount_value);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Cupons">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Cupons">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <p className="text-sm text-muted-foreground">
          {coupons?.length || 0} cupons cadastrados
        </p>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {coupons?.map((coupon) => (
          <div 
            key={coupon.id}
            className="bg-card rounded-xl p-3 sm:p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm sm:text-base truncate">{coupon.code}</p>
                  <p className="text-lg sm:text-2xl font-bold text-primary">{getDiscountDisplay(coupon)}</p>
                </div>
              </div>
              <Badge variant={coupon.is_active ? 'open' : 'closed'} className="text-[10px] sm:text-xs flex-shrink-0">
                {coupon.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            <div className="space-y-1 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              {coupon.min_order_value > 0 && (
                <p>Mínimo: {formatCurrency(coupon.min_order_value)}</p>
              )}
              {coupon.max_uses && (
                <p>Usos: {coupon.current_uses}/{coupon.max_uses}</p>
              )}
              {coupon.expires_at && (
                <p>Expira: {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => toggleActive(coupon)}
              >
                {coupon.is_active ? (
                  <><ToggleRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> <span className="hidden xs:inline">Desativar</span><span className="xs:hidden">Off</span></>
                ) : (
                  <><ToggleLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> <span className="hidden xs:inline">Ativar</span><span className="xs:hidden">On</span></>
                )}
              </Button>
              <Button variant="action-icon" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => openEditModal(coupon)}>
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button variant="action-icon-destructive" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => handleDelete(coupon)}>
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        ))}

        {(!coupons || coupons.length === 0) && (
          <div className="col-span-full py-12 text-center">
            <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum cupom cadastrado</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Código *</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="PROMO10"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Tipo</label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: 'percentage' | 'fixed') => 
                    setFormData({ ...formData, discount_type: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem</SelectItem>
                    <SelectItem value="fixed">Valor Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Valor {formData.discount_type === 'percentage' ? '(%)' : '(R$)'} *
                </label>
                <Input
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '5,00'}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Pedido Mínimo (R$)</label>
                <Input
                  value={formData.min_order_value}
                  onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Máx. Usos</label>
                <Input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Ilimitado"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Data de Expiração</label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCoupon.isPending || updateCoupon.isPending}>
                {(createCoupon.isPending || updateCoupon.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingCoupon ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCoupons;
