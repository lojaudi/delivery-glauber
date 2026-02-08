import { useState } from 'react';
import { ArrowLeft, Plus, Clock, Users, Trash2, ReceiptText, X, User, ArrowRightLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { TableWithOrder, OrderItemStatus } from '@/types/pdv';
import { useTableOrder, useTableOrderMutations } from '@/hooks/useTableOrders';
import { AddItemModal } from './AddItemModal';
import { TransferTableModal } from './TransferTableModal';
import { PrintReceiptButton } from './PrintReceiptButton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useStoreConfig } from '@/hooks/useStore';

interface TableOrderScreenProps {
  table: TableWithOrder;
  onBack?: () => void;
  onCheckout?: () => void;
  onTableTransferred?: (newTableId: string) => void;
}

const statusConfig: Record<OrderItemStatus, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  preparing: { label: 'Preparando', color: 'bg-blue-100 text-blue-800' },
  ready: { label: 'Pronto', color: 'bg-green-100 text-green-800' },
  delivered: { label: 'Entregue', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export function TableOrderScreen({ table, onBack, onCheckout, onTableTransferred }: TableOrderScreenProps) {
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const { order, items, isLoading } = useTableOrder(table.current_order_id);
  const { updateItemStatus, removeItem, requestBill, cancelOrder, transferTable } = useTableOrderMutations();
  const { data: store } = useStoreConfig();

  // Prepare print data
  const printData = order && items ? {
    orderNumber: order.id,
    orderType: 'table' as const,
    tableName: `Mesa ${table.number}`,
    waiterName: order.waiter_name || undefined,
    items: items.filter(i => i.status !== 'cancelled').map(item => ({
      name: item.product_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      observation: item.observation || undefined,
    })),
    subtotal: items.filter(i => i.status !== 'cancelled').reduce((sum, item) => sum + (item.quantity * Number(item.unit_price)), 0),
    serviceFee: order.service_fee_enabled ? (order.service_fee_percentage || 10) : undefined,
    discount: order.discount || undefined,
    total: order.total_amount || 0,
    createdAt: new Date(order.opened_at || order.created_at),
  } : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleStatusChange = async (itemId: string, newStatus: OrderItemStatus) => {
    if (!order) return;
    await updateItemStatus.mutateAsync({ itemId, status: newStatus, orderId: order.id });
  };

  const handleRemoveItem = async () => {
    if (!itemToRemove || !order) return;
    await removeItem.mutateAsync({ itemId: itemToRemove, orderId: order.id });
    setItemToRemove(null);
  };

  const handleRequestBill = async () => {
    if (!order) return;
    await requestBill.mutateAsync({ orderId: order.id, tableId: table.id });
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    await cancelOrder.mutateAsync({ orderId: order.id, tableId: table.id });
    setCancelDialogOpen(false);
    onBack?.();
  };

  const handleTransfer = async (targetTableId: string) => {
    if (!order) return;
    await transferTable.mutateAsync({
      orderId: order.id,
      fromTableId: table.id,
      toTableId: targetTableId,
    });
    onTableTransferred?.(targetTableId);
    onBack?.();
  };

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const activeItems = items.filter(i => i.status !== 'cancelled');
  const subtotal = activeItems.reduce((sum, item) => sum + (item.quantity * Number(item.unit_price)), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold">Mesa {table.number}</h1>
            {table.name && <p className="text-sm text-muted-foreground">{table.name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {printData && (
            <PrintReceiptButton orderData={printData} variant="outline" size="sm" />
          )}
          <Button variant="outline" size="sm" onClick={() => setTransferModalOpen(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            Transferir
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpen(true)}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </div>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tempo</p>
              <p className="font-medium text-sm">
                {formatDistanceToNow(new Date(order.opened_at), { locale: ptBR })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Pessoas</p>
              <p className="font-medium text-sm">{order.customer_count}</p>
            </div>
          </CardContent>
        </Card>
        {order.waiter_name && (
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Atendente</p>
                <p className="font-medium text-sm">{order.waiter_name}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="bg-primary/10">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-bold text-lg text-primary">{formatCurrency(subtotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Itens do Pedido</CardTitle>
            <Button onClick={() => setAddItemOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item adicionado</p>
              <Button variant="outline" className="mt-2" onClick={() => setAddItemOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {item.quantity}x {item.product_name}
                          </p>
                          {item.observation && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Obs: {item.observation}
                            </p>
                          )}
                        </div>
                        <p className="font-bold">
                          {formatCurrency(item.quantity * Number(item.unit_price))}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {(['pending', 'preparing', 'ready', 'delivered'] as OrderItemStatus[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(item.id, status)}
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium transition-all",
                              item.status === status
                                ? statusConfig[status].color
                                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                            )}
                          >
                            {statusConfig[status].label}
                          </button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => setItemToRemove(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleRequestBill}
          disabled={order.status === 'requesting_bill' || activeItems.length === 0}
        >
          <ReceiptText className="h-4 w-4 mr-2" />
          {order.status === 'requesting_bill' ? 'Aguardando...' : 'Pedir Conta'}
        </Button>
        {onCheckout && (
          <Button
            className="flex-1"
            onClick={onCheckout}
            disabled={activeItems.length === 0}
          >
            Fechar Mesa
          </Button>
        )}
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        orderId={order.id}
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
      />

      {/* Remove Item Dialog */}
      <AlertDialog open={!!itemToRemove} onOpenChange={() => setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O item será removido da comanda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveItem} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Order Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá cancelar o pedido inteiro e liberar a mesa. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOrder} className="bg-destructive text-destructive-foreground">
              Cancelar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Table Modal */}
      {order && (
        <TransferTableModal
          currentTable={table}
          orderId={order.id}
          open={transferModalOpen}
          onOpenChange={setTransferModalOpen}
          onTransfer={handleTransfer}
          isTransferring={transferTable.isPending}
        />
      )}
    </div>
  );
}
