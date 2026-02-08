import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import {
  useAddonGroups,
  useAddonOptions,
  useCreateAddonGroup,
  useUpdateAddonGroup,
  useDeleteAddonGroup,
  useReorderAddonGroups,
  useDuplicateAddonGroup,
  useCreateAddonOption,
  useUpdateAddonOption,
  useDeleteAddonOption,
  AddonGroup,
  AddonOption,
} from '@/hooks/useAddons';
import { useDemoGuard } from '@/hooks/useDemoGuard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableGroupProps {
  group: AddonGroup;
  isExpanded: boolean;
  groupOptions: AddonOption[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddOption: () => void;
  onEditOption: (option: AddonOption) => void;
  onDeleteOption: (optionId: string) => void;
  formatCurrency: (value: number) => string;
}

function SortableGroup({
  group,
  isExpanded,
  groupOptions,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onAddOption,
  onEditOption,
  onDeleteOption,
  formatCurrency,
}: SortableGroupProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card rounded-xl shadow-card overflow-hidden",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      {/* Group Header */}
      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted flex-shrink-0"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </button>

        <div
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-muted/50 -m-1 p-1 rounded transition-colors"
          onClick={onToggle}
        >
          <button className="text-muted-foreground flex-shrink-0">
            {isExpanded ? <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" /> : <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{group.name}</h3>
              {group.is_required && (
                <Badge variant="destructive" className="text-[10px] sm:text-xs">Obrigatório</Badge>
              )}
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                {groupOptions.length} {groupOptions.length === 1 ? 'opção' : 'opções'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {group.title} • Máx: {group.max_selections}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="action-icon"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={onDuplicate}
            title="Duplicar grupo"
          >
            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="action-icon"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="action-icon-destructive"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
      
      {/* Options List */}
      {isExpanded && (
        <div className="border-t border-border">
          <div className="p-3 sm:p-4 space-y-2">
            {groupOptions.map((option) => (
              <div 
                key={option.id} 
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg"
              >
                <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-xs sm:text-sm ${!option.is_available ? 'text-muted-foreground line-through' : 'text-foreground'} truncate`}>
                    {option.name}
                  </p>
                </div>
                <span className="text-xs sm:text-sm font-medium text-primary shrink-0">
                  {option.price > 0 ? `+${formatCurrency(option.price)}` : 'Grátis'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="action-icon"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    onClick={() => onEditOption(option)}
                  >
                    <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                  <Button
                    variant="action-icon-destructive"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    onClick={() => onDeleteOption(option.id)}
                  >
                    <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs sm:text-sm"
              onClick={onAddOption}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              Adicionar Opção
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const AdminAddons = () => {
  const { checkDemoMode } = useDemoGuard();
  const { toast } = useToast();
  const { data: groups, isLoading: groupsLoading } = useAddonGroups();
  const { data: allOptions, isLoading: optionsLoading } = useAddonOptions();
  
  const createGroup = useCreateAddonGroup();
  const updateGroup = useUpdateAddonGroup();
  const deleteGroup = useDeleteAddonGroup();
  const reorderGroups = useReorderAddonGroups();
  const duplicateGroup = useDuplicateAddonGroup();
  const createOption = useCreateAddonOption();
  const updateOption = useUpdateAddonOption();
  const deleteOption = useDeleteAddonOption();
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteOptionId, setDeleteOptionId] = useState<string | null>(null);
  
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [editingOption, setEditingOption] = useState<AddonOption | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  
  const [groupForm, setGroupForm] = useState({
    name: '',
    title: '',
    subtitle: '',
    is_required: false,
    max_selections: 1,
  });
  
  const [optionForm, setOptionForm] = useState({
    name: '',
    price: '',
    is_available: true,
  });
  
  const isLoading = groupsLoading || optionsLoading;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };
  
  const openGroupModal = (group?: AddonGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        title: group.title,
        subtitle: group.subtitle || '',
        is_required: group.is_required,
        max_selections: group.max_selections,
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        name: '',
        title: '',
        subtitle: '',
        is_required: false,
        max_selections: 1,
      });
    }
    setGroupModalOpen(true);
  };
  
  const openOptionModal = (groupId: string, option?: AddonOption) => {
    setCurrentGroupId(groupId);
    if (option) {
      setEditingOption(option);
      setOptionForm({
        name: option.name,
        price: option.price.toString(),
        is_available: option.is_available,
      });
    } else {
      setEditingOption(null);
      setOptionForm({
        name: '',
        price: '',
        is_available: true,
      });
    }
    setOptionModalOpen(true);
  };
  
  const handleSaveGroup = async () => {
    if (checkDemoMode()) return;
    if (!groupForm.name.trim() || !groupForm.title.trim()) {
      toast({ title: 'Preencha nome e título', variant: 'destructive' });
      return;
    }
    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          name: groupForm.name,
          title: groupForm.title,
          subtitle: groupForm.subtitle || null,
          is_required: groupForm.is_required,
          max_selections: groupForm.max_selections,
        });
        toast({ title: 'Grupo atualizado!' });
      } else {
        await createGroup.mutateAsync({
          name: groupForm.name,
          title: groupForm.title,
          subtitle: groupForm.subtitle || null,
          is_required: groupForm.is_required,
          max_selections: groupForm.max_selections,
          sort_order: (groups?.length || 0) + 1,
        });
        toast({ title: 'Grupo criado!' });
      }
      setGroupModalOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleSaveOption = async () => {
    if (checkDemoMode()) return;
    if (!optionForm.name.trim() || !currentGroupId) {
      toast({ title: 'Preencha o nome da opção', variant: 'destructive' });
      return;
    }
    
    const price = parseFloat(optionForm.price.replace(',', '.')) || 0;
    
    try {
      if (editingOption) {
        await updateOption.mutateAsync({
          id: editingOption.id,
          name: optionForm.name,
          price,
          is_available: optionForm.is_available,
        });
        toast({ title: 'Opção atualizada!' });
      } else {
        const groupOptions = allOptions?.filter(o => o.group_id === currentGroupId) || [];
        await createOption.mutateAsync({
          group_id: currentGroupId,
          name: optionForm.name,
          price,
          is_available: optionForm.is_available,
          sort_order: groupOptions.length + 1,
        });
        toast({ title: 'Opção criada!' });
      }
      setOptionModalOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleDeleteGroup = async () => {
    if (checkDemoMode()) return;
    if (!deleteGroupId) return;
    try {
      await deleteGroup.mutateAsync(deleteGroupId);
      toast({ title: 'Grupo excluído!' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
    setDeleteGroupId(null);
  };
  
  const handleDeleteOption = async () => {
    if (checkDemoMode()) return;
    if (!deleteOptionId) return;
    try {
      await deleteOption.mutateAsync(deleteOptionId);
      toast({ title: 'Opção excluída!' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
    setDeleteOptionId(null);
  };

  const handleDuplicateGroup = async (groupId: string) => {
    if (checkDemoMode()) return;
    try {
      await duplicateGroup.mutateAsync(groupId);
      toast({ title: 'Grupo duplicado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao duplicar', description: error.message, variant: 'destructive' });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (checkDemoMode()) return;
    const { active, over } = event;

    if (!over || active.id === over.id || !groups) return;

    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);

    const reorderedGroups = arrayMove(groups, oldIndex, newIndex);
    const orderedIds = reorderedGroups.map((g) => g.id);

    try {
      await reorderGroups.mutateAsync(orderedIds);
      toast({ title: 'Ordem atualizada!' });
    } catch (error) {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
    }
  };
  
  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (isLoading) {
    return (
      <AdminLayout title="Acréscimos">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Acréscimos">
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gerencie grupos de acréscimos e suas opções
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Arraste para reordenar os grupos
            </p>
          </div>
          <Button onClick={() => openGroupModal()} className="shrink-0 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>

        {/* Groups List */}
        <div className="space-y-2 sm:space-y-3">
          {groups && groups.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={groups.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                {groups.map((group) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const groupOptions = allOptions?.filter(o => o.group_id === group.id) || [];
                  
                  return (
                    <SortableGroup
                      key={group.id}
                      group={group}
                      isExpanded={isExpanded}
                      groupOptions={groupOptions}
                      onToggle={() => toggleGroup(group.id)}
                      onEdit={() => openGroupModal(group)}
                      onDelete={() => setDeleteGroupId(group.id)}
                      onDuplicate={() => handleDuplicateGroup(group.id)}
                      onAddOption={() => openOptionModal(group.id)}
                      onEditOption={(option) => openOptionModal(group.id, option)}
                      onDeleteOption={(optionId) => setDeleteOptionId(optionId)}
                      formatCurrency={formatCurrency}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="bg-card rounded-xl p-8 text-center">
              <p className="text-muted-foreground">Nenhum grupo de acréscimos cadastrado</p>
              <Button onClick={() => openGroupModal()} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Grupo
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Group Modal */}
      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Editar Grupo' : 'Novo Grupo de Acréscimos'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-muted-foreground">Nome interno *</label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Ex: Extras Burger"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Usado para identificação no admin</p>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Título exibido *</label>
              <Input
                value={groupForm.title}
                onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
                placeholder="Ex: Adicionais"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Subtítulo</label>
              <Input
                value={groupForm.subtitle}
                onChange={(e) => setGroupForm({ ...groupForm, subtitle: e.target.value })}
                placeholder="Ex: Escolha até 3 opções"
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Máx. seleções</label>
                <Input
                  type="number"
                  min={1}
                  value={groupForm.max_selections}
                  onChange={(e) => setGroupForm({ ...groupForm, max_selections: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={groupForm.is_required}
                  onCheckedChange={(checked) => setGroupForm({ ...groupForm, is_required: checked })}
                />
                <label className="text-sm text-foreground">Obrigatório</label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveGroup}
              disabled={createGroup.isPending || updateGroup.isPending}
            >
              {(createGroup.isPending || updateGroup.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Option Modal */}
      <Dialog open={optionModalOpen} onOpenChange={setOptionModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingOption ? 'Editar Opção' : 'Nova Opção'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-muted-foreground">Nome *</label>
              <Input
                value={optionForm.name}
                onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                placeholder="Ex: Bacon extra"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Preço adicional (R$)</label>
              <Input
                value={optionForm.price}
                onChange={(e) => setOptionForm({ ...optionForm, price: e.target.value })}
                placeholder="0,00"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Deixe 0 ou vazio para grátis</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={optionForm.is_available}
                onCheckedChange={(checked) => setOptionForm({ ...optionForm, is_available: checked })}
              />
              <label className="text-sm text-foreground">Disponível</label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveOption}
              disabled={createOption.isPending || updateOption.isPending}
            >
              {(createOption.isPending || updateOption.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Group Confirmation */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá o grupo e todas as suas opções. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Option Confirmation */}
      <AlertDialog open={!!deleteOptionId} onOpenChange={() => setDeleteOptionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir opção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOption}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminAddons;
