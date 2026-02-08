import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Search, X, Receipt, Clock, Users, CreditCard, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClosedTableOrders } from '@/hooks/useTableOrders';
import { useTables } from '@/hooks/useTables';
import { TableOrder } from '@/types/pdv';

interface OrderHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderHistoryModal({ open, onOpenChange }: OrderHistoryModalProps) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today.toISOString().split('T')[0];
  });
  const [selectedTableId, setSelectedTableId] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const { tables } = useTables();
  const { orders, isLoading } = useClosedTableOrders(startDate, endDate);

  const filteredOrders = useMemo(() => {
    if (selectedTableId === 'all') return orders;
    if (selectedTableId === 'quick-sale') return orders.filter(o => !o.table_id);
    return orders.filter(o => o.table_id === selectedTableId);
  }, [orders, selectedTableId]);

  const stats = useMemo(() => {
    const total = filteredOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const count = filteredOrders.length;
    const avgTicket = count > 0 ? total / count : 0;
    return { total, count, avgTicket };
  }, [filteredOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getPaymentLabel = (method: string | null) => {
    const labels: Record<string, string> = {
      money: 'Dinheiro',
      card: 'Cartão',
      pix: 'PIX',
    };
    return labels[method || ''] || method || '-';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="destructive">Cancelado</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Histórico de Pedidos
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="startDate">Data Início</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">Data Fim</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Mesa</Label>
            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as mesas</SelectItem>
                <SelectItem value="quick-sale">Vendas Balcão</SelectItem>
                {tables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    Mesa {table.number} {table.name ? `(${table.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-primary/10">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(stats.total)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="font-bold text-lg">{stats.count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
              <p className="font-bold text-lg">{formatCurrency(stats.avgTicket)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pedido encontrado para o período selecionado.
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {filteredOrders.map((order) => {
                const table = tables.find(t => t.id === order.table_id);
                const isExpanded = expandedOrder === order.id;

                return (
                  <div
                    key={order.id}
                    className="border rounded-xl overflow-hidden"
                  >
                    <button
                      className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">
                              {table ? `Mesa ${table.number}` : 'Venda Balcão'}
                            </span>
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(order.closed_at || order.opened_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {order.customer_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {getPaymentLabel(order.payment_method)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-primary">
                            {formatCurrency(Number(order.total_amount))}
                          </p>
                          {Number(order.discount) > 0 && (
                            <p className="text-xs text-green-600">
                              Desconto: {formatCurrency(Number(order.discount))}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && order.items && order.items.length > 0 && (
                      <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                        <p className="text-sm font-medium text-muted-foreground mb-2 pt-3">Itens:</p>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>
                                {item.quantity}x {item.product_name}
                                {item.observation && (
                                  <span className="text-muted-foreground ml-1">({item.observation})</span>
                                )}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(item.quantity * Number(item.unit_price))}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t mt-3 pt-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(Number(order.subtotal))}</span>
                          </div>
                          {Number(order.discount) > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Desconto</span>
                              <span>-{formatCurrency(Number(order.discount))}</span>
                            </div>
                          )}
                          {order.service_fee_enabled && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Taxa de Serviço (10%)</span>
                              <span>{formatCurrency(Number(order.subtotal) * 0.1)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-base pt-1">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(Number(order.total_amount))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
