import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LogOut, Truck, MapPin, Phone, CreditCard, Package, Check, X, Clock, Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface DeliveryAssignment {
  id: string;
  order_id: number;
  driver_id: string | null;
  restaurant_id: string;
  status: string;
  assigned_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  rejected_at: string | null;
}

interface OrderInfo {
  id: number;
  customer_name: string;
  customer_phone: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_complement: string | null;
  address_reference: string | null;
  total_amount: number;
  payment_method: string;
  change_for: number | null;
}

interface OrderItemInfo {
  product_name: string;
  quantity: number;
  observation: string | null;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { data: store } = useStoreConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useTheme();

  const driverId = localStorage.getItem('driver_id');
  const driverName = localStorage.getItem('driver_name');
  const restaurantId = localStorage.getItem('driver_restaurant_id');

  useEffect(() => {
    if (!driverId || !driverName) {
      navigate(slug ? `/r/${slug}/driver` : '/');
    }
  }, [driverId, driverName, navigate, slug]);

  // Fetch pending assignments (not yet accepted by anyone)
  const { data: pendingAssignments = [] } = useQuery({
    queryKey: ['driver-pending-assignments', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending')
        .order('assigned_at', { ascending: true });
      if (error) throw error;
      return data as DeliveryAssignment[];
    },
    enabled: !!restaurantId,
    refetchInterval: 10000,
  });

