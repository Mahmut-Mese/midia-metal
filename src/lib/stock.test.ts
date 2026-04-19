import { describe, it, expect } from "vitest";
import {
  parseStockValue,
  getVariantStockLimit,
  getAvailableStock,
  clampQuantityToStock,
  MAX_ORDER_QUANTITY,
} from "@/lib/stock";

describe("parseStockValue", () => {
  it("parses a valid integer", () => {
    expect(parseStockValue(10)).toBe(10);
  });

  it("parses a string integer", () => {
    expect(parseStockValue("25")).toBe(25);
  });

  it("parses zero", () => {
    expect(parseStockValue(0)).toBe(0);
    expect(parseStockValue("0")).toBe(0);
  });

  it("clamps negative to 0", () => {
    expect(parseStockValue(-5)).toBe(0);
  });

  it("returns null for null", () => {
    expect(parseStockValue(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseStockValue(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseStockValue("")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(parseStockValue("abc")).toBeNull();
  });

  it("parses float to nearest integer via Number()", () => {
    expect(parseStockValue(5.7)).toBe(5.7);
  });
});

describe("getVariantStockLimit", () => {
  it("returns null when no variants", () => {
    expect(getVariantStockLimit([], {})).toBeNull();
  });

  it("returns stock for a single row even without selection", () => {
    const variants = [{ option: "Size", value: "Large", stock: 10 }];
    expect(getVariantStockLimit(variants, null)).toBe(10);
  });

  it("returns stock for matched legacy variant", () => {
    const variants = [
      { option: "Size", value: "Large", stock: 10 },
      { option: "Size", value: "Small", stock: 5 },
    ];
    const selected = {
      Size: { option: "Size", value: "Large" },
    };
    expect(getVariantStockLimit(variants, selected)).toBe(10);
  });

  it("returns minimum stock across multiple selected options", () => {
    const variants = [
      { option: "Size", value: "Large", stock: 10 },
      { option: "Colour", value: "Red", stock: 3 },
    ];
    const selected = {
      Size: { option: "Size", value: "Large" },
      Colour: { option: "Colour", value: "Red" },
    };
    expect(getVariantStockLimit(variants, selected)).toBe(3);
  });

  it("returns null when no stock data on matching variant", () => {
    const variants = [{ option: "Size", value: "Large" }];
    const selected = { Size: { option: "Size", value: "Large" } };
    expect(getVariantStockLimit(variants, selected)).toBeNull();
  });

  it("returns stock for combination variant match", () => {
    const variants = [
      { attributes: { Material: "Steel", Size: "Large" }, stock: 7 },
      { attributes: { Material: "Aluminium", Size: "Small" }, stock: 12 },
    ];
    const selected = {
      Material: { option: "Material", value: "Steel" },
      Size: { option: "Size", value: "Large" },
    };
    expect(getVariantStockLimit(variants, selected)).toBe(7);
  });
});

describe("getAvailableStock", () => {
  it("returns explicit available_stock when set", () => {
    expect(getAvailableStock({ available_stock: 15 })).toBe(15);
  });

  it("returns null when track_stock is false", () => {
    expect(getAvailableStock({ track_stock: false, stock_quantity: 10 })).toBeNull();
  });

  it("returns base stock when tracked and no variants", () => {
    expect(getAvailableStock({ track_stock: true, stock_quantity: 20 })).toBe(20);
  });

  it("returns minimum of base and variant stock", () => {
    const product = {
      track_stock: true,
      stock_quantity: 20,
      variants: [{ option: "Size", value: "Large", stock: 5 }],
      selected_variants: { Size: { option: "Size", value: "Large" } },
    };
    expect(getAvailableStock(product)).toBe(5);
  });

  it("returns null when track_stock is true but no stock data", () => {
    expect(getAvailableStock({ track_stock: true })).toBeNull();
  });
});

describe("clampQuantityToStock", () => {
  it("clamps to available stock", () => {
    expect(clampQuantityToStock(10, 5)).toBe(5);
  });

  it("allows quantity within stock", () => {
    expect(clampQuantityToStock(3, 10)).toBe(3);
  });

  it("enforces minimum of 1", () => {
    expect(clampQuantityToStock(0, 10)).toBe(1);
    expect(clampQuantityToStock(-5, 10)).toBe(1);
  });

  it("returns 0 when stock is 0", () => {
    expect(clampQuantityToStock(5, 0)).toBe(0);
  });

  it("uses MAX_ORDER_QUANTITY when stock is null", () => {
    expect(clampQuantityToStock(1000, null)).toBe(MAX_ORDER_QUANTITY);
  });

  it("caps at MAX_ORDER_QUANTITY even with high stock", () => {
    expect(clampQuantityToStock(2000, 5000)).toBe(MAX_ORDER_QUANTITY);
  });
});

describe("MAX_ORDER_QUANTITY", () => {
  it("is 999", () => {
    expect(MAX_ORDER_QUANTITY).toBe(999);
  });
});
