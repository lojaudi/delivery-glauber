import { Clock, Users, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TableWithOrder, TableStatus } from '@/types/pdv';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TableCardProps {
  table: TableWithOrder;
  onClick: () => void;
}

const statusConfig: Record<TableStatus, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Livre', color: 'text-green-700', bgColor: 'bg-green-100 border-green-300' },
  occupied: { label: 'Ocupada', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-300' },
  reserved: { label: 'Reservada', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
  requesting_bill: { label: 'Pedindo Conta', color: 'text-red-700', bgColor: 'bg-red-100 border-red-300 animate-pulse' },
};

// Get time-based color for occupied tables
function getTimeColor(openedAt: string): { bg: string; text: string; label: string } {
  const minutes = differenceInMinutes(new Date(), new Date(openedAt));
  
  if (minutes < 30) {
    return { bg: 'bg-green-500', text: 'text-green-700', label: `${minutes}min` };
  } else if (minutes < 60) {
    return { bg: 'bg-amber-500', text: 'text-amber-700', label: `${minutes}min` };
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { 
      bg: 'bg-red-500', 
      text: 'text-red-700', 
      label: `${hours}h${mins > 0 ? `${mins}min` : ''}` 
    };
  }
}

export function TableCard({ table, onClick }: TableCardProps) {
  const status = statusConfig[table.status];
  const order = table.current_order;
  const timeColor = order ? getTimeColor(order.opened_at) : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 relative",
        status.bgColor
      )}
      onClick={onClick}
    >
      {/* Time indicator for occupied tables */}
      {order && timeColor && (
        <div className={cn(
          "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow",
          timeColor.bg
        )}>
          {timeColor.label}
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Mesa {table.number}
            </h3>
            {table.name && (
              <p className="text-sm text-muted-foreground">{table.name}</p>
            )}
          </div>
          <Badge className={cn("font-medium", status.color)} variant="outline">
            {status.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Capacidade: {table.capacity}</span>
          </div>

          {order && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(order.opened_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              </div>

              {order.customer_count > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{order.customer_count} pessoa{order.customer_count > 1 ? 's' : ''}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <DollarSign className="h-4 w-4" />
                <span>{formatCurrency(Number(order.subtotal) || 0)}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
