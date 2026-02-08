import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { RestaurantCard } from '@/components/reseller/RestaurantCard';
import { CreateRestaurantModal } from '@/components/reseller/CreateRestaurantModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Store, Loader2 } from 'lucide-react';
import { useResellerRestaurants } from '@/hooks/useReseller';
import { SubscriptionStatus } from '@/types/reseller';
import { useDemoGuard } from '@/hooks/useDemoGuard';

function RestaurantsContent() {
  const navigate = useNavigate();
  const { data: restaurants, isLoading } = useResellerRestaurants();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const { checkDemoMode, canWrite } = useDemoGuard();

  const filteredRestaurants = restaurants?.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(search.toLowerCase()) ||
                         restaurant.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || restaurant.subscription_status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

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
          <h1 className="text-2xl font-bold">Restaurantes</h1>
          <p className="text-muted-foreground">
            {restaurants?.length || 0} restaurantes cadastrados
          </p>
        </div>
        <Button onClick={() => canWrite ? setCreateModalOpen(true) : checkDemoMode()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Restaurante
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SubscriptionStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="trial">Em teste</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Restaurant List */}
      {filteredRestaurants.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Nenhum restaurante encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {search || statusFilter !== 'all' 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando seu primeiro restaurante'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button onClick={() => canWrite ? setCreateModalOpen(true) : checkDemoMode()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Restaurante
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRestaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onView={(id) => navigate(`/reseller/restaurants/${id}`)}
              onEdit={(id) => navigate(`/reseller/restaurants/${id}/edit`)}
              onManage={(id) => window.open(`/r/${restaurant.slug}/admin`, '_blank')}
            />
          ))}
        </div>
      )}

      <CreateRestaurantModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
      />
    </div>
  );
}

export default function ResellerRestaurants() {
  return (
    <ResellerLayout title="Restaurantes">
      <RestaurantsContent />
    </ResellerLayout>
  );
}
