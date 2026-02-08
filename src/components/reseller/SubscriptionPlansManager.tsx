import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Loader2, Plus, Pencil, Trash2, Package, Star, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionPlans, useCreatePlan, useUpdatePlan, useDeletePlan } from '@/hooks/useSubscriptionPlans';
import type { SubscriptionPlan } from '@/types/reseller';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PlanFormData {
  name: string;
  description: string;
  monthly_fee: string;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  features: string[];
}

const defaultFormData: PlanFormData = {
  name: '',
  description: '',
  monthly_fee: '99.90',
  is_active: true,
  is_popular: false,
  sort_order: 0,
  features: [],
};

export function SubscriptionPlansManager() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [newFeature, setNewFeature] = useState('');

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      ...defaultFormData,
      sort_order: (plans?.length || 0) + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      monthly_fee: String(plan.monthly_fee),
      is_active: plan.is_active,
      is_popular: plan.is_popular || false,
      sort_order: plan.sort_order,
      features: plan.features || [],
    });
    setModalOpen(true);
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()],
      });
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome do plano é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      const planData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        monthly_fee: parseFloat(formData.monthly_fee) || 0,
        trial_days: 0,
        is_active: formData.is_active,
        is_popular: formData.is_popular,
        sort_order: formData.sort_order,
        features: formData.features.length > 0 ? formData.features : null,
      };

      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan.id, ...planData });
        toast({ title: 'Plano atualizado' });
      } else {
        await createPlan.mutateAsync(planData);
        toast({ title: 'Plano criado' });
      }

      setModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    try {
      await deletePlan.mutateAsync(planToDelete.id);
      toast({ title: 'Plano excluído' });
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Planos de Assinatura
              </CardTitle>
              <CardDescription>
                Defina os planos e preços para seus restaurantes
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!plans?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum plano criado ainda.</p>
              <p className="text-sm">Crie seu primeiro plano para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.name}</span>
                      {plan.is_popular && (
                        <Badge variant="default" className="bg-amber-500">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      {!plan.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="font-semibold text-primary">
                        {formatCurrency(plan.monthly_fee)}/mês
                      </span>
                      {plan.features && plan.features.length > 0 && (
                        <span className="text-muted-foreground">
                          {plan.features.length} funcionalidades
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(plan)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPlanToDelete(plan);
                        setDeleteDialogOpen(true);
                      }}
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

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Plano</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Plano Básico"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o que está incluso no plano"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_fee">Mensalidade (R$)</Label>
              <Input
                id="monthly_fee"
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_fee}
                onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                required
              />
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label>Funcionalidades (para landing page)</Label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Ex: Pedidos ilimitados"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddFeature} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      {feature}
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="is_popular">Destacar como "Mais Popular"</Label>
                <p className="text-xs text-muted-foreground">
                  Aparecerá em destaque na landing page
                </p>
              </div>
              <Switch
                id="is_popular"
                checked={formData.is_popular}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_popular: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="is_active">Plano ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Planos inativos não aparecem ao criar restaurantes
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createPlan.isPending || updatePlan.isPending}
              >
                {(createPlan.isPending || updatePlan.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingPlan ? 'Salvar' : 'Criar Plano'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{planToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePlan.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
