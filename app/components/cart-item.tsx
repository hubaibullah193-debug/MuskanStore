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
    <div
      className="flex flex-col gap-3 border-b border-gray-200 py-4 sm:flex-row sm:items-center sm:gap-4"
      data-testid="cart-item"
    >
      {/* Product Info */}
      <div className="flex min-w-0 items-center gap-4 sm:flex-1">
        {item.image && (
          <img
            src={item.image}
            alt={item.name || item.productId}
            className="h-14 w-14 flex-shrink-0 rounded object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {item.isBundle && (
              <span className="mr-1 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-semibold text-purple-800 align-middle">
                Bundle
              </span>
            )}
            {item.name || item.productId}
          </h3>
          {item.isBundle && Array.isArray(item.bundleItems) && (
            <ul className="mt-1 space-y-0.5 text-sm text-gray-500">
              {item.bundleItems.map((bi, i) => (
                <li key={i} className="truncate">
                  {bi.product_name || bi.product_id}
                  {bi.variant_name ? ` (${bi.variant_name})` : ''} × {bi.quantity}
                </li>
              ))}
            </ul>
          )}
          {!item.isBundle && item.variantId && (
            <p className="text-sm text-gray-500">Variant: {item.variantId}</p>
          )}
        </div>
      </div>

      {/* Price / Quantity / Total / Remove */}
      <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
        <span className="hidden font-semibold text-gray-900 sm:block">
          Rs. {item.price.toFixed(2)}
        </span>

        {/* Quantity */}
        <div className="w-20">
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={handleQuantityChange}
            className="w-full rounded border border-gray-300 px-2 py-1 text-center"
            aria-label={`Quantity for ${item.name || item.productId}`}
          />
        </div>

        {/* Line Total */}
        <div className="w-24 text-right">
          <span className="text-xs text-gray-500 sm:hidden">Total</span>
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
    </div>
  );
}
