import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CartItem, Product } from '@/types';

const CART_STORAGE_KEY = 'delivery-cart';

interface CartStorageData {
  items: CartItem[];
  restaurantSlug: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, observation?: string, selectedAddons?: Record<string, string[]>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  restaurantSlug: string | null;
  setRestaurantSlug: (slug: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function loadCartFromStorage(): CartStorageData {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle legacy format (array of items)
      if (Array.isArray(parsed)) {
        return { items: parsed, restaurantSlug: null };
      }
      // New format with slug
      return {
        items: parsed.items || [],
        restaurantSlug: parsed.restaurantSlug || null,
      };
    }
  } catch (error) {
    console.error('Error loading cart from storage:', error);
  }
  return { items: [], restaurantSlug: null };
}

function saveCartToStorage(data: CartStorageData) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving cart to storage:', error);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartData, setCartData] = useState<CartStorageData>(() => loadCartFromStorage());

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    saveCartToStorage(cartData);
  }, [cartData]);

  const addItem = (product: Product, quantity: number, observation?: string, selectedAddons?: Record<string, string[]>) => {
    setCartData(prev => {
      const existingIndex = prev.items.findIndex(item => item.product.id === product.id);
      
      if (existingIndex > -1) {
        const updatedItems = [...prev.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + quantity,
          observation: observation || updatedItems[existingIndex].observation,
          selectedAddons: selectedAddons || updatedItems[existingIndex].selectedAddons,
        };
        return { ...prev, items: updatedItems };
      }
      
      return { ...prev, items: [...prev.items, { product, quantity, observation, selectedAddons }] };
    });
  };

  const removeItem = (productId: string) => {
    setCartData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.product.id !== productId),
    }));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    
    setCartData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.product.id === productId 
          ? { ...item, quantity } 
          : item
      ),
    }));
  };

  const clearCart = () => {
    setCartData({ items: [], restaurantSlug: null });
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const setRestaurantSlug = (slug: string) => {
    setCartData(prev => ({ ...prev, restaurantSlug: slug }));
  };

  const totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartData.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      items: cartData.items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      restaurantSlug: cartData.restaurantSlug,
      setRestaurantSlug,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
