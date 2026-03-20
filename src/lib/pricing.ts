export const parseMoneyValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }

  const parsed = parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
};

export const formatMoneyValue = (value: unknown): string => {
  const parsed = parseMoneyValue(value);
  return parsed === null ? String(value ?? "") : `£${parsed.toFixed(2)}`;
};

export const resolveSelectedVariantUnitPrice = (
  basePrice: unknown,
  selectedVariants?: Record<string, any> | null,
): number | null => {
  const base = parseMoneyValue(basePrice);
  const variantPrices = Object.values(selectedVariants || {})
    .map((variant) => parseMoneyValue(variant?.price))
    .filter((price): price is number => price !== null);

  if (variantPrices.length === 0) {
    return base;
  }

  const uniqueVariantPrices = Array.from(new Set(variantPrices.map((price) => price.toFixed(2))));

  if (uniqueVariantPrices.length === 1) {
    return Number(uniqueVariantPrices[0]);
  }

  return base;
};
