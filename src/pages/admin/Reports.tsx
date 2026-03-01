import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ClipboardList, Users, LayoutGrid, Truck, Filter, 
  Loader2, Download, TrendingUp, DollarSign, ShoppingBag, Clock
} from 'lucide-react';
import { useAdminRestaurant } from '@/hooks/useAdminRestaurant';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type DateRange = '7d' | '30d' | 'month' | 'custom';

function ReportsContent() {
  const { restaurantId } = useAdminRestaurant();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d': return { start: subDays(now, 7).toISOString(), end: now.toISOString() };
      case '30d': return { start: subDays(now, 30).toISOString(), end: now.toISOString() };
      case 'month': return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
      case 'custom': return { start: new Date(startDate).toISOString(), end: new Date(endDate + 'T23:59:59').toISOString() };
    }
  };

  // Delivery orders report
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-report-orders', restaurantId, dateRange, startDate, endDate],
    queryFn: async () => {
      const { start, end } = getDateFilter();
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantId!)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Table orders report
  const { data: tableOrders, isLoading: loadingTables } = useQuery({
    queryKey: ['admin-report-table-orders', restaurantId, dateRange, startDate, endDate],
    queryFn: async () => {
      const { start, end } = getDateFilter();
      const { data, error } = await supabase
        .from('table_orders')
        .select('*, table_order_items(*)')
        .eq('restaurant_id', restaurantId!)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Tables list
  const { data: tables } = useQuery({
    queryKey: ['admin-report-tables', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('number');
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Waiters list
  const { data: waiters } = useQuery({
    queryKey: ['admin-report-waiters', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waiters')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Aggregate stats
  const totalDeliveryRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const totalTableRevenue = tableOrders?.filter(o => o.status === 'paid').reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const paidTableOrders = tableOrders?.filter(o => o.status === 'paid').length || 0;

  // Waiter stats
  const waiterStats = waiters?.map(w => {
    const waiterOrders = tableOrders?.filter(o => o.waiter_id === w.id || o.waiter_name === w.name) || [];
    const paid = waiterOrders.filter(o => o.status === 'paid');
    return {
      ...w,
      totalOrders: waiterOrders.length,
      paidOrders: paid.length,
      revenue: paid.reduce((sum, o) => sum + Number(o.total_amount), 0),
    };
  }) || [];

  // Table stats
  const tableStats = tables?.map(t => {
    const tOrders = tableOrders?.filter(o => o.table_id === t.id) || [];
    const paid = tOrders.filter(o => o.status === 'paid');
    return {
      ...t,
      totalOrders: tOrders.length,
      paidOrders: paid.length,
      revenue: paid.reduce((sum, o) => sum + Number(o.total_amount), 0),
    };
  }) || [];

  // Payment method breakdown for delivery
  const paymentBreakdown = orders?.reduce((acc, o) => {
    const method = o.payment_method || 'outro';
    acc[method] = (acc[method] || 0) + Number(o.total_amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const paymentLabels: Record<string, string> = {
    money: 'Dinheiro', card: 'Cartão', pix: 'PIX', outro: 'Outro'
  };

  const isLoading = loadingOrders || loadingTables;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>

        {/* Date filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {dateRange === 'custom' && (
            <>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[140px]" />
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[140px]" />
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receita Delivery</p>
                <p className="text-lg font-bold text-foreground">R$ {totalDeliveryRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receita Mesas</p>
                <p className="text-lg font-bold text-foreground">R$ {totalTableRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pedidos Delivery</p>
                <p className="text-lg font-bold text-foreground">{completedOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comandas Pagas</p>
                <p className="text-lg font-bold text-foreground">{paidTableOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="delivery" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="delivery" className="flex items-center gap-1">
              <Truck className="h-4 w-4" /> Pedidos Delivery
            </TabsTrigger>
            <TabsTrigger value="waiters" className="flex items-center gap-1">
              <Users className="h-4 w-4" /> Garçons
            </TabsTrigger>
            <TabsTrigger value="tables" className="flex items-center gap-1">
              <LayoutGrid className="h-4 w-4" /> Mesas
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Pagamentos
            </TabsTrigger>
          </TabsList>

          {/* Delivery Orders Tab */}
          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pedidos de Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{paymentLabels[order.payment_method] || order.payment_method}</TableCell>
                          <TableCell className="text-right font-medium">R$ {Number(order.total_amount).toFixed(2)}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'dd/MM HH:mm', { locale: ptBR })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum pedido no período selecionado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waiters Tab */}
          <TabsContent value="waiters">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Relatório por Garçom</CardTitle>
              </CardHeader>
              <CardContent>
                {waiterStats.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Garçom</TableHead>
                        <TableHead className="text-center">Total Comandas</TableHead>
                        <TableHead className="text-center">Pagas</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waiterStats.map(w => (
                        <TableRow key={w.id}>
                          <TableCell className="font-medium">{w.name}</TableCell>
                          <TableCell className="text-center">{w.totalOrders}</TableCell>
                          <TableCell className="text-center">{w.paidOrders}</TableCell>
                          <TableCell className="text-right font-medium">R$ {w.revenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum garçom cadastrado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Relatório por Mesa</CardTitle>
              </CardHeader>
              <CardContent>
                {tableStats.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mesa</TableHead>
                        <TableHead className="text-center">Total Comandas</TableHead>
                        <TableHead className="text-center">Pagas</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableStats.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">Mesa {t.number}{t.name ? ` - ${t.name}` : ''}</TableCell>
                          <TableCell className="text-center">{t.totalOrders}</TableCell>
                          <TableCell className="text-center">{t.paidOrders}</TableCell>
                          <TableCell className="text-right font-medium">R$ {t.revenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhuma mesa cadastrada.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo por Forma de Pagamento (Delivery)</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(paymentBreakdown).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Forma de Pagamento</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(paymentBreakdown).map(([method, total]) => (
                        <TableRow key={method}>
                          <TableCell className="font-medium">{paymentLabels[method] || method}</TableCell>
                          <TableCell className="text-right font-medium">R$ {total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2">
                        <TableCell className="font-bold">Total Geral</TableCell>
                        <TableCell className="text-right font-bold">R$ {totalDeliveryRevenue.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum pagamento no período.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function Reports() {
  return (
    <AdminLayout title="Relatórios">
      <ReportsContent />
    </AdminLayout>
  );
}
