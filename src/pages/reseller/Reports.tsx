import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/reseller/StatsCard';
import { 
  Store, 
  DollarSign, 
  TrendingUp, 
  Users,
  Loader2
} from 'lucide-react';
import { useResellerRestaurants, useResellerStats, useResellerPayments } from '@/hooks/useReseller';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

function ReportsContent() {
  const { data: restaurants, isLoading } = useResellerRestaurants();
  const { data: payments } = useResellerPayments();
  const stats = useResellerStats();

  // Prepare data for status distribution chart
  const statusData = [
    { name: 'Ativos', value: stats.activeRestaurants, color: '#22c55e' },
    { name: 'Em Teste', value: stats.trialRestaurants, color: '#3b82f6' },
    { name: 'Suspensos', value: stats.suspendedRestaurants, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  // Prepare revenue by restaurant
  const revenueData = restaurants
    ?.filter(r => r.subscription_status === 'active')
    .slice(0, 10)
    .map(r => ({
      name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
      value: r.monthly_fee,
    })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Análise completa dos seus restaurantes
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Restaurantes"
          value={stats.totalRestaurants}
          icon={Store}
        />
        <StatsCard
          title="Receita Mensal"
          value={`R$ ${stats.monthlyRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="Taxa de Conversão"
          value={stats.totalRestaurants > 0 
            ? `${((stats.activeRestaurants / stats.totalRestaurants) * 100).toFixed(0)}%`
            : '0%'}
          icon={TrendingUp}
          description="Trial → Ativo"
        />
        <StatsCard
          title="Restaurantes Ativos"
          value={stats.activeRestaurants}
          icon={Users}
          variant="success"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum restaurante cadastrado
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Restaurant */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Restaurante</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum restaurante ativo
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Mensalidade']}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Receita Anual Projetada</p>
              <p className="text-3xl font-bold">
                R$ {(stats.monthlyRevenue * 12).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Baseado nos restaurantes ativos atuais
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-3xl font-bold">
                R$ {stats.activeRestaurants > 0 
                  ? (stats.monthlyRevenue / stats.activeRestaurants).toFixed(2)
                  : '0.00'}
              </p>
              <p className="text-xs text-muted-foreground">
                Por restaurante ativo
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Churn Rate</p>
              <p className="text-3xl font-bold">
                {stats.totalRestaurants > 0 
                  ? ((stats.suspendedRestaurants / stats.totalRestaurants) * 100).toFixed(1)
                  : '0'}%
              </p>
              <p className="text-xs text-muted-foreground">
                Restaurantes suspensos/cancelados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResellerReports() {
  return (
    <ResellerLayout title="Relatórios">
      <ReportsContent />
    </ResellerLayout>
  );
}
