// app/components/cart-item.tsx
// Cart item row with quantity controls and remove button

import { CartItem } from '@/lib/hooks/useCart';

interface CartItemProps {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItemRow({ item, onQuantityChange, onRemove }: CartItemProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value > 0) {
      onQuantityChange(value);
    }
  };

  return (
    <div className="flex items-center gap-4 border-b border-gray-200 py-4" data-testid="cart-item">
      {/* Product Info */}
      {item.image && (
        <img
          src={item.image}
          alt={item.name || item.productId}
          className="h-14 w-14 flex-shrink-0 rounded object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">
          {item.name || item.productId}
        </h3>
        {item.variantId && (
          <p className="text-sm text-gray-500">Variant: {item.variantId}</p>
        )}
      </div>

      {/* Price */}
      <div className="text-right">
        <p className="font-semibold text-gray-900">
          Rs. {item.price.toFixed(2)}
        </p>
      </div>

      {/* Quantity */}
      <div className="w-20">
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={handleQuantityChange}
          className="w-full rounded border border-gray-300 px-2 py-1 text-center"
        />
      </div>

      {/* Line Total */}
      <div className="w-24 text-right">
        <p className="font-semibold text-gray-900">
          Rs. {(item.price * item.quantity).toFixed(2)}
        </p>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="text-red-600 hover:text-red-800 font-medium text-sm"
      >
        Remove
      </button>
    </div>
  );
}
