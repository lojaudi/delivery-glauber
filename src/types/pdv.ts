export type TableStatus = 'available' | 'occupied' | 'reserved' | 'requesting_bill';
export type TableOrderStatus = 'open' | 'requesting_bill' | 'paid' | 'cancelled';
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Table {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
  status: TableStatus;
  current_order_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TableOrder {
  id: number;
  table_id: string | null;
  waiter_name: string | null;
  customer_count: number;
  status: TableOrderStatus;
  subtotal: number;
  discount: number;
  discount_type: 'value' | 'percentage';
  service_fee_enabled: boolean;
  service_fee_percentage: number;
  total_amount: number;
  payment_method: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  table?: Table;
  items?: TableOrderItem[];
}

export interface TableOrderItem {
  id: string;
  table_order_id: number;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  observation: string | null;
  status: OrderItemStatus;
  ordered_at: string;
  delivered_at: string | null;
  created_at: string;
}

export interface TableWithOrder extends Table {
  current_order?: TableOrder | null;
}
