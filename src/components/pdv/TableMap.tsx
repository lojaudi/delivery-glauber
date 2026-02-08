import { useState } from 'react';
import { Loader2, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCard } from './TableCard';
import { useTablesWithOrders } from '@/hooks/useTables';
import { TableWithOrder, TableStatus } from '@/types/pdv';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type StatusFilter = 'all' | 'available' | 'occupied' | 'requesting_bill' | 'reserved';

interface TableMapProps {
  onTableClick: (table: TableWithOrder) => void;
  onAddTable: () => void;
}

export function TableMap({ onTableClick, onAddTable }: TableMapProps) {
  const { tables, isLoading, error } = useTablesWithOrders();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-4">
        Erro ao carregar mesas
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="bg-muted/50 rounded-full p-6 mb-6">
          <Plus className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Nenhuma mesa cadastrada
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Comece adicionando as mesas do seu estabelecimento para gerenciar pedidos do salão.
        </p>
        <Button size="lg" onClick={onAddTable}>
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Primeira Mesa
        </Button>
      </div>
    );
  }

  // Group tables by status for stats
  const requestingBill = tables.filter(t => t.status === 'requesting_bill');
  const occupied = tables.filter(t => t.status === 'occupied');
  const available = tables.filter(t => t.status === 'available');
  const reserved = tables.filter(t => t.status === 'reserved');

  // Sort tables by number and apply filter
  const sortedTables = [...tables]
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .sort((a, b) => a.number - b.number);

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <ToggleGroup type="single" value={statusFilter} onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}>
          <ToggleGroupItem value="all" className="text-xs px-3">
            Todas ({tables.length})
          </ToggleGroupItem>
          <ToggleGroupItem value="available" className="text-xs px-3 data-[state=on]:bg-green-100 data-[state=on]:text-green-700">
            Livres ({available.length})
          </ToggleGroupItem>
          <ToggleGroupItem value="occupied" className="text-xs px-3 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700">
            Ocupadas ({occupied.length})
          </ToggleGroupItem>
          <ToggleGroupItem value="requesting_bill" className="text-xs px-3 data-[state=on]:bg-red-100 data-[state=on]:text-red-700">
            Pedindo Conta ({requestingBill.length})
          </ToggleGroupItem>
          <ToggleGroupItem value="reserved" className="text-xs px-3 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700">
            Reservadas ({reserved.length})
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{available.length}</p>
          <p className="text-sm text-green-600">Livres</p>
        </div>
        <div className="bg-amber-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{occupied.length}</p>
          <p className="text-sm text-amber-600">Ocupadas</p>
        </div>
        <div className="bg-red-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{requestingBill.length}</p>
          <p className="text-sm text-red-600">Pedindo Conta</p>
        </div>
        <div className="bg-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{reserved.length}</p>
          <p className="text-sm text-blue-600">Reservadas</p>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {sortedTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onClick={() => onTableClick(table)}
          />
        ))}
      </div>
    </div>
  );
}
