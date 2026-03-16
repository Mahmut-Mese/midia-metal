export const parseStockValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
};

const minNullable = (values: Array<number | null>): number | null => {
  const numeric = values.filter((value): value is number => value !== null);
  return numeric.length > 0 ? Math.min(...numeric) : null;
};

export const getVariantStockLimit = (
  variants: Array<Record<string, any>> | null | undefined,
  selectedVariants: Record<string, any> | null | undefined,
): number | null => {
  if (!Array.isArray(variants) || variants.length === 0 || !selectedVariants) {
    return null;
  }

  const limits = Object.entries(selectedVariants).map(([option, selected]) => {
    const match = variants.find((variant) => (
      String(variant?.option ?? "") === String(option)
      && String(variant?.value ?? "") === String(selected?.value ?? "")
    ));

    return parseStockValue(match?.stock);
  });

  return minNullable(limits);
};

export const getAvailableStock = (product: {
  track_stock?: boolean | null;
  stock_quantity?: unknown;
  variants?: Array<Record<string, any>> | null;
  selected_variants?: Record<string, any> | null;
  available_stock?: unknown;
}) => {
  const explicitAvailable = parseStockValue(product.available_stock);
  if (explicitAvailable !== null) {
    return explicitAvailable;
  }

  const baseStock = product.track_stock ? parseStockValue(product.stock_quantity) : null;
  const variantStock = getVariantStockLimit(product.variants, product.selected_variants);

  return minNullable([baseStock, variantStock]);
};

export const clampQuantityToStock = (quantity: number, availableStock: number | null) => {
  if (availableStock === null) {
    return Math.max(1, quantity);
  }

  if (availableStock <= 0) {
    return 0;
  }

  return Math.min(Math.max(1, quantity), availableStock);
};
