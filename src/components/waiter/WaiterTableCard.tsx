import { Clock, Users, Bell, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableWithOrder, TableStatus } from '@/types/pdv';
import { cn } from '@/lib/utils';

interface WaiterTableCardProps {
  table: TableWithOrder;
  onClick: () => void;
  readyItemsCount?: number;
}

const statusConfig: Record<TableStatus, { label: string; bgColor: string; textColor: string }> = {
  available: { label: 'Livre', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  occupied: { label: 'Ocupada', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  reserved: { label: 'Reservada', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  requesting_bill: { label: 'Conta', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

export function WaiterTableCard({ table, onClick, readyItemsCount = 0 }: WaiterTableCardProps) {
  const config = statusConfig[table.status];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg relative",
        config.bgColor,
        table.status === 'requesting_bill' && "ring-2 ring-red-500 animate-pulse"
      )}
      onClick={onClick}
    >
      {/* Ready items notification */}
      {readyItemsCount > 0 && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-green-500 text-white animate-bounce px-2 py-1">
            <Bell className="h-3 w-3 mr-1" />
            {readyItemsCount}
          </Badge>
        </div>
      )}

      <CardContent className="p-4">
        {/* Table number */}
        <div className="text-center mb-3">
          <span className={cn("text-3xl font-bold", config.textColor)}>
            {table.number}
          </span>
          {table.name && (
            <p className="text-sm text-muted-foreground">{table.name}</p>
          )}
        </div>

        {/* Status badge */}
        <Badge className={cn("w-full justify-center mb-2", config.bgColor, config.textColor)}>
          {config.label}
        </Badge>

        {/* Order info if occupied */}
        {table.current_order && table.status !== 'available' && (
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTime(table.current_order.opened_at)}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                {table.current_order.customer_count}
              </span>
            </div>
            <div className="flex items-center justify-center mt-2">
              <span className={cn("font-bold text-lg", config.textColor)}>
                <DollarSign className="h-4 w-4 inline" />
                {formatCurrency(table.current_order.subtotal || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Capacity for available tables */}
        {table.status === 'available' && (
          <div className="text-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 inline mr-1" />
            {table.capacity} lugares
          </div>
        )}
      </CardContent>
    </Card>
  );
}
