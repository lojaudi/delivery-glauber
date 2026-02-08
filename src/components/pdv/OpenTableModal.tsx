import { useState, useEffect } from 'react';
import { Users, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableWithOrder } from '@/types/pdv';
import { useTableOrderMutations } from '@/hooks/useTableOrders';

interface OpenTableModalProps {
  table: Table | TableWithOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (orderId: number) => void;
  onTableOpened?: (table: TableWithOrder) => void;
  defaultWaiterId?: string;
  defaultWaiterName?: string;
}

export function OpenTableModal({ 
  table, 
  open, 
  onOpenChange, 
  onSuccess,
  onTableOpened,
  defaultWaiterId,
  defaultWaiterName
}: OpenTableModalProps) {
  const [customerCount, setCustomerCount] = useState(1);
  const [waiterName, setWaiterName] = useState('');
  const { openTable } = useTableOrderMutations();

  useEffect(() => {
    if (defaultWaiterName) {
      setWaiterName(defaultWaiterName);
    }
  }, [defaultWaiterName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!table) return;

    try {
      const order = await openTable.mutateAsync({
        tableId: table.id,
        customerCount,
        waiterName: waiterName || undefined,
      });
      
      onOpenChange(false);
      setCustomerCount(1);
      setWaiterName(defaultWaiterName || '');
      
      onSuccess?.(order.id);
      
      // For waiter dashboard - return the updated table
      if (onTableOpened) {
        const updatedTable: TableWithOrder = {
          ...table,
          status: 'occupied',
          current_order_id: order.id,
          current_order: order,
        };
        onTableOpened(updatedTable);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir Mesa {table?.number}</DialogTitle>
          <DialogDescription>
            Informe os dados para iniciar o atendimento desta mesa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerCount">Número de pessoas</Label>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <Input
                id="customerCount"
                type="number"
                min={1}
                max={20}
                value={customerCount}
                onChange={(e) => setCustomerCount(parseInt(e.target.value) || 1)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waiterName">Nome do atendente (opcional)</Label>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <Input
                id="waiterName"
                placeholder="Ex: João"
                value={waiterName}
                onChange={(e) => setWaiterName(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={openTable.isPending}>
              {openTable.isPending ? 'Abrindo...' : 'Abrir Mesa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
