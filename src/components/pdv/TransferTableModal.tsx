import { useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTables } from '@/hooks/useTables';
import { Table, TableWithOrder } from '@/types/pdv';
import { cn } from '@/lib/utils';

interface TransferTableModalProps {
  currentTable: TableWithOrder;
  orderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (targetTableId: string) => Promise<void>;
  isTransferring: boolean;
}

export function TransferTableModal({ 
  currentTable, 
  orderId,
  open, 
  onOpenChange,
  onTransfer,
  isTransferring
}: TransferTableModalProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const { tables, isLoading } = useTables();

  const availableTables = tables.filter(
    t => t.id !== currentTable.id && t.status === 'available'
  );

  const handleTransfer = async () => {
    if (!selectedTable) return;
    await onTransfer(selectedTable);
    setSelectedTable(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir Mesa {currentTable.number}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : availableTables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Não há mesas disponíveis para transferência.</p>
            <p className="text-sm mt-1">Libere uma mesa antes de transferir.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Selecione a mesa de destino:
            </p>
            <ScrollArea className="max-h-60">
              <div className="grid grid-cols-3 gap-2">
                {availableTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-center",
                      selectedTable === table.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 bg-green-50"
                    )}
                  >
                    <p className="font-bold text-lg">Mesa {table.number}</p>
                    {table.name && (
                      <p className="text-xs text-muted-foreground">{table.name}</p>
                    )}
                    <p className="text-xs text-green-600 mt-1">Livre</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={!selectedTable || isTransferring}
          >
            {isTransferring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferindo...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
