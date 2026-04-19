import { findMatchingCombinationVariant, getProductVariantMode, resolveSelectedVariantRecord } from "@/lib/variants";

/** Hard cap on the quantity a customer can order in a single line item. */
export const MAX_ORDER_QUANTITY = 999;

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
    return variants?.length === 1 ? parseStockValue(variants[0]?.stock) : null;
  }

  if (getProductVariantMode({ variants }) === "combination") {
    return parseStockValue(findMatchingCombinationVariant(variants, selectedVariants)?.stock);
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
  variant_mode?: unknown;
  variant_options?: unknown;
  variants?: Array<Record<string, any>> | null;
  selected_variants?: Record<string, any> | null;
  available_stock?: unknown;
}) => {
  const explicitAvailable = parseStockValue(product.available_stock);
  if (explicitAvailable !== null) {
    return explicitAvailable;
  }

  // When track_stock is false, ignore both product-level and variant-level stock
  if (!product.track_stock) {
    return null;
  }

  const resolvedVariant = resolveSelectedVariantRecord(product, product.selected_variants);
  const variantStock = resolvedVariant
    ? parseStockValue(resolvedVariant.stock)
    : getProductVariantMode(product) === "combination"
      ? parseStockValue(findMatchingCombinationVariant(product.variants, product.selected_variants, [])?.stock)
      : getVariantStockLimit(product.variants, product.selected_variants);

  if (variantStock !== null) {
    return variantStock;
  }

  return parseStockValue(product.stock_quantity);
};

export const clampQuantityToStock = (quantity: number, availableStock: number | null) => {
  const cap = availableStock !== null
    ? Math.min(availableStock, MAX_ORDER_QUANTITY)
    : MAX_ORDER_QUANTITY;

  if (cap <= 0) {
    return 0;
  }

  return Math.min(Math.max(1, quantity), cap);
};
