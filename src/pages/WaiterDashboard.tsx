import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  LogOut, 
  Bell, 
  RefreshCw, 
  Filter,
  ChevronLeft,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WaiterTableCard } from '@/components/waiter/WaiterTableCard';
import { TableOrderScreen } from '@/components/pdv/TableOrderScreen';
import { TableCheckout } from '@/components/pdv/TableCheckout';
import { OpenTableModal } from '@/components/pdv/OpenTableModal';
import { useWaiterTablesWithOrders } from '@/hooks/useWaiterTables';
import { useWaiterReadyItems, useKitchenItemMutations } from '@/hooks/useKitchenItems';
import { useStoreConfig } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { TableWithOrder, TableStatus } from '@/types/pdv';

type StatusFilter = 'all' | 'available' | 'occupied' | 'requesting_bill';
type WaiterView = 'tables' | 'order' | 'checkout';

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { data: store } = useStoreConfig();
  const { tables, isLoading } = useWaiterTablesWithOrders();
  const { items: readyItems } = useWaiterReadyItems();
  const { updateItemStatus } = useKitchenItemMutations();
  
  const [view, setView] = useState<WaiterView>('tables');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null);
  const [openTableModal, setOpenTableModal] = useState(false);
  const [tableToOpen, setTableToOpen] = useState<TableWithOrder | null>(null);
  const [readyItemsOpen, setReadyItemsOpen] = useState(false);

  useTheme();

  // Get waiter info from localStorage
  const waiterId = localStorage.getItem('waiter_id');
  const waiterName = localStorage.getItem('waiter_name');

  useEffect(() => {
    if (!waiterId || !waiterName) {
      navigate(slug ? `/r/${slug}/waiter` : '/waiter');
    }
  }, [waiterId, waiterName, navigate, slug]);

  const handleLogout = () => {
    localStorage.removeItem('waiter_id');
    localStorage.removeItem('waiter_name');
    navigate(slug ? `/r/${slug}/waiter` : '/waiter');
  };

  const handleTableClick = (table: TableWithOrder) => {
    if (table.status === 'available') {
      setTableToOpen(table);
      setOpenTableModal(true);
    } else {
      setSelectedTable(table);
      setView('order');
    }
  };

  const handleBackToTables = () => {
    setView('tables');
    setSelectedTable(null);
  };

  const handleGoToCheckout = () => {
    setView('checkout');
  };

  const handleCheckoutSuccess = () => {
    setView('tables');
    setSelectedTable(null);
  };

  const handleMarkDelivered = async (itemId: string) => {
    await updateItemStatus(itemId, 'delivered');
  };

  // Filter tables
  const filteredTables = tables
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .sort((a, b) => a.number - b.number);

  // Count ready items per table for notifications
  const readyItemsByTable = readyItems.reduce((acc, item) => {
    acc[item.table_number] = (acc[item.table_number] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Stats
  const available = tables.filter(t => t.status === 'available').length;
  const occupied = tables.filter(t => t.status === 'occupied').length;
  const requestingBill = tables.filter(t => t.status === 'requesting_bill').length;

  // Order view
  if (view === 'order' && selectedTable) {
    return (
      <>
        <Helmet>
          <title>{`Mesa ${selectedTable.number} - Garçom`}</title>
        </Helmet>
        
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToTables}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-foreground">Mesa {selectedTable.number}</h1>
          </header>

          <div className="p-4">
            <TableOrderScreen 
              table={selectedTable} 
              onBack={handleBackToTables}
              onCheckout={handleGoToCheckout}
            />
          </div>
        </div>
      </>
    );
  }

  // Checkout view
  if (view === 'checkout' && selectedTable) {
    return (
      <>
        <Helmet>
          <title>{`Fechar Mesa ${selectedTable.number} - Garçom`}</title>
        </Helmet>
        
        <div className="min-h-screen bg-background">
          <div className="p-4">
            <TableCheckout 
              table={selectedTable}
              onBack={() => setView('order')}
              onSuccess={handleCheckoutSuccess}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Painel Garçom - ${store?.name || 'Restaurante'}`}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-foreground">Olá, {waiterName}!</h1>
              <p className="text-sm text-muted-foreground">{store?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Ready items notification */}
              <Sheet open={readyItemsOpen} onOpenChange={setReadyItemsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {readyItems.length > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-green-500 text-white">
                        {readyItems.length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Itens Prontos para Entregar</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-3">
                    {readyItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum item pronto no momento
                      </p>
                    ) : (
                      readyItems.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div>
                            <Badge variant="outline" className="mb-1">
                              Mesa {item.table_number}
                            </Badge>
                            <p className="font-medium">
                              {item.quantity}x {item.product_name}
                            </p>
                            {item.observation && (
                              <p className="text-xs text-muted-foreground">
                                {item.observation}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleMarkDelivered(item.id)}
                          >
                            Entregue
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 p-4">
          <div className="bg-green-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{available}</p>
            <p className="text-xs text-green-600">Livres</p>
          </div>
          <div className="bg-amber-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{occupied}</p>
            <p className="text-xs text-amber-600">Ocupadas</p>
          </div>
          <div className="bg-red-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{requestingBill}</p>
            <p className="text-xs text-red-600">Conta</p>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <ToggleGroup 
              type="single" 
              value={statusFilter} 
              onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}
            >
              <ToggleGroupItem value="all" className="text-xs px-3">
                Todas
              </ToggleGroupItem>
              <ToggleGroupItem value="available" className="text-xs px-3 data-[state=on]:bg-green-100 data-[state=on]:text-green-700">
                Livres
              </ToggleGroupItem>
              <ToggleGroupItem value="occupied" className="text-xs px-3 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700">
                Ocupadas
              </ToggleGroupItem>
              <ToggleGroupItem value="requesting_bill" className="text-xs px-3 data-[state=on]:bg-red-100 data-[state=on]:text-red-700">
                Conta
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="px-4 pb-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              Nenhuma mesa encontrada
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredTables.map((table) => (
                <WaiterTableCard
                  key={table.id}
                  table={table}
                  onClick={() => handleTableClick(table)}
                  readyItemsCount={readyItemsByTable[table.number] || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Open Table Modal */}
      {tableToOpen && (
        <OpenTableModal
          table={tableToOpen}
          open={openTableModal}
          onOpenChange={(open) => {
            setOpenTableModal(open);
            if (!open) setTableToOpen(null);
          }}
          onTableOpened={(table) => {
            setOpenTableModal(false);
            setTableToOpen(null);
            setSelectedTable(table);
          }}
          defaultWaiterId={waiterId || undefined}
          defaultWaiterName={waiterName || undefined}
        />
      )}
    </>
  );
}
