import { useState, useEffect } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useTablesWithOrders, useTableMutations } from '@/hooks/useTables';
import { TableWithOrder, TableStatus } from '@/types/pdv';

const statusConfig: Record<TableStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  available: { label: 'Livre', variant: 'outline' },
  occupied: { label: 'Ocupada', variant: 'default' },
  reserved: { label: 'Reservada', variant: 'secondary' },
  requesting_bill: { label: 'Pedindo Conta', variant: 'destructive' },
};

interface TableManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TableManagementModal({ open, onOpenChange }: TableManagementModalProps) {
  const [editingTable, setEditingTable] = useState<TableWithOrder | null>(null);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { tables } = useTablesWithOrders();
  const { createTable, updateTable, deleteTable } = useTableMutations();

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setEditingTable(null);
      setNewTableNumber('');
      setNewTableName('');
      setNewTableCapacity('4');
    }
  }, [open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const number = parseInt(newTableNumber);
    if (!number) return;

    await createTable.mutateAsync({
      number,
      name: newTableName || undefined,
      capacity: parseInt(newTableCapacity) || 4,
    });

    setNewTableNumber('');
    setNewTableName('');
    setNewTableCapacity('4');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;

    await updateTable.mutateAsync({
      id: editingTable.id,
      number: parseInt(newTableNumber) || editingTable.number,
      name: newTableName || null,
      capacity: parseInt(newTableCapacity) || 4,
    });

    setEditingTable(null);
    setNewTableNumber('');
    setNewTableName('');
    setNewTableCapacity('4');
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteTable.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const startEditing = (table: TableWithOrder) => {
    setEditingTable(table);
    setNewTableNumber(table.number.toString());
    setNewTableName(table.name || '');
    setNewTableCapacity(table.capacity.toString());
  };

  const isTableOccupied = (table: TableWithOrder) => table.status !== 'available';

  const cancelEditing = () => {
    setEditingTable(null);
    setNewTableNumber('');
    setNewTableName('');
    setNewTableCapacity('4');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Mesas</DialogTitle>
          </DialogHeader>

          {/* Add/Edit Form */}
          <form onSubmit={editingTable ? handleUpdate : handleCreate} className="space-y-3 border-b pb-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tableNumber">Número*</Label>
                <Input
                  id="tableNumber"
                  type="number"
                  min={1}
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="Ex: 1"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tableName">Nome</Label>
                <Input
                  id="tableName"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Ex: Varanda"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tableCapacity">Lugares</Label>
                <Input
                  id="tableCapacity"
                  type="number"
                  min={1}
                  max={20}
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              {editingTable && (
                <Button type="button" variant="outline" onClick={cancelEditing}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={createTable.isPending || updateTable.isPending}>
                {editingTable
                  ? updateTable.isPending ? 'Salvando...' : 'Salvar'
                  : createTable.isPending ? 'Criando...' : 'Adicionar Mesa'}
              </Button>
            </div>
          </form>

          {/* Tables List */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2">
              {tables.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma mesa cadastrada
                </p>
              ) : (
                tables.map((table) => {
                  const occupied = isTableOccupied(table);
                  const statusInfo = statusConfig[table.status];
                  
                  return (
                    <div
                      key={table.id}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        occupied ? 'bg-muted/50 border border-border' : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              Mesa {table.number}
                              {table.name && <span className="text-muted-foreground ml-1">({table.name})</span>}
                            </p>
                            <Badge variant={statusInfo.variant} className="text-xs">
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {table.capacity} lugares
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(table)}
                          disabled={occupied}
                          title={occupied ? 'Mesa ocupada - não é possível editar' : 'Editar mesa'}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(table.id)}
                          disabled={occupied}
                          title={occupied ? 'Mesa ocupada - não é possível excluir' : 'Excluir mesa'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mesa será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
