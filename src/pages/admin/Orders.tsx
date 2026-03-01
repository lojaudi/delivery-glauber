import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, Calendar, TrendingUp, Package, DollarSign, CheckCircle2, GripVertical, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useStoreConfig } from '@/hooks/useStore';
import { useOrders, useOrderItems, useUpdateOrderStatus, Order } from '@/hooks/useOrders';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';

type DateFilter = 'today' | 'week' | 'month' | 'all';
type OrderStatus = 'pending' | 'preparing' | 'delivery' | 'completed';

const columns: { id: OrderStatus; label: string; color: string }[] = [
  { id: 'pending', label: 'Pendentes', color: 'bg-warning/10' },
  { id: 'preparing', label: 'Em Preparo', color: 'bg-primary/10' },
  { id: 'delivery', label: 'Saiu p/ Entrega', color: 'bg-secondary/10' },
  { id: 'completed', label: 'Finalizados', color: 'bg-green-500/10' },
];

const COLORS = ['hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(142, 76%, 36%)'];

// Draggable Order Card Wrapper
function DraggableOrderCard({ order, store, onOpenDetails }: { order: Order; store: any; onOpenDetails: (order: Order) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id.toString(),
    data: { order },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <OrderCardContent order={order} store={store} onOpenDetails={onOpenDetails} dragListeners={listeners} />
    </div>
  );
}

