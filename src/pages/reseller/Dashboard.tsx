import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { StatsCard } from '@/components/reseller/StatsCard';
import { RestaurantCard } from '@/components/reseller/RestaurantCard';
import { FinancialCharts } from '@/components/reseller/FinancialCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, DollarSign, AlertTriangle, Clock, Plus, ArrowRight, Loader2, CreditCard, CheckCircle2, PauseCircle, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResellerRestaurants, useResellerStats, useResellerPayments, useCurrentReseller } from '@/hooks/useReseller';
import { CreateRestaurantModal } from '@/components/reseller/CreateRestaurantModal';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentBadge } from '@/components/reseller/SubscriptionBadge';
import { useDemoGuard } from '@/hooks/useDemoGuard';

function DashboardContent() {
  const navigate = useNavigate();
  const { data: restaurants, isLoading } = useResellerRestaurants();
  const { data: payments } = useResellerPayments();
  const { data: reseller } = useCurrentReseller();
  const stats = useResellerStats();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { checkDemoMode, canWrite } = useDemoGuard();

  const recentRestaurants = restaurants?.slice(0, 3) || [];
  const pendingPaymentsList = payments?.filter(p => p.status === 'pending' || p.status === 'overdue').slice(0, 5) || [];
  
  const hasMPIntegration = reseller?.mp_integration_enabled && reseller?.mp_access_token;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos seus restaurantes</p>
        </div>
        <Button onClick={() => canWrite ? setCreateModalOpen(true) : checkDemoMode()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Restaurante
        </Button>
      </div>

      {/* Tabs for Dashboard views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total de Restaurantes"
              value={stats.totalRestaurants}
              icon={Store}
              description={`${stats.activeRestaurants} ativos`}
            />
            <StatsCard
              title="Receita Mensal"
              value={`R$ ${stats.monthlyRevenue.toFixed(2)}`}
              icon={DollarSign}
              variant="success"
            />
            <StatsCard
              title="Em Período de Teste"
              value={stats.trialRestaurants}
              icon={Clock}
              variant="warning"
            />
            <StatsCard
              title="Pagamentos Pendentes"
              value={stats.pendingPayments + stats.overduePayments}
              icon={AlertTriangle}
              variant={stats.overduePayments > 0 ? 'danger' : 'default'}
              description={stats.overduePayments > 0 ? `${stats.overduePayments} atrasados` : undefined}
            />
          </div>

          {/* Mercado Pago Stats */}
          {hasMPIntegration && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Assinaturas MP Ativas"
                value={stats.mpActiveSubscriptions}
                icon={CheckCircle2}
                variant="success"
              />
              <StatsCard
                title="Assinaturas Pendentes"
                value={stats.mpPendingSubscriptions}
                icon={CreditCard}
                variant="warning"
                description="Aguardando pagamento"
              />
              <StatsCard
                title="Assinaturas Pausadas"
                value={stats.mpPausedSubscriptions}
                icon={PauseCircle}
                variant="danger"
              />
              <StatsCard
                title="Recebido este Mês"
                value={`R$ ${stats.mpPaidThisMonth.toFixed(2)}`}
                icon={DollarSign}
                variant="success"
                description="Via Mercado Pago"
              />
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Restaurants */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Restaurantes Recentes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/reseller/restaurants')}>
                  Ver todos
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentRestaurants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum restaurante cadastrado</p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => setCreateModalOpen(true)}
                    >
                      Criar primeiro restaurante
                    </Button>
                  </div>
                ) : (
                  recentRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      onView={(id) => navigate(`/reseller/restaurants/${id}`)}
                      onEdit={(id) => navigate(`/reseller/restaurants/${id}/edit`)}
                      onManage={(id) => window.open(`/r/${restaurant.slug}/admin`, '_blank')}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Pending Payments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Pagamentos Pendentes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/reseller/subscriptions')}>
                  Ver todos
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {pendingPaymentsList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pagamento pendente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingPaymentsList.map((payment) => (
                      <div 
                        key={payment.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {payment.restaurants?.name || 'Restaurante'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vence em {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">R$ {payment.amount.toFixed(2)}</p>
                          <PaymentBadge status={payment.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <FinancialCharts />
        </TabsContent>
      </Tabs>

      <CreateRestaurantModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
      />
    </div>
  );
}

export default function ResellerDashboard() {
  return (
    <ResellerLayout title="Dashboard">
      <DashboardContent />
    </ResellerLayout>
  );
}