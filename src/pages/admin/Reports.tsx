import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, LayoutGrid, Truck, Filter, 
  Loader2, Download, TrendingUp, DollarSign, ShoppingBag
} from 'lucide-react';
import { useAdminRestaurant } from '@/hooks/useAdminRestaurant';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DateRange = '7d' | '30d' | 'month' | 'custom';

const statusLabels: Record<string, string> = {
  pending: 'Pendente', preparing: 'Preparando', delivery: 'Em entrega',
  completed: 'Concluído', cancelled: 'Cancelado',
};

const paymentLabels: Record<string, string> = {
  money: 'Dinheiro', card: 'Cartão', pix: 'PIX', outro: 'Outro'
};

function exportPDF(title: string, headers: string[], rows: string[][]) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 28);
  autoTable(doc, {
    startY: 34,
    head: [headers],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });
  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
}

function ReportsContent() {
  const { restaurantId } = useAdminRestaurant();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Delivery filters
  const [deliveryNameFilter, setDeliveryNameFilter] = useState('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set());

  // Waiter filters
  const [waiterNameFilter, setWaiterNameFilter] = useState('');
  const [selectedWaiterIds, setSelectedWaiterIds] = useState<Set<string>>(new Set());

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d': return { start: subDays(now, 7).toISOString(), end: now.toISOString() };
      case '30d': return { start: subDays(now, 30).toISOString(), end: now.toISOString() };
      case 'month': return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
      case 'custom': return { start: new Date(startDate).toISOString(), end: new Date(endDate + 'T23:59:59').toISOString() };
    }
  };

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-report-orders', restaurantId, dateRange, startDate, endDate],
    queryFn: async () => {
      const { start, end } = getDateFilter();
      const { data, error } = await supabase
        .from('orders').select('*, order_items(*)')
        .eq('restaurant_id', restaurantId!)
        .gte('created_at', start).lte('created_at', end)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: tableOrders, isLoading: loadingTables } = useQuery({
    queryKey: ['admin-report-table-orders', restaurantId, dateRange, startDate, endDate],
    queryFn: async () => {
      const { start, end } = getDateFilter();
      const { data, error } = await supabase
        .from('table_orders').select('*, table_order_items(*)')
        .eq('restaurant_id', restaurantId!)
        .gte('created_at', start).lte('created_at', end)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: tables } = useQuery({
    queryKey: ['admin-report-tables', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tables').select('*').eq('restaurant_id', restaurantId!).order('number');
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: waiters } = useQuery({
    queryKey: ['admin-report-waiters', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waiters').select('*').eq('restaurant_id', restaurantId!).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Filtered delivery orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      if (deliveryNameFilter && !o.customer_name.toLowerCase().includes(deliveryNameFilter.toLowerCase())) return false;
      if (deliveryStatusFilter !== 'all' && o.status !== deliveryStatusFilter) return false;
      return true;
    });
  }, [orders, deliveryNameFilter, deliveryStatusFilter]);

  // Aggregate stats
  const totalDeliveryRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const totalTableRevenue = tableOrders?.filter(o => o.status === 'paid').reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const paidTableOrders = tableOrders?.filter(o => o.status === 'paid').length || 0;

  // Waiter stats with table breakdown
  const waiterStats = useMemo(() => {
    return (waiters || []).map(w => {
      const waiterOrders = (tableOrders || []).filter(o => o.waiter_id === w.id || o.waiter_name === w.name);
      const paid = waiterOrders.filter(o => o.status === 'paid');
      const tableBreakdown = (tables || []).map(t => {
        const tOrders = paid.filter(o => o.table_id === t.id);
        return { tableNumber: t.number, tableName: t.name, revenue: tOrders.reduce((s, o) => s + Number(o.total_amount), 0), count: tOrders.length };
      }).filter(tb => tb.count > 0);
      return {
        ...w,
        totalOrders: waiterOrders.length,
        paidOrders: paid.length,
        revenue: paid.reduce((sum, o) => sum + Number(o.total_amount), 0),
        tableBreakdown,
      };
    });
  }, [waiters, tableOrders, tables]);

  const filteredWaiterStats = useMemo(() => {
    if (!waiterNameFilter) return waiterStats;
    return waiterStats.filter(w => w.name.toLowerCase().includes(waiterNameFilter.toLowerCase()));
  }, [waiterStats, waiterNameFilter]);

  // Table stats
  const tableStats = useMemo(() => {
    return (tables || []).map(t => {
      const tOrders = (tableOrders || []).filter(o => o.table_id === t.id);
      const paid = tOrders.filter(o => o.status === 'paid');
      return { ...t, totalOrders: tOrders.length, paidOrders: paid.length, revenue: paid.reduce((sum, o) => sum + Number(o.total_amount), 0) };
    });
  }, [tables, tableOrders]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    return (orders || []).reduce((acc, o) => {
      const method = o.payment_method || 'outro';
      acc[method] = (acc[method] || 0) + Number(o.total_amount);
      return acc;
    }, {} as Record<string, number>);
  }, [orders]);

  const isLoading = loadingOrders || loadingTables;

  // Toggle helpers
  const toggleDelivery = (id: number) => {
    setSelectedDeliveryIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAllDelivery = () => {
    if (selectedDeliveryIds.size === filteredOrders.length) setSelectedDeliveryIds(new Set());
    else setSelectedDeliveryIds(new Set(filteredOrders.map(o => o.id)));
  };
  const toggleWaiter = (id: string) => {
    setSelectedWaiterIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAllWaiters = () => {
    if (selectedWaiterIds.size === filteredWaiterStats.length) setSelectedWaiterIds(new Set());
    else setSelectedWaiterIds(new Set(filteredWaiterStats.map(w => w.id)));
  };

  // PDF Exports
  const exportDeliveryPDF = () => {
    const data = selectedDeliveryIds.size > 0
      ? filteredOrders.filter(o => selectedDeliveryIds.has(o.id))
      : filteredOrders;
    exportPDF('Relatório de Delivery', ['#', 'Cliente', 'Status', 'Pagamento', 'Total', 'Data'],
      data.map(o => [
        `#${o.id}`, o.customer_name, statusLabels[o.status] || o.status,
        paymentLabels[o.payment_method] || o.payment_method,
        `R$ ${Number(o.total_amount).toFixed(2)}`,
        format(new Date(o.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
      ])
    );
  };

  const exportWaiterPDF = () => {
    const data = selectedWaiterIds.size > 0
      ? filteredWaiterStats.filter(w => selectedWaiterIds.has(w.id))
      : filteredWaiterStats;
    
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório por Garçom', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 28);
    
    let currentY = 34;
    
    // Summary table
    autoTable(doc, {
      startY: currentY,
      head: [['Garçom', 'Total Comandas', 'Pagas', 'Receita Total']],
      body: data.map(w => [w.name, String(w.totalOrders), String(w.paidOrders), `R$ ${w.revenue.toFixed(2)}`]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Per-waiter table breakdown
    data.forEach(w => {
      if (w.tableBreakdown.length === 0) return;
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.text(`${w.name} - Detalhamento por Mesa`, 14, currentY);
      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        head: [['Mesa', 'Comandas Pagas', 'Receita']],
        body: w.tableBreakdown.map(tb => [
          `Mesa ${tb.tableNumber}${tb.tableName ? ` - ${tb.tableName}` : ''}`,
          String(tb.count), `R$ ${tb.revenue.toFixed(2)}`
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [39, 174, 96] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save('Relatório_Garçons.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
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
        {[
          { icon: DollarSign, label: 'Receita Delivery', value: `R$ ${totalDeliveryRevenue.toFixed(2)}` },
          { icon: LayoutGrid, label: 'Receita Mesas', value: `R$ ${totalTableRevenue.toFixed(2)}` },
          { icon: ShoppingBag, label: 'Pedidos Delivery', value: completedOrders },
          { icon: TrendingUp, label: 'Comandas Pagas', value: paidTableOrders },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><item.icon className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold text-foreground">{item.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="delivery" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="delivery" className="flex items-center gap-1"><Truck className="h-4 w-4" /> Pedidos Delivery</TabsTrigger>
            <TabsTrigger value="waiters" className="flex items-center gap-1"><Users className="h-4 w-4" /> Garçons</TabsTrigger>
            <TabsTrigger value="tables" className="flex items-center gap-1"><LayoutGrid className="h-4 w-4" /> Mesas</TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Pagamentos</TabsTrigger>
          </TabsList>

          {/* Delivery Tab */}
          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg">Pedidos de Delivery</CardTitle>
                  <Button onClick={exportDeliveryPDF} size="sm" variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" /> Baixar PDF
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Input placeholder="Filtrar por nome do cliente..." value={deliveryNameFilter}
                    onChange={e => setDeliveryNameFilter(e.target.value)} className="w-[220px]" />
                  <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="preparing">Preparando</SelectItem>
                      <SelectItem value="delivery">Em entrega</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredOrders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={selectedDeliveryIds.size === filteredOrders.length && filteredOrders.length > 0}
                            onCheckedChange={toggleAllDelivery} />
                        </TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell><Checkbox checked={selectedDeliveryIds.has(order.id)} onCheckedChange={() => toggleDelivery(order.id)} /></TableCell>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell><Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>{statusLabels[order.status] || order.status}</Badge></TableCell>
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg">Relatório por Garçom</CardTitle>
                  <Button onClick={exportWaiterPDF} size="sm" variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" /> Baixar PDF
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Input placeholder="Filtrar por nome do garçom..." value={waiterNameFilter}
                    onChange={e => setWaiterNameFilter(e.target.value)} className="w-[220px]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {filteredWaiterStats.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox checked={selectedWaiterIds.size === filteredWaiterStats.length && filteredWaiterStats.length > 0}
                              onCheckedChange={toggleAllWaiters} />
                          </TableHead>
                          <TableHead>Garçom</TableHead>
                          <TableHead className="text-center">Total Comandas</TableHead>
                          <TableHead className="text-center">Pagas</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWaiterStats.map(w => (
                          <TableRow key={w.id}>
                            <TableCell><Checkbox checked={selectedWaiterIds.has(w.id)} onCheckedChange={() => toggleWaiter(w.id)} /></TableCell>
                            <TableCell className="font-medium">{w.name}</TableCell>
                            <TableCell className="text-center">{w.totalOrders}</TableCell>
                            <TableCell className="text-center">{w.paidOrders}</TableCell>
                            <TableCell className="text-right font-medium">R$ {w.revenue.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Table breakdown per selected waiter */}
                    {filteredWaiterStats
                      .filter(w => selectedWaiterIds.has(w.id) && w.tableBreakdown.length > 0)
                      .map(w => (
                        <Card key={w.id} className="border-dashed">
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm">{w.name} — Detalhamento por Mesa</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Mesa</TableHead>
                                  <TableHead className="text-center">Comandas Pagas</TableHead>
                                  <TableHead className="text-right">Receita</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {w.tableBreakdown.map((tb, i) => (
                                  <TableRow key={i}>
                                    <TableCell>Mesa {tb.tableNumber}{tb.tableName ? ` - ${tb.tableName}` : ''}</TableCell>
                                    <TableCell className="text-center">{tb.count}</TableCell>
                                    <TableCell className="text-right font-medium">R$ {tb.revenue.toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      ))}
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum garçom cadastrado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables">
            <Card>
              <CardHeader><CardTitle className="text-lg">Relatório por Mesa</CardTitle></CardHeader>
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
              <CardHeader><CardTitle className="text-lg">Resumo por Forma de Pagamento (Delivery)</CardTitle></CardHeader>
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