// Droppable Column
function DroppableColumn({ id, children, color, label, count }: { id: string; children: React.ReactNode; color: string; label: string; count: number }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`rounded-xl sm:rounded-2xl ${color} p-3 sm:p-4 min-w-0 transition-all ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="font-bold text-foreground text-sm sm:text-base">{label}</h2>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      
      <div className="space-y-3 sm:space-y-4 max-h-[400px] sm:max-h-[600px] overflow-y-auto min-h-[100px]">
        {children}
      </div>
    </div>
  );
}

// Order Card Content
function OrderCardContent({ order, store, onOpenDetails, dragListeners }: { order: Order; store: any; onOpenDetails: (order: Order) => void; dragListeners?: any }) {
  const { data: items } = useOrderItems(order.id);
  const updateStatus = useUpdateOrderStatus();

  const formatCurrency = (value: number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'pix':
        return '💠 PIX';
      case 'money':
        return `💵 Troco p/ R$ ${order.change_for || ''}`;
      case 'card':
        return '💳 Levar Máquina';
      default:
        return method;
    }
  };

  const sendWhatsAppMessage = async (e: React.MouseEvent, messageType: 'pix' | 'accepted' | 'preparing' | 'delivery' | 'completed') => {
    e.stopPropagation();
    
    // Buscar itens do pedido
    const { data: orderItems } = await import('@/integrations/supabase/client').then(m => 
      m.supabase.from('order_items').select('*').eq('order_id', order.id)
    );
    
    // Formatar lista de produtos
    const itemsList = orderItems?.map(item => {
      let line = `${formatCurrency(item.unit_price * item.quantity)} ${item.quantity}x ${item.product_name}`;
      if (item.observation) {
        line += `\n   📝 ${item.observation}`;
      }
      return line;
    }).join('\n') || '';

    // Calcular valores
    const subtotal = orderItems?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
    const deliveryFee = order.total_amount - subtotal;
    
    // Forma de pagamento
    const paymentLabels: Record<string, string> = {
      pix: 'Pix Online',
      money: `Dinheiro (Troco para R$ ${order.change_for || 'não informado'})`,
      card: 'Cartão na entrega'
    };
    const paymentLabel = paymentLabels[order.payment_method] || order.payment_method;
    
    // Endereço completo
    const addressParts = [
      order.address_street,
      order.address_number ? `Nº ${order.address_number}` : '',
      order.address_complement || '',
      order.address_neighborhood
    ].filter(Boolean).join(', ');
    
    // Previsão de entrega (30-45 min padrão)
    const now = new Date();
    const deliveryMin = new Date(now.getTime() + (store?.delivery_time_min || 30) * 60000);
    const deliveryMax = new Date(now.getTime() + (store?.delivery_time_max || 45) * 60000);
    const deliveryTime = `${deliveryMin.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${deliveryMax.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    
    // Status do pagamento
    const paymentStatus = order.payment_method === 'pix' 
      ? 'Já recebemos seu pagamento. ✅' 
      : 'Pagamento na entrega.';

    const defaultMessages = {
      pix: `Oi, {nome}! Seu pedido de {total} está aguardando o pagamento; para finalizar, basta copiar a chave Pix que vou enviar logo abaixo. 😊\n\n💠 *Chave Pix ({tipo_chave}):*\n{chave_pix}`,
      accepted: `Olá {nome}, seu pedido foi confirmado e está sendo preparado 🥰\n\n*Pedido: #{pedido}*\n---------------------------------------\n📦 *Produtos*\n{produtos}\n---------------------------------------\n{subtotal} Total dos produtos\n{taxa_entrega} Taxa de entrega\n*{total} Total*\n\nForma de pagamento: {forma_pagamento}\n{status_pagamento}\n---------------------------------------\n👤 Nome: {nome}\n📍 Bairro: {bairro}\n🏠 Rua: {rua}\n🔢 Número: {numero}\n{complemento}🕐 Previsão de entrega: {previsao}\n\nObrigado pela preferência 😉`,
      preparing: `Olá {nome}! 👨‍🍳\n\nSeu pedido #{pedido} está sendo preparado com muito carinho!\n\nEm breve sairá para entrega! 🚀`,
      delivery: `Olá, {nome}! 🛵\n\nSeu pedido #{pedido} saiu para entrega!\n\nEm breve chegará até você! 📍`,
      completed: `Olá {nome}! 🎉\n\nSeu pedido #{pedido} foi entregue com sucesso!\n\nObrigado pela preferência! ❤️\nEsperamos você novamente em breve!`,
    };
    
    const storeMessages = {
      pix: store?.pix_message,
      accepted: store?.msg_order_accepted,
      preparing: store?.msg_order_preparing,
      delivery: store?.msg_order_delivery,
      completed: store?.msg_order_completed,
    };
    
    const template = storeMessages[messageType] || defaultMessages[messageType];
    
    const message = template
      .replace(/{nome}/g, order.customer_name)
      .replace(/{pedido}/g, String(order.id))
      .replace(/{total}/g, formatCurrency(order.total_amount))
      .replace(/{subtotal}/g, formatCurrency(subtotal))
      .replace(/{taxa_entrega}/g, formatCurrency(deliveryFee))
      .replace(/{chave_pix}/g, store?.pix_key || '')
      .replace(/{tipo_chave}/g, store?.pix_key_type || 'Chave')
      .replace(/{produtos}/g, itemsList)
      .replace(/{forma_pagamento}/g, paymentLabel)
      .replace(/{status_pagamento}/g, paymentStatus)
      .replace(/{bairro}/g, order.address_neighborhood || '')
      .replace(/{rua}/g, order.address_street || '')
      .replace(/{numero}/g, order.address_number || '')
      .replace(/{complemento}/g, order.address_complement ? `🏷️ Complemento: ${order.address_complement}\n` : '')
      .replace(/{endereco}/g, addressParts)
      .replace(/{previsao}/g, deliveryTime);
    
    const phoneNumber = order.customer_phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Tentar abrir em nova aba, se bloqueado, abrir na mesma janela
    const newWindow = window.open(whatsappUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Popup bloqueado - redirecionar na mesma janela como fallback
      window.location.href = whatsappUrl;
    }
  };

  const getNextStatus = (status: Order['status']): Order['status'] | null => {
    const flow: Record<string, Order['status']> = {
      pending: 'preparing',
      preparing: 'delivery',
      delivery: 'completed',
    };
    return flow[status] || null;
  };

  const getNextStatusLabel = (status: Order['status']) => {
    const labels: Record<string, string> = {
      pending: 'Aceitar',
      preparing: 'Despachar',
      delivery: 'Finalizar',
    };
    return labels[status];
  };

  const handleStatusUpdate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = getNextStatus(order.status);
    if (next) {
      updateStatus.mutate({ orderId: order.id, status: next });
    }
  };

  const isCompleted = order.status === 'completed';

  return (
    <div className="rounded-xl bg-card p-3 sm:p-4 shadow-card animate-slide-up min-w-0 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" onClick={() => onOpenDetails(order)}>
      {/* Order Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {dragListeners && (
            <div {...dragListeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base sm:text-lg text-foreground">#{order.id}</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{order.customer_name}</p>
            {isCompleted && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(order.updated_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
        <Badge variant={order.payment_method as any} className="text-[10px] sm:text-xs flex-shrink-0 whitespace-nowrap">
          {getPaymentLabel(order.payment_method)}
        </Badge>
      </div>

      {/* Order Items */}
      <div className="space-y-1 mb-3 text-sm">
        {items?.map((item) => (
          <div key={item.id}>
            <span className="text-foreground">
              {item.quantity}x {item.product_name}
            </span>
            {item.observation && (
              <p className="text-xs text-warning">📝 {item.observation}</p>
            )}
          </div>
        ))}
      </div>

      {/* Order Footer */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold text-foreground">
            {formatCurrency(order.total_amount)}
          </span>
        </div>

        {!isCompleted && (
          <div className="flex flex-col gap-2">
            {/* WhatsApp Buttons by Status */}
            <div className="flex gap-1">
              {order.status === 'pending' && order.payment_method === 'pix' && (
                <Button
                  variant="whatsapp"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={(e) => sendWhatsAppMessage(e, 'pix')}
                >
                  💠 PIX
                </Button>
              )}
              {order.status === 'pending' && (
                <Button
                  variant="whatsapp"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={(e) => sendWhatsAppMessage(e, 'accepted')}
                >
                  ✅ Aceito
                </Button>
              )}
              {order.status === 'delivery' && (
                <Button
                  variant="whatsapp"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={(e) => sendWhatsAppMessage(e, 'delivery')}
                >
                  🛵 Entrega
                </Button>
              )}
            </div>
            
            {/* Status Action Button */}
            {getNextStatus(order.status) && (
              <Button
                size="sm"
                className="w-full"
                onClick={handleStatusUpdate}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  getNextStatusLabel(order.status)
                )}
              </Button>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="space-y-2">
            <Button
              variant="whatsapp"
              size="sm"
              className="w-full text-xs"
              onClick={(e) => sendWhatsAppMessage(e, 'completed')}
            >
              🎉 Agradecer
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Entregue</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, trend, color }: { 
  title: string; 
  value: string; 
  icon: typeof Package; 
  trend?: string;
  color: string;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{value}</p>
            {trend && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{trend}</span>
              </p>
            )}
          </div>
          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const AdminOrders = () => {
  const { data: store } = useStoreConfig();
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousPendingCount = useRef<number>(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [viewMode, setViewMode] = useState<'kanban' | 'stats'>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Enable realtime updates for orders
  useOrdersRealtime();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Play sound when new pending order arrives
  useEffect(() => {
    if (!orders) return;
    
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    
    if (pendingCount > previousPendingCount.current && previousPendingCount.current !== 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
    
    previousPendingCount.current = pendingCount;
  }, [orders]);

  // Filter orders by date
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateFilter) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now, { locale: ptBR });
        end = endOfWeek(now, { locale: ptBR });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'all':
        return orders;
    }

    return orders.filter(order => 
      isWithinInterval(new Date(order.created_at), { start, end })
    );
  }, [orders, dateFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalOrders, totalRevenue, completedOrders, pendingOrders, avgOrderValue };
  }, [filteredOrders]);

  // Chart data for orders over time
  const ordersOverTime = useMemo(() => {
    if (!orders) return [];
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'dd/MM'),
        pedidos: orders.filter(o => 
          format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        ).length,
        receita: orders
          .filter(o => format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
          .reduce((sum, o) => sum + Number(o.total_amount), 0),
      };
    });

    return last7Days;
  }, [orders]);

  // Payment methods distribution
  const paymentDistribution = useMemo(() => {
    const methods = { pix: 0, money: 0, card: 0 };
    filteredOrders.forEach(o => {
      if (methods[o.payment_method as keyof typeof methods] !== undefined) {
        methods[o.payment_method as keyof typeof methods]++;
      }
    });
    return [
      { name: 'PIX', value: methods.pix, color: '#00BFFF' },
      { name: 'Dinheiro', value: methods.money, color: '#32CD32' },
      { name: 'Cartão', value: methods.card, color: '#9370DB' },
    ].filter(item => item.value > 0);
  }, [filteredOrders]);

  // Status distribution for bar chart
  const statusDistribution = useMemo(() => {
    return columns.map(col => ({
      name: col.label,
      quantidade: filteredOrders.filter(o => o.status === col.id).length,
    }));
  }, [filteredOrders]);

  const formatCurrency = (value: number) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleDragStart = (event: DragStartEvent) => {
    const order = (event.active.data.current as any)?.order as Order;
    setActiveOrder(order);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = parseInt(active.id as string);
    const newStatus = over.id as OrderStatus;
    const order = filteredOrders.find(o => o.id === orderId);

    if (order && order.status !== newStatus) {
      updateStatus.mutate({ orderId, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Pedidos">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pedidos">
      {/* Alert sound */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      {/* Filters and View Toggle */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-[120px] sm:w-40">
            <Calendar className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 sm:gap-2 ml-auto">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="px-2 sm:px-3"
          >
            <Package className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Kanban</span>
          </Button>
          <Button
            variant={viewMode === 'stats' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('stats')}
            className="px-2 sm:px-3"
          >
            <TrendingUp className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Estatísticas</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatsCard 
          title="Total Pedidos" 
          value={stats.totalOrders.toString()} 
          icon={Package}
          color="bg-primary"
        />
        <StatsCard 
          title="Receita" 
          value={formatCurrency(stats.totalRevenue)} 
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatsCard 
          title="Finalizados" 
          value={stats.completedOrders.toString()} 
          icon={CheckCircle2}
          color="bg-blue-500"
        />
        <StatsCard 
          title="Ticket Médio" 
          value={formatCurrency(stats.avgOrderValue)} 
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Orders Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pedidos nos últimos 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ordersOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pedidos" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita nos últimos 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ordersOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="receita" 
                      stroke="hsl(142, 76%, 36%)" 
                      fill="hsl(142, 76%, 36%)" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Pie Chart */}
          {paymentDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formas de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Distribution Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pedidos por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban View with Drag and Drop */}
      {viewMode === 'kanban' && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
            {columns.map((column) => {
              const columnOrders = filteredOrders.filter(o => o.status === column.id);
              
              return (
                <DroppableColumn
                  key={column.id}
                  id={column.id}
                  color={column.color}
                  label={column.label}
                  count={columnOrders.length}
                >
                  {columnOrders.map((order) => (
                    <DraggableOrderCard
                      key={order.id}
                      order={order}
                      store={store}
                      onOpenDetails={setSelectedOrder}
                    />
                  ))}

                  {columnOrders.length === 0 && (
                    <div className="py-8 sm:py-12 text-center">
                      <p className="text-muted-foreground text-sm">
                        Nenhum pedido
                      </p>
                    </div>
                  )}
                </DroppableColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeOrder && (
              <div className="opacity-90">
                <OrderCardContent
                  order={activeOrder}
                  store={store}
                  onOpenDetails={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal 
        order={selectedOrder} 
        open={!!selectedOrder} 
        onOpenChange={(open) => !open && setSelectedOrder(null)} 
      />
    </AdminLayout>
  );
};

export default AdminOrders;
