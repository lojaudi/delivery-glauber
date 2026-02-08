import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search, Package, Clock, CheckCircle, Truck, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useStoreConfig } from '@/hooks/useStore';
import { useRestaurant } from '@/hooks/useRestaurant';
interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'bg-warning/10 text-warning border-warning/20', icon: <Clock className="w-4 h-4" /> },
  preparing: { label: 'Preparando', color: 'bg-primary/10 text-primary border-primary/20', icon: <Package className="w-4 h-4" /> },
  delivery: { label: 'Em Entrega', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <Truck className="w-4 h-4" /> },
  completed: { label: 'Entregue', color: 'bg-success/10 text-success border-success/20', icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: <XCircle className="w-4 h-4" /> },
};

export default function MyOrders() {
  const { slug } = useParams<{ slug: string }>();
  const basePath = slug ? `/r/${slug}` : '';
  const { data: store } = useStoreConfig();
  const { restaurant } = useRestaurant();
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
  };

  const searchOrders = async () => {
    if (phone.length < 14) return;
    if (!restaurant?.id) return;
    
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', phone)
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Meus Pedidos</title>
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to={basePath}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Meus Pedidos</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* Search Section */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Digite seu telefone para ver o histórico de pedidos
            </p>
            <div className="flex gap-2">
              <Input
                type="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={15}
                className="flex-1"
              />
              <Button 
                onClick={searchOrders} 
                disabled={phone.length < 14 || isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : hasSearched && orders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum pedido encontrado para este telefone</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              return (
                <Link key={order.id} to={`${basePath}/order/${order.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">Pedido #{order.id}</span>
                            <Badge variant="outline" className={status.color}>
                              <span className="flex items-center gap-1">
                                {status.icon}
                                {status.label}
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {order.address_street}, {order.address_number} - {order.address_neighborhood}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{formatCurrency(order.total_amount)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