  // Fetch my active assignments
  const { data: myAssignments = [] } = useQuery({
    queryKey: ['driver-my-assignments', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'picked_up'])
        .order('accepted_at', { ascending: false });
      if (error) throw error;
      return data as DeliveryAssignment[];
    },
    enabled: !!driverId,
    refetchInterval: 10000,
  });

  // Fetch order details for all relevant assignments
  const allOrderIds = [...pendingAssignments, ...myAssignments].map(a => a.order_id);
  const { data: ordersMap = {} } = useQuery({
    queryKey: ['driver-orders-info', allOrderIds],
    queryFn: async () => {
      if (allOrderIds.length === 0) return {};
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, address_street, address_number, address_neighborhood, address_complement, address_reference, total_amount, payment_method, change_for')
        .in('id', allOrderIds);
      if (error) throw error;
      const map: Record<number, OrderInfo> = {};
      (data || []).forEach(o => { map[o.id] = o as OrderInfo; });
      return map;
    },
    enabled: allOrderIds.length > 0,
  });

  // Fetch order items for selected assignment
  const selectedOrderId = selectedAssignment
    ? [...pendingAssignments, ...myAssignments].find(a => a.id === selectedAssignment)?.order_id
    : null;

  const { data: orderItems = [] } = useQuery({
    queryKey: ['driver-order-items', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select('product_name, quantity, observation')
        .eq('order_id', selectedOrderId);
      if (error) throw error;
      return data as OrderItemInfo[];
    },
    enabled: !!selectedOrderId,
  });

  // Realtime subscription for delivery_assignments
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`driver-assignments-${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_assignments',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['driver-pending-assignments', restaurantId] });
        queryClient.invalidateQueries({ queryKey: ['driver-my-assignments', driverId] });
        if (payload.eventType === 'INSERT') {
          toast({ title: '🔔 Nova entrega disponível!', description: 'Um novo pedido precisa de entregador.' });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, driverId, queryClient, toast]);

  const handleAccept = async (assignmentId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('delivery_assignments')
        .update({ driver_id: driverId, status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .eq('status', 'pending');
      if (error) throw error;
      toast({ title: 'Entrega aceita!', description: 'Dirija-se ao estabelecimento para retirada.' });
      queryClient.invalidateQueries({ queryKey: ['driver-pending-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['driver-my-assignments'] });
    } catch {
      toast({ title: 'Erro ao aceitar entrega', variant: 'destructive' });
    }
    setIsUpdating(false);
  };

  const handleReject = async (assignmentId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('delivery_assignments')
        .update({ status: 'rejected', rejected_at: new Date().toISOString(), driver_id: driverId })
        .eq('id', assignmentId);
      if (error) throw error;
      toast({ title: 'Entrega rejeitada' });
      queryClient.invalidateQueries({ queryKey: ['driver-pending-assignments'] });
    } catch {
      toast({ title: 'Erro ao rejeitar', variant: 'destructive' });
    }
    setIsUpdating(false);
  };

  const handlePickedUp = async (assignmentId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('delivery_assignments')
        .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
        .eq('id', assignmentId);
      if (error) throw error;
      toast({ title: 'Produto retirado!', description: 'Agora leve até o cliente.' });
      queryClient.invalidateQueries({ queryKey: ['driver-my-assignments'] });
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
    setIsUpdating(false);
  };

  const handleDelivered = async (assignmentId: string, orderId: number) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('delivery_assignments')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', assignmentId);
      if (error) throw error;

      // Update order status to completed
      await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId);

      toast({ title: 'Entrega concluída! ✅' });
      queryClient.invalidateQueries({ queryKey: ['driver-my-assignments'] });
    } catch {
      toast({ title: 'Erro ao finalizar', variant: 'destructive' });
    }
    setIsUpdating(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('driver_id');
    localStorage.removeItem('driver_name');
    localStorage.removeItem('driver_restaurant_id');
    navigate(slug ? `/r/${slug}/driver` : '/');
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const paymentLabels: Record<string, string> = { money: 'Dinheiro', card: 'Cartão', pix: 'PIX' };

  const renderOrderCard = (assignment: DeliveryAssignment, type: 'pending' | 'active') => {
    const order = ordersMap[assignment.order_id];
    if (!order) return null;

    const isExpanded = selectedAssignment === assignment.id;

    return (
      <Card
        key={assignment.id}
        className={`cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-primary' : ''}`}
        onClick={() => setSelectedAssignment(isExpanded ? null : assignment.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pedido #{order.id}</CardTitle>
            <Badge variant={type === 'pending' ? 'secondary' : assignment.status === 'picked_up' ? 'default' : 'outline'}>
              {assignment.status === 'pending' && '⏳ Aguardando'}
              {assignment.status === 'accepted' && '📦 Retirar'}
              {assignment.status === 'picked_up' && '🚚 Em entrega'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{order.customer_name}</p>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Summary always visible */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{order.address_street}, {order.address_number} - {order.address_neighborhood}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>{paymentLabels[order.payment_method] || order.payment_method}</span>
              {order.payment_method === 'money' && order.change_for && (
                <span className="text-muted-foreground">(Troco p/ {formatCurrency(order.change_for)})</span>
              )}
            </div>
            <span className="font-bold text-foreground">{formatCurrency(order.total_amount)}</span>
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="pt-2 border-t border-border space-y-3">
              {/* Phone */}
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${order.customer_phone}`} className="text-primary underline">{order.customer_phone}</a>
              </div>

              {/* Address details */}
              {order.address_complement && (
                <p className="text-sm text-muted-foreground">Complemento: {order.address_complement}</p>
              )}
              {order.address_reference && (
                <p className="text-sm text-muted-foreground">Referência: {order.address_reference}</p>
              )}

              {/* Items */}
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Package className="h-4 w-4" /> Itens:
                </p>
                {orderItems.map((item, i) => (
                  <div key={i} className="text-sm text-muted-foreground ml-5">
                    {item.quantity}x {item.product_name}
                    {item.observation && <span className="italic"> — {item.observation}</span>}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2" onClick={e => e.stopPropagation()}>
                {type === 'pending' && (
                  <>
                    <Button
                      className="flex-1"
                      onClick={() => handleAccept(assignment.id)}
                      disabled={isUpdating}
                    >
                      <Check className="h-4 w-4 mr-2" />Aceitar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(assignment.id)}
                      disabled={isUpdating}
                    >
                      <X className="h-4 w-4 mr-2" />Rejeitar
                    </Button>
                  </>
                )}
                {assignment.status === 'accepted' && (
                  <Button
                    className="w-full"
                    onClick={() => handlePickedUp(assignment.id)}
                    disabled={isUpdating}
                  >
                    <Package className="h-4 w-4 mr-2" />Retirei o Pedido
                  </Button>
                )}
                {assignment.status === 'picked_up' && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleDelivered(assignment.id, assignment.order_id)}
                    disabled={isUpdating}
                  >
                    <Check className="h-4 w-4 mr-2" />Entreguei ao Cliente
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Helmet>
        <title>{`Painel Entregador - ${store?.name || 'Restaurante'}`}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5" />Olá, {driverName}!
              </h1>
              <p className="text-sm text-muted-foreground">{store?.name}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 p-4">
          <div className="bg-amber-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{pendingAssignments.length}</p>
            <p className="text-xs text-amber-600">Disponíveis</p>
          </div>
          <div className="bg-blue-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{myAssignments.length}</p>
            <p className="text-xs text-blue-600">Minhas Entregas</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-6 space-y-6">
          {/* Pending assignments */}
          {pendingAssignments.length > 0 && (
            <div>
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                Entregas Disponíveis
              </h2>
              <div className="space-y-3">
                {pendingAssignments.map(a => renderOrderCard(a, 'pending'))}
              </div>
            </div>
          )}

          {/* My active assignments */}
          {myAssignments.length > 0 && (
            <div>
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-500" />
                Minhas Entregas Ativas
              </h2>
              <div className="space-y-3">
                {myAssignments.map(a => renderOrderCard(a, 'active'))}
              </div>
            </div>
          )}

          {pendingAssignments.length === 0 && myAssignments.length === 0 && (
            <div className="text-center py-16">
              <Truck className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg">Nenhuma entrega no momento</p>
              <p className="text-sm text-muted-foreground mt-1">Novas entregas aparecerão aqui automaticamente</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
