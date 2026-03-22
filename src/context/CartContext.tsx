import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { clampQuantityToStock, getAvailableStock } from "@/lib/stock";
import { formatMoneyValue, resolveSelectedVariantUnitPrice } from "@/lib/pricing";

export interface CartItem {
    id: number | string;
    product_id: number | string;
    name: string;
    price: string | number;
    qty: number;
    image: string;
    selected_variants?: Record<string, any>;
    track_stock?: boolean;
    stock_quantity?: number | null;
    available_stock?: number | null;
}

interface AppliedCoupon {
    code: string;
    type: "percentage" | "fixed";
    value: number;
    discount: number;
    message: string;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: any, quantity?: number) => void;
    removeFromCart: (id: number | string) => void;
    updateQuantity: (id: number | string, qty: number) => void;
    clearCart: () => void;
    subtotal: number;
    vatEnabled: boolean;
    vatRate: number;
    vatAmount: number;
    coupon: AppliedCoupon | null;
    applyCoupon: (code: string) => Promise<void>;
    removeCoupon: () => void;
    total: number;
    isBusiness: boolean;
    setIsBusiness: (value: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>(() => {
        const savedCart = localStorage.getItem("midia_cart");
        return savedCart ? JSON.parse(savedCart) : [];
    });
    const [vatEnabled, setVatEnabled] = useState(true);
    const [vatRate, setVatRate] = useState(20);
    const [isBusiness, setIsBusiness] = useState(false);
    const [coupon, setCoupon] = useState<AppliedCoupon | null>(() => {
        const saved = localStorage.getItem("midia_coupon");
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        localStorage.setItem("midia_cart", JSON.stringify(cart));
    }, [cart]);

    const hydratedProductIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const itemsMissingStock = cart.filter(
            (item) => item.available_stock === undefined && !hydratedProductIds.current.has(String(item.product_id))
        );
        if (itemsMissingStock.length === 0) return;

        const uniqueProductIds = Array.from(new Set(itemsMissingStock.map((item) => item.product_id)));

        // Mark as in-flight immediately to prevent duplicate calls
        uniqueProductIds.forEach((id) => hydratedProductIds.current.add(String(id)));

        let cancelled = false;

        const hydrateCartStock = async () => {
            try {
                const products = await Promise.all(
                    uniqueProductIds.map((productId) => apiFetch(`/v1/products/${productId}`))
                );

                if (cancelled) return;

                const byId = new Map(products.map((product: Record<string, unknown>) => [String(product.id), product]));

                setCart((prev) => prev.map((item) => {
                    if (item.available_stock !== undefined) return item;

                    const product = byId.get(String(item.product_id));
                    if (!product) return item;

                    return {
                        ...item,
                        track_stock: Boolean(product.track_stock),
                        stock_quantity: typeof product.stock_quantity === "number" ? product.stock_quantity : null,
                        available_stock: getAvailableStock({
                            ...product,
                            selected_variants: item.selected_variants,
                        }),
                    };
                }));
            } catch (err) {
                // Remove from hydrated set so they can be retried
                uniqueProductIds.forEach((id) => hydratedProductIds.current.delete(String(id)));
                console.error("Failed to hydrate cart stock", err);
            }
        };

        hydrateCartStock();

        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cart.map((i) => `${i.product_id}`).join(",")]);

    useEffect(() => {
        if (coupon) {
            localStorage.setItem("midia_coupon", JSON.stringify(coupon));
        } else {
            localStorage.removeItem("midia_coupon");
        }
    }, [coupon]);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await apiFetch("/v1/settings");
                const vatEnabledSetting = res.find((s: any) => s.key === "vat_enabled");
                const vatRateSetting = res.find((s: any) => s.key === "vat_rate");
                setVatEnabled(vatEnabledSetting ? ["1", "true", "yes", "on"].includes(String(vatEnabledSetting.value).toLowerCase()) : false);
                if (vatRateSetting) setVatRate(parseFloat(vatRateSetting.value) || 20);
            } catch (err) {
                console.error("Failed to load settings", err);
            }
        };
        loadSettings();
    }, []);

    const addToCart = (product: any, quantity: number = 1) => {
        let toastMessage: string | null = null;

        setCart((prev) => {
            // Sort keys to ensure consistent unique ID regardless of selection order
            const variantKeys = Object.keys(product.selected_variants || {}).sort();
            const variantId = variantKeys.length > 0
                ? "-" + variantKeys.map(k => `${k}-${product.selected_variants[k].value}`).join("-")
                : "";
            const uniqueId = `${product.id}${variantId}`;
            const availableStock = getAvailableStock(product);

            if (availableStock !== null && availableStock <= 0) {
                toastMessage = `${product.name} is out of stock.`;
                return prev;
            }

            const existing = prev.find((item) => item.id === uniqueId);
            if (existing) {
                const requestedQty = itemQty(existing) + quantity;
                const nextQty = clampQuantityToStock(requestedQty, availableStock);
                const resolvedPrice = formatMoneyValue(resolveSelectedVariantUnitPrice(product.price, product.selected_variants, product) ?? product.price);

                if (availableStock !== null && nextQty < requestedQty) {
                    toastMessage = `Only ${availableStock} unit(s) of ${product.name} are in stock.`;
                }

                return prev.map((item) => (
                    item.id === uniqueId
                        ? {
                            ...item,
                            price: resolvedPrice,
                            qty: nextQty,
                            track_stock: product.track_stock,
                            stock_quantity: product.stock_quantity ?? null,
                            available_stock: availableStock,
                        }
                        : item
                ));
            }

            const nextQty = clampQuantityToStock(quantity, availableStock);
            if (availableStock !== null && nextQty < quantity) {
                toastMessage = `Only ${availableStock} unit(s) of ${product.name} are in stock.`;
            }

            return [
                ...prev,
                {
                    id: uniqueId,
                    product_id: product.id,
                    name: product.name,
                    price: formatMoneyValue(resolveSelectedVariantUnitPrice(product.price, product.selected_variants, product) ?? product.price),
                    image: product.image,
                    qty: nextQty,
                    selected_variants: product.selected_variants,
                    track_stock: product.track_stock,
                    stock_quantity: product.stock_quantity ?? null,
                    available_stock: availableStock,
                },
            ];
        });

        if (toastMessage) {
            toast.error(toastMessage);
        }
    };

    const removeFromCart = (id: number | string) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    };

    const updateQuantity = (id: number | string, qty: number) => {
        let toastMessage: string | null = null;

        setCart((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;

                const nextQty = clampQuantityToStock(qty, item.available_stock ?? null);
                if (item.available_stock !== null && item.available_stock !== undefined && nextQty < qty) {
                    toastMessage = `Only ${item.available_stock} unit(s) of ${item.name} are in stock.`;
                }

                return {
                    ...item,
                    qty: nextQty === 0 ? 1 : nextQty,
                };
            })
        );

        if (toastMessage) {
            toast.error(toastMessage);
        }
    };

    const clearCart = () => {
        setCart([]);
        setCoupon(null);
    };

    const applyCoupon = async (code: string) => {
        if (!code.trim()) return;
        try {
            const res = await apiFetch("/v1/coupons/apply", {
                method: "POST",
                body: JSON.stringify({ code: code.trim().toUpperCase(), order_amount: subtotal }),
            });
            setCoupon(res);
            toast.success(res.message);
        } catch (err: any) {
            const msg = err?.message || "Invalid or expired coupon code";
            toast.error(msg);
        }
    };

    const removeCoupon = () => {
        setCoupon(null);
        toast.success("Coupon removed");
    };

    const subtotal = cart.reduce((acc, item) => {
        const priceStr = typeof item.price === "string" ? item.price : item.price.toString();
        const price = parseFloat(priceStr.replace(/[£,]/g, "")) || 0;
        return acc + price * item.qty;
    }, 0);

    const discount = coupon?.discount ?? 0;
    // Shipping is chosen later at checkout, so cart totals stay ex-delivery.
    const taxableAmount = Math.max(0, subtotal - discount);
    const vatAmount = vatEnabled ? Math.round(taxableAmount * (vatRate / 100) * 100) / 100 : 0;
    const total = cart.length > 0 ? taxableAmount + vatAmount : 0;

    return (
        <CartContext.Provider
            value={{
                cart, addToCart, removeFromCart, updateQuantity, clearCart,
                subtotal, vatEnabled, vatRate, vatAmount,
                coupon, applyCoupon, removeCoupon,
                total,
                isBusiness, setIsBusiness,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

const itemQty = (item: CartItem) => item.qty;

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
