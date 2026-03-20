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

export const getStandardizedDisplayPrice = (product: any): string => {
  if (!product) return "£0.00";
  
  const base = parseMoneyValue(product.price);
  
  if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
    const validPrices = product.variants
      .map((v: any) => parseMoneyValue(v.price))
      .filter((p: number | null): p is number => p !== null);
      
    if (validPrices.length > 0) {
      const minPrice = Math.min(...validPrices);
      return `£${minPrice.toFixed(2)}`;
    }
  }
  
  return base !== null ? `£${base.toFixed(2)}` : String(product.price || "");
};

export const getStandardizedDisplayTitle = (product: any, activeVariantMap?: Record<string, any> | null): string => {
  if (!product) return "";
  
  let appendText = "";
  if (product.show_variant_in_title) {
    if (activeVariantMap && Object.keys(activeVariantMap).length > 0) {
      const values = Object.values(activeVariantMap).map((v: any) => v.value).filter(Boolean);
      if (values.length > 0) {
        appendText = ` - ${values.join(' / ')}`;
      }
    } else if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
      const validVariants = product.variants.filter((v: any) => v.price !== null && v.price !== undefined && String(v.price).trim() !== "");
      if (validVariants.length > 0) {
        const cheapest = validVariants.reduce((min: any, curr: any) => {
          const currPrice = parseFloat(String(curr.price).replace(/[^\d.-]/g, "")) || 0;
          const minPrice = parseFloat(String(min.price).replace(/[^\d.-]/g, "")) || 0;
          return currPrice < minPrice ? curr : min;
        }, validVariants[0]);
        if (cheapest && cheapest.value) {
          appendText = ` - ${cheapest.value}`;
        }
      } else {
        appendText = ` - ${product.variants[0].value}`;
      }
    }
  }
  
  return `${product.name}${appendText}`;
};
