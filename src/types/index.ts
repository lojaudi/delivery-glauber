export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  observation?: string;
  selectedAddons?: Record<string, string[]>; // groupId -> optionIds
}

export interface StoreConfig {
  id: string;
  name: string;
  phone_whatsapp: string;
  pix_key: string;
  pix_key_type: string;
  logo_url: string;
  cover_url: string | null;
  is_open: boolean;
  delivery_fee: number;
  min_order_value: number;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  total_amount: number;
  status: 'pending' | 'preparing' | 'delivery' | 'completed' | 'cancelled';
  payment_method: 'money' | 'card' | 'pix';
  change_for: number | null;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  observation?: string;
}

export type PaymentMethod = 'money' | 'card' | 'pix';
