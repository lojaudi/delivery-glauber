import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useReorderCategories, Category } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
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
import { useDemoGuard } from '@/hooks/useDemoGuard';

interface SortableCategoryItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function SortableCategoryItem({ category, onEdit, onDelete }: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border-b border-border last:border-0 bg-card",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted flex-shrink-0"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
      </button>

      {/* Category Image */}
      {category.image_url ? (
        <img
          src={category.image_url}
          alt={category.name}
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <span className="text-lg sm:text-xl">🍽️</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm sm:text-base truncate">{category.name}</p>
        <p className="text-xs text-muted-foreground">Ordem: {category.sort_order}</p>
      </div>

      <div className="flex gap-1 sm:gap-2 flex-shrink-0">
        <Button variant="action-icon" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => onEdit(category)}>
          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <Button variant="action-icon-destructive" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => onDelete(category)}>
          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
}

const AdminCategories = () => {
  const { checkDemoMode } = useDemoGuard();
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sort_order: 0,
    image_url: null as string | null,
  });

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

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      sort_order: (categories?.length || 0) + 1,
      image_url: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      sort_order: category.sort_order,
      image_url: category.image_url || null,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkDemoMode()) return;

    if (!formData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          name: formData.name,
          sort_order: formData.sort_order,
          image_url: formData.image_url,
        });
        toast({ title: 'Categoria atualizada!' });
      } else {
        await createCategory.mutateAsync({
          name: formData.name,
          sort_order: formData.sort_order,
          image_url: formData.image_url,
        });
        toast({ title: 'Categoria criada!' });
      }

      setIsModalOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (category: Category) => {
    if (checkDemoMode()) return;
    if (!confirm(`Deseja excluir "${category.name}"? Os produtos desta categoria ficarão sem categoria.`)) return;

    try {
      await deleteCategory.mutateAsync(category.id);
      toast({ title: 'Categoria excluída!' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (checkDemoMode()) return;
    const { active, over } = event;

    if (!over || active.id === over.id || !categories) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
    const orderedIds = reorderedCategories.map((c) => c.id);

    try {
      await reorderCategories.mutateAsync(orderedIds);
      toast({ title: 'Ordem atualizada!' });
    } catch (error) {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Categorias">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Categorias">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {categories?.length || 0} categorias cadastradas
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste para reordenar
          </p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Categories List */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        {categories && categories.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {categories.map((category) => (
                <SortableCategoryItem
                  key={category.id}
                  category={category}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma categoria cadastrada</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Imagem</label>
              <ImageUpload
                bucket="store-assets"
                currentUrl={formData.image_url}
                onUpload={(url) => setFormData({ ...formData, image_url: url })}
                onRemove={() => setFormData({ ...formData, image_url: null })}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da categoria"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                {(createCategory.isPending || updateCategory.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingCategory ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCategories;
