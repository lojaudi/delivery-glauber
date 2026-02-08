import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { useResellerRestaurants, useResellerPayments } from '@/hooks/useReseller';
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo } from 'react';

const COLORS = {
  active: 'hsl(var(--chart-1))',
  trial: 'hsl(var(--chart-2))',
  suspended: 'hsl(var(--chart-3))',
  cancelled: 'hsl(var(--chart-4))',
  paid: 'hsl(var(--chart-1))',
  pending: 'hsl(var(--chart-2))',
  overdue: 'hsl(var(--chart-3))',
};

const chartConfig = {
  active: { label: 'Ativos', color: 'hsl(var(--chart-1))' },
  trial: { label: 'Trial', color: 'hsl(var(--chart-2))' },
  suspended: { label: 'Suspensos', color: 'hsl(var(--chart-3))' },
  cancelled: { label: 'Cancelados', color: 'hsl(var(--chart-4))' },
  revenue: { label: 'Receita', color: 'hsl(var(--chart-1))' },
  forecast: { label: 'Previsão', color: 'hsl(var(--chart-2))' },
};

export function FinancialCharts() {
  const { data: restaurants } = useResellerRestaurants();
  const { data: payments } = useResellerPayments();

  // Calculate monthly revenue for the last 6 months
  const revenueData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthPayments = payments?.filter(p => {
        if (!p.payment_date || p.status !== 'paid') return false;
        const paymentDate = parseISO(p.payment_date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      }) || [];
      
      const total = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      
      months.push({
        month: format(date, 'MMM', { locale: ptBR }),
        fullMonth: format(date, 'MMMM yyyy', { locale: ptBR }),
        revenue: total,
      });
    }
    return months;
  }, [payments]);

  // Calculate forecast for next 3 months
  const forecastData = useMemo(() => {
    const activeRestaurants = restaurants?.filter(r => 
      r.subscription_status === 'active' || r.subscription_status === 'trial'
    ) || [];
    
    const monthlyRecurring = activeRestaurants.reduce((sum, r) => sum + r.monthly_fee, 0);
    
    const months = [];
    for (let i = 1; i <= 3; i++) {
      const date = addMonths(new Date(), i);
      months.push({
        month: format(date, 'MMM', { locale: ptBR }),
        fullMonth: format(date, 'MMMM yyyy', { locale: ptBR }),
        forecast: monthlyRecurring,
      });
    }
    return months;
  }, [restaurants]);

  // Combine revenue and forecast for line chart
  const combinedData = useMemo(() => {
    const revenueWithForecast = revenueData.map(r => ({
      ...r,
      forecast: null as number | null,
    }));
    
    const forecastWithRevenue = forecastData.map(f => ({
      month: f.month,
      fullMonth: f.fullMonth,
      revenue: null as number | null,
      forecast: f.forecast,
    }));
    
    return [...revenueWithForecast, ...forecastWithRevenue];
  }, [revenueData, forecastData]);

  // Subscription status distribution
  const subscriptionDistribution = useMemo(() => {
    const counts = {
      active: 0,
      trial: 0,
      suspended: 0,
      cancelled: 0,
    };
    
    restaurants?.forEach(r => {
      if (counts.hasOwnProperty(r.subscription_status)) {
        counts[r.subscription_status as keyof typeof counts]++;
      }
    });
    
    return [
      { name: 'Ativos', value: counts.active, fill: COLORS.active },
      { name: 'Trial', value: counts.trial, fill: COLORS.trial },
      { name: 'Suspensos', value: counts.suspended, fill: COLORS.suspended },
      { name: 'Cancelados', value: counts.cancelled, fill: COLORS.cancelled },
    ].filter(item => item.value > 0);
  }, [restaurants]);

  // Payment status distribution
  const paymentStatusData = useMemo(() => {
    const currentMonth = new Date();
    const monthPayments = payments?.filter(p => {
      const dueDate = parseISO(p.due_date);
      return isSameMonth(dueDate, currentMonth);
    }) || [];
    
    const counts = {
      paid: 0,
      pending: 0,
      overdue: 0,
    };
    
    monthPayments.forEach(p => {
      if (p.status === 'paid') counts.paid++;
      else if (p.status === 'pending') counts.pending++;
      else if (p.status === 'overdue') counts.overdue++;
    });
    
    return [
      { name: 'Pagos', value: counts.paid, fill: COLORS.paid },
      { name: 'Pendentes', value: counts.pending, fill: COLORS.pending },
      { name: 'Atrasados', value: counts.overdue, fill: COLORS.overdue },
    ].filter(item => item.value > 0);
  }, [payments]);

  // Delinquency rate
  const delinquencyRate = useMemo(() => {
    const overdueCount = restaurants?.filter(r => r.subscription_status === 'suspended').length || 0;
    const totalActive = restaurants?.filter(r => 
      r.subscription_status === 'active' || r.subscription_status === 'trial' || r.subscription_status === 'suspended'
    ).length || 0;
    
    if (totalActive === 0) return 0;
    return ((overdueCount / totalActive) * 100).toFixed(1);
  }, [restaurants]);

  // Forecast total
  const forecastTotal = useMemo(() => {
    return forecastData.reduce((sum, f) => sum + f.forecast, 0);
  }, [forecastData]);

  // Current month revenue
  const currentMonthRevenue = useMemo(() => {
    return revenueData[revenueData.length - 1]?.revenue || 0;
  }, [revenueData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Receita este Mês</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(currentMonthRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Previsão 3 Meses</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(forecastTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Taxa de Inadimplência</p>
            <p className="text-2xl font-bold text-orange-600">{delinquencyRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
            <p className="text-2xl font-bold">{restaurants?.filter(r => r.subscription_status === 'active').length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita Mensal + Previsão</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis 
                  tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value, name) => [formatCurrency(value as number), name === 'revenue' ? 'Receita' : 'Previsão']}
                  />} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-1))' }}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--chart-2))' }}
                  connectNulls={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis 
                  tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value) => [formatCurrency(value as number), 'Receita']}
                  />} 
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--chart-1))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Subscription Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Assinaturas</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={subscriptionDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {subscriptionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status de Pagamentos (Mês Atual)</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentStatusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum pagamento registrado este mês
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}