import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface WishlistItem {
    id: number | string;
    name: string;
    price: string | number;
    image: string;
    slug?: string;
}

interface WishlistContextType {
    wishlist: WishlistItem[];
    addToWishlist: (item: WishlistItem) => void;
    removeFromWishlist: (id: number | string) => void;
    isInWishlist: (id: number | string) => boolean;
    clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
        try {
            const saved = localStorage.getItem("midia_wishlist");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem("midia_wishlist", JSON.stringify(wishlist));
    }, [wishlist]);

    const addToWishlist = (item: WishlistItem) => {
        setWishlist((prev) => {
            if (prev.find((w) => w.id === item.id)) return prev;
            return [...prev, item];
        });
    };

    const removeFromWishlist = (id: number | string) => {
        setWishlist((prev) => prev.filter((w) => w.id !== id));
    };

    const isInWishlist = (id: number | string) => {
        return wishlist.some((w) => w.id === id);
    };

    const clearWishlist = () => setWishlist([]);

    return (
        <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, clearWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error("useWishlist must be used within a WishlistProvider");
    }
    return context;
}
