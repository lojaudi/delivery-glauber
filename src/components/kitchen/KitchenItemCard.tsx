import { useState } from 'react';
import { Clock, ChefHat, CheckCircle, Loader2, Truck, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KitchenItem, useKitchenItemMutations } from '@/hooks/useKitchenItems';
import { cn } from '@/lib/utils';

interface KitchenItemCardProps {
  item: KitchenItem;
}

export function KitchenItemCard({ item }: KitchenItemCardProps) {
  const { updateItemStatus } = useKitchenItemMutations();
  const [isUpdating, setIsUpdating] = useState(false);

  // Calculate waiting time
  const waitingMinutes = Math.floor(
    (Date.now() - new Date(item.ordered_at).getTime()) / 60000
  );

  // Color based on waiting time
  const getTimeColor = () => {
    if (waitingMinutes < 5) return 'text-green-600 bg-green-100';
    if (waitingMinutes < 10) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const handleStatusChange = async (newStatus: 'preparing' | 'ready') => {
    setIsUpdating(true);
    try {
      await updateItemStatus(item.id, newStatus, item.order_type, item.order_id || undefined);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800', icon: Clock },
    preparing: { label: 'Preparando', color: 'bg-blue-100 text-blue-800', icon: ChefHat },
    ready: { label: 'Pronto', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  };

  const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Card className={cn(
      "transition-all duration-300",
      item.status === 'pending' && waitingMinutes >= 10 && "ring-2 ring-red-500 animate-pulse"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header with table/delivery info and time */}
        <div className="flex items-center justify-between">
          {item.order_type === 'table' ? (
            <Badge variant="outline" className="text-lg font-bold px-3 py-1">
              <UtensilsCrossed className="h-4 w-4 mr-1" />
              Mesa {item.table_number}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-lg font-bold px-3 py-1 border-orange-500 text-orange-600">
              <Truck className="h-4 w-4 mr-1" />
              Delivery #{item.order_id}
            </Badge>
          )}
          <Badge className={cn("text-sm", getTimeColor())}>
            <Clock className="h-3 w-3 mr-1" />
            {waitingMinutes} min
          </Badge>
        </div>

        {/* Customer name for delivery */}
        {item.order_type === 'delivery' && item.customer_name && (
          <p className="text-sm text-muted-foreground">
            Cliente: <span className="font-medium text-foreground">{item.customer_name}</span>
          </p>
        )}

        {/* Product info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{item.quantity}x</span>
            <span className="text-xl font-semibold text-foreground">{item.product_name}</span>
          </div>
          {item.observation && (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded-lg">
              📝 {item.observation}
            </p>
          )}
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <Badge className={config.color}>
            <config.icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          {item.waiter_name && (
            <span className="text-xs text-muted-foreground">
              Garçom: {item.waiter_name}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {item.status === 'pending' && (
            <Button 
              className="flex-1 text-lg py-6"
              onClick={() => handleStatusChange('preparing')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ChefHat className="h-5 w-5 mr-2" />
                  Preparando
                </>
              )}
            </Button>
          )}
          {item.status === 'preparing' && (
            <Button 
              className="flex-1 text-lg py-6 bg-green-600 hover:bg-green-700"
              onClick={() => handleStatusChange('ready')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Pronto!
                </>
              )}
            </Button>
          )}
          {item.status === 'ready' && (
            <div className="flex-1 text-center py-4 bg-green-100 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-1" />
              <p className="text-green-700 font-medium">Aguardando retirada</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
