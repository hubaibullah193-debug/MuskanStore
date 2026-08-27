// app/components/cart-item.tsx
// Cart item row with quantity controls and remove button

import { CartItem } from '@/lib/hooks/useCart';
import { Input } from '@/app/components/ui/input';

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
      className="flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-center sm:gap-4"
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
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">
            {item.isBundle && (
              <span className="mr-1 rounded bg-paper-2 px-1.5 py-0.5 align-middle text-xs font-semibold text-secondary">
                Bundle
              </span>
            )}
            {item.name || item.productId}
          </h3>
          {item.isBundle && Array.isArray(item.bundleItems) && (
            <ul className="mt-1 space-y-0.5 text-sm text-secondary">
              {item.bundleItems.map((bi, i) => (
                <li key={i} className="truncate">
                  {bi.product_name || bi.product_id}
                  {bi.variant_name ? ` (${bi.variant_name})` : ''} × {bi.quantity}
                </li>
              ))}
            </ul>
          )}
          {!item.isBundle && item.variantId && (
            <p className="text-sm text-secondary">Variant: {item.variantId}</p>
          )}
        </div>
      </div>

      {/* Price / Quantity / Total / Remove */}
      <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
        <span className="hidden font-semibold text-foreground sm:block">
          Rs. {item.price.toFixed(2)}
        </span>

        {/* Quantity */}
        <div className="w-20">
          <Input
            type="number"
            min="1"
            value={item.quantity}
            onChange={handleQuantityChange}
            className="text-center"
            aria-label={`Quantity for ${item.name || item.productId}`}
          />
        </div>

        {/* Line Total */}
        <div className="w-24 text-right">
          <span className="text-xs text-secondary sm:hidden">Total</span>
          <p className="font-semibold text-foreground">
            Rs. {(item.price * item.quantity).toFixed(2)}
          </p>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="text-sm font-medium text-error hover:opacity-80"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
