import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CartItem, Product, HalfHalfInfo } from '@/types';

const CART_STORAGE_KEY = 'delivery-cart';

interface CartStorageData {
  items: CartItem[];
  restaurantSlug: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, observation?: string, selectedAddons?: Record<string, string[]>, halfHalf?: HalfHalfInfo) => void;
  removeItem: (productId: string, halfHalfSecondId?: string) => void;
  updateQuantity: (productId: string, quantity: number, halfHalfSecondId?: string) => void;
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

  const addItem = (product: Product, quantity: number, observation?: string, selectedAddons?: Record<string, string[]>, halfHalf?: HalfHalfInfo) => {
    setCartData(prev => {
      // For half-half items, use a composite key
      const itemKey = halfHalf 
        ? `${product.id}_half_${halfHalf.secondProduct.id}` 
        : product.id;
      
      const existingIndex = prev.items.findIndex(item => {
        if (item.halfHalf && halfHalf) {
          return item.product.id === product.id && item.halfHalf.secondProduct.id === halfHalf.secondProduct.id;
        }
        return !item.halfHalf && item.product.id === product.id;
      });
      
      if (existingIndex > -1) {
        const updatedItems = [...prev.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + quantity,
          observation: observation || updatedItems[existingIndex].observation,
          selectedAddons: selectedAddons || updatedItems[existingIndex].selectedAddons,
          halfHalf: halfHalf || updatedItems[existingIndex].halfHalf,
        };
        return { ...prev, items: updatedItems };
      }
      
      return { ...prev, items: [...prev.items, { product, quantity, observation, selectedAddons, halfHalf }] };
    });
  };

  const removeItem = (productId: string, halfHalfSecondId?: string) => {
    setCartData(prev => ({
      ...prev,
      items: prev.items.filter(item => {
        if (halfHalfSecondId && item.halfHalf) {
          return !(item.product.id === productId && item.halfHalf.secondProduct.id === halfHalfSecondId);
        }
        if (!halfHalfSecondId && !item.halfHalf) {
          return item.product.id !== productId;
        }
        return true;
      }),
    }));
  };

  const updateQuantity = (productId: string, quantity: number, halfHalfSecondId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, halfHalfSecondId);
      return;
    }
    
    setCartData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (halfHalfSecondId && item.halfHalf) {
          if (item.product.id === productId && item.halfHalf.secondProduct.id === halfHalfSecondId) {
            return { ...item, quantity };
          }
        } else if (!halfHalfSecondId && !item.halfHalf && item.product.id === productId) {
          return { ...item, quantity };
        }
        return item;
      }),
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
