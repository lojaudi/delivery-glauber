import { useParams, useNavigate } from 'react-router-dom';
import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard,
  ExternalLink, 
  Loader2, 
  Settings,
  Store,
  Users,
  MessageSquare,
  History
} from 'lucide-react';
import { 
  useRestaurantDetails, 
  useRestaurantPayments, 
  useRestaurantAdmins,
  useCurrentReseller
} from '@/hooks/useReseller';
import { useStoreOpenStatus } from '@/hooks/useStoreOpenStatus';
import { SubscriptionBadge } from '@/components/reseller/SubscriptionBadge';
import { BillingManager } from '@/components/reseller/BillingManager';
import { PaymentHistory } from '@/components/reseller/PaymentHistory';
import { RestaurantAdminManager } from '@/components/reseller/RestaurantAdminManager';
import { RestaurantContactForm } from '@/components/reseller/RestaurantContactForm';
import { CommunicationHistory } from '@/components/reseller/CommunicationHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


function RestaurantDetailsContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: restaurant, isLoading } = useRestaurantDetails(id);
  const { data: payments } = useRestaurantPayments(id);
  const { data: admins } = useRestaurantAdmins(id);
  const { data: reseller } = useCurrentReseller();
  const { isOpen } = useStoreOpenStatus(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-16">
        <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">Restaurante não encontrado</h3>
        <Button onClick={() => navigate('/reseller/restaurants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reseller/restaurants')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <SubscriptionBadge status={restaurant.subscription_status} />
          </div>
          <p className="text-muted-foreground">/{restaurant.slug}</p>
        </div>
        <Button variant="outline" onClick={() => window.open(`/r/${restaurant.slug}`, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver Cardápio
        </Button>
        <Button onClick={() => window.open(`/r/${restaurant.slug}/admin`, '_blank')}>
          <Settings className="h-4 w-4 mr-2" />
          Acessar Painel
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mensalidade</p>
                <p className="text-lg font-bold">R$ {restaurant.monthly_fee.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Início</p>
                <p className="text-lg font-bold">
                  {restaurant.subscription_start_date 
                    ? format(new Date(restaurant.subscription_start_date), 'dd/MM/yy', { locale: ptBR })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-lg font-bold">{admins?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loja</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {restaurant.is_active ? (
                    <Badge variant="default">Ativa</Badge>
                  ) : (
                    <Badge variant="destructive">Inativa</Badge>
                  )}
                  <Badge variant={isOpen ? 'open' : 'closed'}>
                    {isOpen ? 'Aberta' : 'Fechada'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="billing" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            Cobrança
          </TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="admins">Administradores</TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Comunicações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-4">
          {reseller && (
            <BillingManager 
              restaurant={restaurant} 
              resellerId={reseller.id}
              mpIntegrationEnabled={reseller.mp_integration_enabled || false}
            />
          )}
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <RestaurantContactForm 
            restaurantId={restaurant.id}
            initialData={{
              owner_name: restaurant.owner_name,
              phone: restaurant.phone,
              contact_email: restaurant.contact_email,
            }}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentHistory payments={payments || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <RestaurantAdminManager 
            restaurantId={restaurant.id} 
            restaurantName={restaurant.name}
          />
        </TabsContent>

        <TabsContent value="communications">
          <CommunicationHistory restaurantId={restaurant.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function RestaurantDetails() {
  return (
    <ResellerLayout title="Detalhes do Restaurante">
      <RestaurantDetailsContent />
    </ResellerLayout>
  );
}
