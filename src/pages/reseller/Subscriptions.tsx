import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { PaymentBadge } from '@/components/reseller/SubscriptionBadge';
import { StatsCard } from '@/components/reseller/StatsCard';
import { 
  Search, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useResellerPayments, useUpdatePayment, useResellerStats } from '@/hooks/useReseller';
import { PaymentStatus } from '@/types/reseller';
import { useToast } from '@/hooks/use-toast';
import { useDemoGuard } from '@/hooks/useDemoGuard';

function SubscriptionsContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: payments, isLoading } = useResellerPayments();
  const updatePayment = useUpdatePayment();
  const stats = useResellerStats();
  const { checkDemoMode } = useDemoGuard();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.restaurants?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleMarkAsPaid = async (paymentId: string) => {
    if (checkDemoMode()) return;
    
    try {
      await updatePayment.mutateAsync({
        id: paymentId,
        status: 'paid',
        payment_date: new Date().toISOString(),
      });
      toast({
        title: 'Pagamento confirmado',
        description: 'O pagamento foi marcado como pago.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    if (checkDemoMode()) return;
    
    try {
      await updatePayment.mutateAsync({
        id: paymentId,
        status: 'cancelled',
      });
      toast({
        title: 'Pagamento cancelado',
        description: 'O pagamento foi cancelado.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Calculate totals
  const totalPending = filteredPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalOverdue = filteredPayments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalPaid = filteredPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mensalidades</h1>
        <p className="text-muted-foreground">
          Gerencie os pagamentos dos seus restaurantes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Receita Mensal"
          value={`R$ ${stats.monthlyRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="Pendentes"
          value={`R$ ${totalPending.toFixed(2)}`}
          icon={AlertTriangle}
          description={`${stats.pendingPayments} pagamentos`}
          variant="warning"
        />
        <StatsCard
          title="Atrasados"
          value={`R$ ${totalOverdue.toFixed(2)}`}
          icon={AlertTriangle}
          description={`${stats.overduePayments} pagamentos`}
          variant="danger"
        />
        <StatsCard
          title="Recebidos"
          value={`R$ ${totalPaid.toFixed(2)}`}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por restaurante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pagamento encontrado</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurante</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <button 
                          className="font-medium hover:underline"
                          onClick={() => navigate(`/reseller/restaurants/${payment.restaurant_id}`)}
                        >
                          {payment.restaurants?.name || 'Restaurante'}
                        </button>
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        R$ {payment.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <PaymentBadge status={payment.status} />
                      </TableCell>
                      <TableCell>
                        {payment.payment_date 
                          ? format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {(payment.status === 'pending' || payment.status === 'overdue') && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkAsPaid(payment.id)}
                              disabled={updatePayment.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelPayment(payment.id)}
                              disabled={updatePayment.isPending}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResellerSubscriptions() {
  return (
    <ResellerLayout title="Mensalidades">
      <SubscriptionsContent />
    </ResellerLayout>
  );
}
