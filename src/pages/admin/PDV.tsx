import { useState } from 'react';
import { Settings2, Plus, History, ShoppingBag } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { TableMap } from '@/components/pdv/TableMap';
import { OpenTableModal } from '@/components/pdv/OpenTableModal';
import { TableOrderScreen } from '@/components/pdv/TableOrderScreen';
import { TableCheckout } from '@/components/pdv/TableCheckout';
import { TableManagementModal } from '@/components/pdv/TableManagementModal';
import { OrderHistoryModal } from '@/components/pdv/OrderHistoryModal';
import { QuickSaleModal } from '@/components/pdv/QuickSaleModal';
import { QuickSaleCheckout } from '@/components/pdv/QuickSaleCheckout';
import { TableWithOrder, Table } from '@/types/pdv';
import { useTablesWithOrders } from '@/hooks/useTables';

type PDVView = 'map' | 'order' | 'checkout';

interface QuickSaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  observation: string;
  addons: {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    price: number;
  }[];
  totalPrice: number;
}

export default function PDV() {
  const [view, setView] = useState<PDVView>('map');
  const [selectedTable, setSelectedTable] = useState<TableWithOrder | null>(null);
  const [openTableModal, setOpenTableModal] = useState(false);
  const [tableToOpen, setTableToOpen] = useState<Table | null>(null);
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  
  // Quick Sale state
  const [quickSaleModalOpen, setQuickSaleModalOpen] = useState(false);
  const [quickSaleCheckoutOpen, setQuickSaleCheckoutOpen] = useState(false);
  const [quickSaleItems, setQuickSaleItems] = useState<QuickSaleItem[]>([]);
  const [quickSaleCustomerName, setQuickSaleCustomerName] = useState('');

  const { tables } = useTablesWithOrders();

  const handleTableClick = (table: TableWithOrder) => {
    if (table.status === 'available') {
      // Open the table
      setTableToOpen(table);
      setOpenTableModal(true);
    } else {
      // View/edit existing order
      setSelectedTable(table);
      setView('order');
    }
  };

  const handleOpenTableSuccess = (orderId: number) => {
    // Find the updated table data
    const updatedTable = tables.find(t => t.id === tableToOpen?.id);
    if (updatedTable) {
      setSelectedTable({
        ...updatedTable,
        current_order_id: orderId,
        status: 'occupied',
      });
      setView('order');
    }
    setTableToOpen(null);
  };

  const handleBackToMap = () => {
    setView('map');
    setSelectedTable(null);
  };

  const handleGoToCheckout = () => {
    setView('checkout');
  };

  const handleCheckoutSuccess = () => {
    handleBackToMap();
  };

  // Quick Sale handlers
  const handleQuickSaleCheckout = (items: QuickSaleItem[], customerName: string) => {
    setQuickSaleItems(items);
    setQuickSaleCustomerName(customerName);
    setQuickSaleModalOpen(false);
    setQuickSaleCheckoutOpen(true);
  };

  const handleQuickSaleSuccess = () => {
    setQuickSaleItems([]);
    setQuickSaleCustomerName('');
    setQuickSaleCheckoutOpen(false);
  };

  const handleQuickSaleBack = () => {
    setQuickSaleCheckoutOpen(false);
    setQuickSaleModalOpen(true);
  };

  return (
    <AdminLayout title="PDV">
      {view === 'map' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mapa de Mesas</h1>
              <p className="text-muted-foreground">
                Gerencie mesas e pedidos do salão
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setQuickSaleModalOpen(true)}
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Venda Rápida
              </Button>
              <Button variant="outline" onClick={() => setHistoryModalOpen(true)}>
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
              <Button variant="outline" onClick={() => setManagementModalOpen(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Gerenciar
              </Button>
              <Button onClick={() => setManagementModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Mesa
              </Button>
            </div>
          </div>

          {/* Table Map */}
          <TableMap
            onTableClick={handleTableClick}
            onAddTable={() => setManagementModalOpen(true)}
          />
        </div>
      )}

      {view === 'order' && selectedTable && (
        <TableOrderScreen
          table={selectedTable}
          onBack={handleBackToMap}
          onCheckout={handleGoToCheckout}
        />
      )}

      {view === 'checkout' && selectedTable && (
        <TableCheckout
          table={selectedTable}
          onBack={() => setView('order')}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Modals */}
      <OpenTableModal
        table={tableToOpen}
        open={openTableModal}
        onOpenChange={setOpenTableModal}
        onSuccess={handleOpenTableSuccess}
      />

      <TableManagementModal
        open={managementModalOpen}
        onOpenChange={setManagementModalOpen}
      />

      <OrderHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
      />

      {/* Quick Sale Modals */}
      <QuickSaleModal
        open={quickSaleModalOpen}
        onOpenChange={setQuickSaleModalOpen}
        onCheckout={handleQuickSaleCheckout}
      />

      <QuickSaleCheckout
        open={quickSaleCheckoutOpen}
        onOpenChange={setQuickSaleCheckoutOpen}
        items={quickSaleItems}
        customerName={quickSaleCustomerName}
        onSuccess={handleQuickSaleSuccess}
        onBack={handleQuickSaleBack}
      />
    </AdminLayout>
  );
}
