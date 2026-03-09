import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export interface CartItem {
    id: number | string;
    product_id: number | string;
    name: string;
    price: string | number;
    qty: number;
    image: string;
    selected_variants?: Record<string, any>;
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
    shippingRate: number;
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
    const [shippingRate, setShippingRate] = useState(0);
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
                const rate = res.find((s: any) => s.key === "shipping_rate");
                const vatEnabledSetting = res.find((s: any) => s.key === "vat_enabled");
                const vatRateSetting = res.find((s: any) => s.key === "vat_rate");
                if (rate) setShippingRate(parseFloat(rate.value) || 0);
                setVatEnabled(vatEnabledSetting ? ["1", "true", "yes", "on"].includes(String(vatEnabledSetting.value).toLowerCase()) : false);
                if (vatRateSetting) setVatRate(parseFloat(vatRateSetting.value) || 20);
            } catch (err) {
                console.error("Failed to load settings", err);
            }
        };
        loadSettings();
    }, []);

    const addToCart = (product: any, quantity: number = 1) => {
        setCart((prev) => {
            // Sort keys to ensure consistent unique ID regardless of selection order
            const variantKeys = Object.keys(product.selected_variants || {}).sort();
            const variantId = variantKeys.length > 0
                ? "-" + variantKeys.map(k => `${k}-${product.selected_variants[k].value}`).join("-")
                : "";
            const uniqueId = `${product.id}${variantId}`;

            const existing = prev.find((item) => item.id === uniqueId);
            if (existing) {
                return prev.map((item) =>
                    item.id === uniqueId ? { ...item, qty: item.qty + quantity } : item
                );
            }
            return [
                ...prev,
                {
                    id: uniqueId,
                    product_id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    qty: quantity,
                    selected_variants: product.selected_variants
                },
            ];
        });
    };

    const removeFromCart = (id: number | string) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    };

    const updateQuantity = (id: number | string, qty: number) => {
        setCart((prev) =>
            prev.map((item) => (item.id === id ? { ...item, qty: Math.max(1, qty) } : item))
        );
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
    // VAT is calculated on (subtotal + shippingRate - discount)
    const taxableAmount = subtotal + shippingRate - discount;
    const vatAmount = vatEnabled ? Math.round(taxableAmount * (vatRate / 100) * 100) / 100 : 0;
    const total = cart.length > 0 ? taxableAmount + vatAmount : 0;

    return (
        <CartContext.Provider
            value={{
                cart, addToCart, removeFromCart, updateQuantity, clearCart,
                subtotal, shippingRate, vatEnabled, vatRate, vatAmount,
                coupon, applyCoupon, removeCoupon,
                total,
                isBusiness, setIsBusiness,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
