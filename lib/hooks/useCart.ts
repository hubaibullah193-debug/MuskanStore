'use client';

/**
 * useCart Hook
 * Manages shopping cart - Supabase for logged-in users, localStorage for guests
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getCartAction,
  addToCartAction,
  addBundleToCartAction,
  updateCartItemAction,
  removeFromCartAction,
  clearCartAction,
  mergeGuestCartAction,
} from '@/app/cart/actions';

// Tracks which user ids have already had their guest cart merged in this
// client session, so the merge runs at most once per logged-in user.
const mergedGuestCartUserIds = new Set<string>();

export interface CartItem {
  id: string;
  productId?: string;
  bundleId?: string;
  variantId?: string;
  quantity: number;
  price: number;
  name?: string; // For display
  image?: string; // For display
  isBundle?: boolean;
  bundleItems?: Array<{
    product_id: string;
    product_name?: string;
    variant_id?: string | null;
    variant_name?: string | null;
    quantity: number;
    unit_price?: number | null;
  }>;
}

interface UseCartReturn {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  addItem: (productId: string, variantId: string | undefined, quantity: number, price: number, name?: string, image?: string) => Promise<void>;
  addBundleItem: (bundleId: string, quantity: number, price: number, name?: string, bundleItems?: CartItem['bundleItems']) => Promise<void>;
  updateItem: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
}

const CART_STORAGE_KEY = 'mstore_cart_guest';

export function useCart(): UseCartReturn {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cart on mount and when auth state changes
  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      setError(null);

      try {
        if (user?.id) {
          // On the transition from guest to logged-in, merge any cart that was
          // accumulated in localStorage into the user's persistent cart.
          if (!mergedGuestCartUserIds.has(user.id)) {
            try {
              const stored = localStorage.getItem(CART_STORAGE_KEY);
              if (stored) {
                const guestItems = JSON.parse(stored);
                if (Array.isArray(guestItems) && guestItems.length > 0) {
                await mergeGuestCartAction(
                  user.id,
                  guestItems.map((item: CartItem) => ({
                    productId: item.productId,
                    bundleId: item.bundleId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: item.price,
                  }))
                );
                }
                localStorage.removeItem(CART_STORAGE_KEY);
              }
            } catch (mergeErr) {
              console.error('Failed to merge guest cart:', mergeErr);
            } finally {
              mergedGuestCartUserIds.add(user.id);
            }
          }

          // Load from Supabase
          const cartItems = await getCartAction(user.id);
          setItems(cartItems || []);
        } else if (!authLoading) {
          // Load from localStorage for guests
          const stored = localStorage.getItem(CART_STORAGE_KEY);
          if (stored) {
            try {
              setItems(JSON.parse(stored));
            } catch (err) {
              setError('Failed to load cart');
              setItems([]);
            }
          } else {
            setItems([]);
          }
        }
      } catch (err) {
        console.error('Failed to load cart:', err);
        setError('Failed to load cart');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadCart();
    }
  }, [user?.id, authLoading]);

  // Save guest cart to localStorage
  const saveGuestCart = useCallback((newItems: CartItem[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
  }, []);

  // Add item to cart
  const addItem = useCallback(
    async (productId: string, variantId: string | undefined, quantity: number, price: number, name?: string, image?: string) => {
      try {
        setError(null);

        if (user?.id) {
          // Add to Supabase
          await addToCartAction(user.id, productId, variantId, quantity, price);
          // Reload cart
          const updated = await getCartAction(user.id);
          setItems(updated || []);
        } else {
          // Add to localStorage
          const newItems = [...items];
          const existing = newItems.find(
            (item) => item.productId === productId && item.variantId === variantId
          );

          if (existing) {
            existing.quantity += quantity;
          } else {
            newItems.push({
              id: `guest-${Date.now()}`,
              productId,
              variantId,
              quantity,
              price,
              name,
              image,
            });
          }

          setItems(newItems);
          saveGuestCart(newItems);
        }
      } catch (err) {
        console.error('Failed to add item to cart:', err);
        setError('Failed to add item to cart');
        throw err;
      }
    },
    [user?.id, items, saveGuestCart]
  );

  // Add a bundle to the cart
  const addBundleItem = useCallback(
    async (
      bundleId: string,
      quantity: number,
      price: number,
      name?: string,
      bundleItems?: CartItem['bundleItems']
    ) => {
      try {
        setError(null);

        if (user?.id) {
          // Authenticated: persist server-side (price recomputed from DB).
          await addBundleToCartAction(user.id, bundleId, quantity);
          const updated = await getCartAction(user.id);
          setItems(updated || []);
        } else {
          // Guest: persist to localStorage.
          const newItems = [...items];
          const existing = newItems.find((item) => item.bundleId === bundleId);

          if (existing) {
            existing.quantity += quantity;
          } else {
            newItems.push({
              id: `guest-bundle-${Date.now()}`,
              bundleId,
              quantity,
              price,
              name,
              isBundle: true,
              bundleItems,
            });
          }

          setItems(newItems);
          saveGuestCart(newItems);
        }
      } catch (err) {
        console.error('Failed to add bundle to cart:', err);
        setError('Failed to add bundle to cart');
        throw err;
      }
    },
    [user?.id, items, saveGuestCart]
  );

  // Update item quantity
  const updateItem = useCallback(
    async (cartItemId: string, quantity: number) => {
      try {
        setError(null);

        if (quantity < 1) {
          throw new Error('Quantity must be at least 1');
        }

        if (user?.id) {
          // Update in Supabase
          await updateCartItemAction(user.id, cartItemId, quantity);
          // Reload cart
          const updated = await getCartAction(user.id);
          setItems(updated || []);
        } else {
          // Update in localStorage
          const newItems = items.map((item) =>
            item.id === cartItemId ? { ...item, quantity } : item
          );
          setItems(newItems);
          saveGuestCart(newItems);
        }
      } catch (err) {
        console.error('Failed to update cart item:', err);
        setError('Failed to update cart item');
        throw err;
      }
    },
    [user?.id, items, saveGuestCart]
  );

  // Remove item from cart
  const removeItem = useCallback(
    async (cartItemId: string) => {
      try {
        setError(null);

        if (user?.id) {
          // Remove from Supabase
          await removeFromCartAction(user.id, cartItemId);
          // Reload cart
          const updated = await getCartAction(user.id);
          setItems(updated || []);
        } else {
          // Remove from localStorage
          const newItems = items.filter((item) => item.id !== cartItemId);
          setItems(newItems);
          saveGuestCart(newItems);
        }
      } catch (err) {
        console.error('Failed to remove item from cart:', err);
        setError('Failed to remove item from cart');
        throw err;
      }
    },
    [user?.id, items, saveGuestCart]
  );

  // Clear entire cart
  const clearCart = useCallback(async () => {
    try {
      setError(null);

      if (user?.id) {
        // Clear in Supabase
        await clearCartAction(user.id);
        setItems([]);
      } else {
        // Clear localStorage
        setItems([]);
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to clear cart:', err);
      setError('Failed to clear cart');
      throw err;
    }
  }, [user?.id]);

  // Calculate totals
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items,
    loading: loading || authLoading,
    error,
    addItem,
    addBundleItem,
    updateItem,
    removeItem,
    clearCart,
    itemCount,
    subtotal,
  };
}
