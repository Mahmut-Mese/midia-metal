import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import RichTextEditor from "@/components/admin/RichTextEditor";

const normalizeVariantStock = (value: unknown): number | null => {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeShippingNumber = (value: unknown): number | null => {
    const parsed = Number.parseFloat(String(value ?? ""));
    return Number.isFinite(parsed) ? parsed : null;
};

const shouldAutoGenerateVariantValue = (option: unknown): boolean => {
    const normalized = String(option ?? "").trim().toLowerCase();
    return normalized.includes("measurement") || normalized.includes("panel size") || normalized.includes("filter size");
};

const buildVariantValueFromDimensions = (
    option: unknown,
    lengthCm: unknown,
    widthCm: unknown,
    heightCm: unknown,
): string => {
    if (!shouldAutoGenerateVariantValue(option)) return "";

    const length = normalizeShippingNumber(lengthCm);
    const width = normalizeShippingNumber(widthCm);
    const height = normalizeShippingNumber(heightCm);

    if (length === null || width === null || height === null) {
        return "";
    }

    const widthMm = Math.round(length * 10);
    const heightMm = Math.round(width * 10);
    const depthMm = Math.round(height * 10);

    const widthInches = Math.round(widthMm / 25);
    const heightInches = Math.round(heightMm / 25);
    const depthInches = Math.round(depthMm / 25);

    return `H ${heightMm} x W ${widthMm} x D ${depthMm}mm (${heightInches}" x ${widthInches}" x ${depthInches}")`;
};

const stripCurrencyForAdmin = (value: unknown): string =>
    String(value ?? "").replace(/£/g, "").trim();

const formatPriceForStorage = (value: unknown, fallback = ""): string => {
    const raw = stripCurrencyForAdmin(value);
    if (!raw) return fallback;

    const normalized = raw.replace(/,/g, "");
    const parsed = Number.parseFloat(normalized);

    if (!Number.isFinite(parsed)) {
        return fallback || raw;
    }

    return `£${parsed.toFixed(2)}`;
};

const normalizeVariantPrice = (value: unknown, fallbackPrice: string): string => {
    const normalized = stripCurrencyForAdmin(value);
    return normalized || fallbackPrice;
};

const mapVariantsToProductPrice = (variants: any[] = [], productPrice: string) =>
    variants
        .filter((variant) => variant?.option && variant?.value)
        .map((variant) => ({
            ...variant,
            option: String(variant.option).trim(),
            value: buildVariantValueFromDimensions(
                variant.option,
                variant.shipping_length_cm,
                variant.shipping_width_cm,
                variant.shipping_height_cm,
            ) || String(variant.value).trim(),
            price: normalizeVariantPrice(variant.price, productPrice),
            stock: normalizeVariantStock(variant.stock),
            shipping_weight_kg: normalizeShippingNumber(variant.shipping_weight_kg),
            shipping_length_cm: normalizeShippingNumber(variant.shipping_length_cm),
            shipping_width_cm: normalizeShippingNumber(variant.shipping_width_cm),
            shipping_height_cm: normalizeShippingNumber(variant.shipping_height_cm),
            shipping_class: typeof variant.shipping_class === "string" ? variant.shipping_class : "",
            ships_separately: Boolean(variant.ships_separately),
        }));

const mapVariantsForStorage = (variants: any[] = [], productPrice: string) =>
    variants
        .filter((variant) => variant?.option && variant?.value)
        .map((variant) => ({
            ...variant,
            option: String(variant.option).trim(),
            value: buildVariantValueFromDimensions(
                variant.option,
                variant.shipping_length_cm,
                variant.shipping_width_cm,
                variant.shipping_height_cm,
            ) || String(variant.value).trim(),
            price: formatPriceForStorage(variant.price, productPrice),
            stock: normalizeVariantStock(variant.stock),
            shipping_weight_kg: normalizeShippingNumber(variant.shipping_weight_kg),
            shipping_length_cm: normalizeShippingNumber(variant.shipping_length_cm),
            shipping_width_cm: normalizeShippingNumber(variant.shipping_width_cm),
            shipping_height_cm: normalizeShippingNumber(variant.shipping_height_cm),
            shipping_class: typeof variant.shipping_class === "string" ? variant.shipping_class : "",
            ships_separately: Boolean(variant.ships_separately),
        }));

const SHIPPING_CLASS_OPTIONS = [
    { value: "standard", label: "Standard" },
    { value: "bulky", label: "Bulky" },
    { value: "oversized", label: "Oversized" },
];

type VariantSuggestion = {
    option: string;
    description: string;
    variants: Array<Record<string, any>>;
};

const createSuggestedVariant = (
    option: string,
    value: string,
    overrides: Record<string, any> = {},
) => ({
    option,
    value,
    stock: null,
    shipping_weight_kg: null,
    shipping_length_cm: null,
    shipping_width_cm: null,
    shipping_height_cm: null,
    shipping_class: "",
    ships_separately: false,
    ...overrides,
});

const scaleWeight = (baseWeight: number, multiplier: number) =>
    Math.max(0.5, Math.round(baseWeight * multiplier * 1000) / 1000);

const getVariantSuggestion = (product: any): VariantSuggestion => {
    const name = String(product?.name || "").toLowerCase();
    const baseWeight = normalizeShippingNumber(product?.shipping_weight_kg) ?? 2;
    const baseLength = normalizeShippingNumber(product?.shipping_length_cm) ?? 30;
    const baseWidth = normalizeShippingNumber(product?.shipping_width_cm) ?? 20;
    const baseHeight = normalizeShippingNumber(product?.shipping_height_cm) ?? 10;

    if (name.includes("filter")) {
        const option = "Canopy Measurement";
        return {
            option,
            description: "Suggested filter sizes with shipping dimensions matching the selected panel size.",
            variants: [
                createSuggestedVariant(option, 'H 245 x W 495 x D 48mm (10" x 20" x 2")', {
                    shipping_weight_kg: 2.8,
                    shipping_length_cm: 49.5,
                    shipping_width_cm: 24.5,
                    shipping_height_cm: 4.8,
                    shipping_class: "standard",
                }),
                createSuggestedVariant(option, 'H 445 x W 445 x D 48mm (18" x 18" x 2")', {
                    shipping_weight_kg: 4.6,
                    shipping_length_cm: 44.5,
                    shipping_width_cm: 44.5,
                    shipping_height_cm: 4.8,
                    shipping_class: "standard",
                }),
                createSuggestedVariant(option, 'H 395 x W 495 x D 48mm (16" x 20" x 2")', {
                    shipping_weight_kg: 4.5,
                    shipping_length_cm: 49.5,
                    shipping_width_cm: 39.5,
                    shipping_height_cm: 4.8,
                    shipping_class: "standard",
                }),
                createSuggestedVariant(option, 'H 395 x W 395 x D 48mm (16" x 16" x 2")', {
                    shipping_weight_kg: 3.7,
                    shipping_length_cm: 39.5,
                    shipping_width_cm: 39.5,
                    shipping_height_cm: 4.8,
                    shipping_class: "standard",
                }),
                createSuggestedVariant(option, 'H 495 x W 495 x D 48mm (20" x 20" x 2")', {
                    shipping_weight_kg: 5.3,
                    shipping_length_cm: 49.5,
                    shipping_width_cm: 49.5,
                    shipping_height_cm: 4.8,
                    shipping_class: "standard",
                }),
                createSuggestedVariant(option, 'H 495 x W 395 x D 48mm (20" x 16" x 2")', {
                    shipping_weight_kg: 4.6,
                    shipping_length_cm: 49.5,
                    shipping_width_cm: 39.5,
                    shipping_height_cm: 4.8,
                    shipping_class: "standard",
                }),
            ],
        };
    }

    if (name.includes("canopy") || name.includes("hood")) {
        const option = "Canopy Length";
        return {
            option,
            description: "Starter canopy sizes. Adjust lengths and shipping dimensions to your actual fabricated sizes.",
            variants: [
                createSuggestedVariant(option, "1800mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 0.8),
                    shipping_length_cm: 180,
                    shipping_width_cm: baseWidth,
                    shipping_height_cm: baseHeight,
                    shipping_class: "oversized",
                    ships_separately: true,
                }),
                createSuggestedVariant(option, "2400mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1),
                    shipping_length_cm: 240,
                    shipping_width_cm: baseWidth,
                    shipping_height_cm: baseHeight,
                    shipping_class: "oversized",
                    ships_separately: true,
                }),
                createSuggestedVariant(option, "3000mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1.2),
                    shipping_length_cm: 300,
                    shipping_width_cm: baseWidth,
                    shipping_height_cm: baseHeight,
                    shipping_class: "oversized",
                    ships_separately: true,
                }),
            ],
        };
    }

    if (name.includes("fan")) {
        const option = "Fan Size";
        return {
            option,
            description: "Suggested diameter-based variants for fan products.",
            variants: [
                createSuggestedVariant(option, "250mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 0.7),
                    shipping_length_cm: 45,
                    shipping_width_cm: 45,
                    shipping_height_cm: 35,
                    shipping_class: "bulky",
                    ships_separately: true,
                }),
                createSuggestedVariant(option, "315mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 0.9),
                    shipping_length_cm: 55,
                    shipping_width_cm: 55,
                    shipping_height_cm: 40,
                    shipping_class: "bulky",
                    ships_separately: true,
                }),
                createSuggestedVariant(option, "400mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1.1),
                    shipping_length_cm: 70,
                    shipping_width_cm: 70,
                    shipping_height_cm: 50,
                    shipping_class: "bulky",
                    ships_separately: true,
                }),
            ],
        };
    }

    if (name.includes("light")) {
        const option = "Length";
        return {
            option,
            description: "Suggested length variants for light bars and lighting units.",
            variants: [
                createSuggestedVariant(option, "600mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 0.8),
                    shipping_length_cm: 60,
                    shipping_width_cm: Math.max(10, baseWidth),
                    shipping_height_cm: Math.max(8, baseHeight),
                    shipping_class: "standard",
                }),
                createSuggestedVariant(option, "900mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1),
                    shipping_length_cm: 90,
                    shipping_width_cm: Math.max(10, baseWidth),
                    shipping_height_cm: Math.max(8, baseHeight),
                    shipping_class: "standard",
                }),
                createSuggestedVariant(option, "1200mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1.2),
                    shipping_length_cm: 120,
                    shipping_width_cm: Math.max(10, baseWidth),
                    shipping_height_cm: Math.max(8, baseHeight),
                    shipping_class: "oversized",
                    ships_separately: true,
                }),
            ],
        };
    }

    if (name.includes("feet")) {
        const option = "Height";
        return {
            option,
            description: "Suggested height variants for adjustable feet.",
            variants: [
                createSuggestedVariant(option, "100mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 0.8),
                    shipping_class: "standard",
                }),
                createSuggestedVariant(option, "150mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1),
                    shipping_class: "standard",
                }),
                createSuggestedVariant(option, "200mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1.2),
                    shipping_class: "standard",
                }),
            ],
        };
    }

    if (name.includes("sheet") || name.includes("panel") || name.includes("cladding")) {
        const option = "Panel Size";
        return {
            option,
            description: "Starter panel sizes. Keep these oversized and separate for courier handling.",
            variants: [
                createSuggestedVariant(option, "1000 x 2000mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 0.8),
                    shipping_length_cm: 200,
                    shipping_width_cm: 100,
                    shipping_height_cm: Math.max(1, baseHeight),
                    shipping_class: "oversized",
                    ships_separately: true,
                }),
                createSuggestedVariant(option, "1250 x 2500mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1),
                    shipping_length_cm: 250,
                    shipping_width_cm: 125,
                    shipping_height_cm: Math.max(1, baseHeight),
                    shipping_class: "oversized",
                    ships_separately: true,
                }),
                createSuggestedVariant(option, "1500 x 3000mm", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1.25),
                    shipping_length_cm: 300,
                    shipping_width_cm: 150,
                    shipping_height_cm: Math.max(1, baseHeight),
                    shipping_class: "oversized",
                    ships_separately: true,
                }),
            ],
        };
    }

    if (name.includes("disk")) {
        const option = "Diameter";
        return {
            option,
            description: "Suggested diameter variants for disk products.",
            variants: [
                createSuggestedVariant(option, "200mm", { shipping_class: "standard" }),
                createSuggestedVariant(option, "250mm", { shipping_class: "standard" }),
                createSuggestedVariant(option, "300mm", { shipping_class: "standard" }),
            ],
        };
    }

    if (name.includes("air conditioner")) {
        const option = "BTU Rating";
        return {
            option,
            description: "Suggested capacity variants for air conditioning units.",
            variants: [
                createSuggestedVariant(option, "12000 BTU", {
                    shipping_weight_kg: scaleWeight(baseWeight, 0.8),
                    shipping_class: "bulky",
                    ships_separately: true,
                }),
                createSuggestedVariant(option, "18000 BTU", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1),
                    shipping_class: "bulky",
                    ships_separately: true,
                }),
                createSuggestedVariant(option, "24000 BTU", {
                    shipping_weight_kg: scaleWeight(baseWeight, 1.2),
                    shipping_class: "oversized",
                    ships_separately: true,
                }),
            ],
        };
    }

    return {
        option: "Model",
        description: "Generic starter variant. Rename and replace values to match the real product range.",
        variants: [
            createSuggestedVariant("Model", "Standard", { shipping_class: product?.shipping_class || "standard" }),
            createSuggestedVariant("Model", "Large", { shipping_class: product?.shipping_class || "standard" }),
        ],
    };
};

export default function AdminProducts() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);

    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<any>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, []);

    const loadProducts = async () => {
        try {
            const res = await apiFetch("/admin/products");
            setProducts(res.data);
        } catch (e) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const res = await apiFetch("/admin/product-category-list");
            setCategories(res);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
            toast.success("Product deleted successfully");
            loadProducts();
        } catch (e) {
            toast.error("Failed to delete product");
        }
    };

    const openEdit = (product: any = null) => {
        const prod = product ? (() => {
            const variantOptions = Array.from(
                new Set((product.variants || []).map((variant: any) => String(variant?.option ?? "").trim()).filter(Boolean))
            );

            return {
                ...product,
                price: stripCurrencyForAdmin(product.price),
                old_price: stripCurrencyForAdmin(product.old_price),
                specifications: product.specifications || {},
                variants: mapVariantsToProductPrice(product.variants || [], stripCurrencyForAdmin(product.price || "")),
                variant_option: variantOptions.length === 1 ? variantOptions[0] : "",
            };
        })() : null;
        setCurrentProduct(
            prod || {
                name: "",
                price: "",
                old_price: "",
                image: "",
                gallery: [],
                description: "",
                product_category_id: "",
                tags: [],
                badge: "",
                active: true,
                featured: false,
                track_stock: false,
                stock_quantity: "",
                shipping_weight_kg: 2,
                shipping_length_cm: 30,
                shipping_width_cm: 20,
                shipping_height_cm: 10,
                shipping_class: "standard",
                ships_separately: false,
                order: 0,
                specifications: {},
                variants: [],
                variant_option: "",
            }
        );
        setIsEditing(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Check if there's a pending specification to add
            const keyEl = document.getElementById('new_spec_key') as HTMLInputElement;
            const valEl = document.getElementById('new_spec_value') as HTMLInputElement;
            let finalProduct = { ...currentProduct };

            if (keyEl && valEl) {
                const key = keyEl.value.trim();
                const val = valEl.value.trim();
                if (key && val) {
                    finalProduct.specifications = {
                        ...(finalProduct.specifications || {}),
                        [key]: val
                    };
                    keyEl.value = "";
                    valEl.value = "";
                }
            }

            // Auto-add variant if inputs have data
            const varOptEl = document.getElementById('var_opt') as HTMLInputElement;
            const varValEl = document.getElementById('var_val') as HTMLInputElement;
            const varPriceEl = document.getElementById('var_price') as HTMLInputElement;
            const varStockEl = document.getElementById('var_stock') as HTMLInputElement;
            const varWeightEl = document.getElementById('var_shipping_weight') as HTMLInputElement;
            const varLengthEl = document.getElementById('var_shipping_length') as HTMLInputElement;
            const varWidthEl = document.getElementById('var_shipping_width') as HTMLInputElement;
            const varHeightEl = document.getElementById('var_shipping_height') as HTMLInputElement;
            const varClassEl = document.getElementById('var_shipping_class') as HTMLSelectElement;
            const varSeparateEl = document.getElementById('var_ships_separately') as HTMLInputElement;
            if (varOptEl && varValEl && varOptEl.value && varValEl.value) {
                finalProduct.variants = [
                    ...(finalProduct.variants || []),
                    {
                        option: varOptEl.value,
                        value: varValEl.value,
                        price: normalizeVariantPrice(varPriceEl?.value, finalProduct.price),
                        stock: normalizeVariantStock(varStockEl.value),
                        shipping_weight_kg: normalizeShippingNumber(varWeightEl?.value),
                        shipping_length_cm: normalizeShippingNumber(varLengthEl?.value),
                        shipping_width_cm: normalizeShippingNumber(varWidthEl?.value),
                        shipping_height_cm: normalizeShippingNumber(varHeightEl?.value),
                        shipping_class: varClassEl?.value || "",
                        ships_separately: Boolean(varSeparateEl?.checked),
                    }
                ];
                varOptEl.value = ""; varValEl.value = ""; if (varPriceEl) varPriceEl.value = ""; varStockEl.value = "";
                if (varWeightEl) varWeightEl.value = "";
                if (varLengthEl) varLengthEl.value = "";
                if (varWidthEl) varWidthEl.value = "";
                if (varHeightEl) varHeightEl.value = "";
                if (varClassEl) varClassEl.value = "";
                if (varSeparateEl) varSeparateEl.checked = false;
            }

            finalProduct.price = formatPriceForStorage(finalProduct.price);
            finalProduct.old_price = finalProduct.old_price ? formatPriceForStorage(finalProduct.old_price) : "";
            finalProduct.variants = mapVariantsForStorage(finalProduct.variants || [], finalProduct.price || "");
            finalProduct.shipping_weight_kg = normalizeShippingNumber(finalProduct.shipping_weight_kg);
            finalProduct.shipping_length_cm = normalizeShippingNumber(finalProduct.shipping_length_cm);
            finalProduct.shipping_width_cm = normalizeShippingNumber(finalProduct.shipping_width_cm);
            finalProduct.shipping_height_cm = normalizeShippingNumber(finalProduct.shipping_height_cm);

            if (finalProduct.id) {
                await apiFetch(`/admin/products/${finalProduct.id}`, {
                    method: "PUT",
                    body: JSON.stringify(finalProduct),
                });
                toast.success("Product updated");
            } else {
                await apiFetch("/admin/products", {
                    method: "POST",
                    body: JSON.stringify(finalProduct),
                });
                toast.success("Product created");
            }
            setIsEditing(false);
            loadProducts();
        } catch (err: any) {
            toast.error(err.message || "Failed to save product");
        }
    };

    const filteredProducts = products
        .filter((p) => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === "all" || p.product_category_id?.toString() === categoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            if (sortBy === "price") {
                valA = parseFloat(valA.toString().replace(/[£,]/g, "")) || 0;
                valB = parseFloat(valB.toString().replace(/[£,]/g, "")) || 0;
            } else {
                valA = valA?.toString().toLowerCase();
                valB = valB?.toString().toLowerCase();
            }

            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

    const variantSuggestion = currentProduct ? getVariantSuggestion(currentProduct) : null;
    const currentVariantOptions = Array.from(
        new Set(((currentProduct?.variants || []) as any[]).map((variant: any) => String(variant?.option ?? "").trim()).filter(Boolean))
    );
    const sharedVariantOption = String(
        currentProduct?.variant_option
        || (currentVariantOptions.length === 1 ? currentVariantOptions[0] : "")
        || variantSuggestion?.option
        || ""
    ).trim();
    const useSharedVariantOption = Boolean(
        sharedVariantOption
        && (currentVariantOptions.length <= 1 || currentVariantOptions.every((option) => option === sharedVariantOption))
    );
    const hideVariantValueColumn = Boolean(
        currentProduct
        && Array.isArray(currentProduct.variants)
        && currentProduct.variants.length > 0
        && currentProduct.variants.every((variant: any) => shouldAutoGenerateVariantValue(variant.option))
    );
    const hideVariantOptionColumn = Boolean(
        useSharedVariantOption
        && currentVariantOptions.length > 0
        && currentVariantOptions.every((option) => option === sharedVariantOption)
    );

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-sans text-[#10275c]">Products</h1>
                <button
                    onClick={() => openEdit()}
                    className="flex items-center gap-2 rounded bg-[#eb5c10] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#d4500b]"
                >
                    <Plus className="h-4 w-4" /> Add Product
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full lg:w-80 text-sm"
                />
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white flex-1 sm:flex-none"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id.toString()}>{c.name}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2 flex-1 sm:flex-none">
                        <span className="text-sm text-gray-500 whitespace-nowrap">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white flex-1 sm:flex-none"
                        >
                            <option value="name">Name</option>
                            <option value="price">Price</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className="h-10 px-3 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                        >
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-lg bg-white shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No products found.</td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => (
                                <tr key={product.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0">
                                                <img className="h-10 w-10 rounded-full object-cover" src={product.image} alt="" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                {product.featured && <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Featured</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {product.category?.name || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {product.price}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {product.active ? "Active" : "Inactive"}
                                        </span>
                                        {product.track_stock && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Stock: {product.stock_quantity ?? 0}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openEdit(product)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Editing Modal */}
            {
                isEditing && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mt-20 md:mt-0 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                                <h2 className="text-xl font-bold font-sans text-[#10275c]">{currentProduct.id ? "Edit Product" : "New Product"}</h2>
                                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-500">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={currentProduct.name}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Price</label>
                                        <input
                                            type="text"
                                            required
                                            value={currentProduct.price}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, price: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Old Price (Optional)</label>
                                        <input
                                            type="text"
                                            value={currentProduct.old_price || ""}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, old_price: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <ImageUpload
                                            label="Product Image"
                                            value={currentProduct.image}
                                            onChange={(url) => setCurrentProduct({ ...currentProduct, image: url })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Gallery Images</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                                            {(currentProduct.gallery || []).map((url: string, index: number) => (
                                                <div key={index} className="relative group rounded-md border border-gray-200 overflow-hidden aspect-square">
                                                    <img src={url} className="w-full h-full object-cover" alt={`Gallery ${index}`} />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newGallery = [...(currentProduct.gallery || [])];
                                                            newGallery.splice(index, 1);
                                                            setCurrentProduct({ ...currentProduct, gallery: newGallery });
                                                        }}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="col-span-2 sm:col-span-1 border-2 border-dashed border-gray-300 rounded-md p-2 flex flex-col items-center justify-center">
                                                <ImageUpload
                                                    label=""
                                                    hidePreview={true}
                                                    value=""
                                                    onChange={(url) => setCurrentProduct({ ...currentProduct, gallery: [...(currentProduct.gallery || []), url] })}
                                                />
                                                <span className="text-xs text-gray-500 text-center block w-full mt-1">Add Image</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700">Category</label>
                                        <select
                                            value={currentProduct.product_category_id || ""}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, product_category_id: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                        >
                                            <option value="">Select a category</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700">Badge (Optional)</label>
                                        <input
                                            type="text"
                                            value={currentProduct.badge || ""}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, badge: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                            placeholder="e.g. -11% or New"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Tags (Comma separated)</label>
                                        <input
                                            type="text"
                                            value={(currentProduct.tags || []).join(", ")}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, tags: e.target.value.split(",").map(f => f.trim()).filter(Boolean) })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                            placeholder="Tag 1, Tag 2"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
                                        <div className="space-y-3">
                                            {Object.entries(currentProduct.specifications || {}).map(([key, value]: [string, any], index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <div className="flex-1 text-sm bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md font-medium">{key}</div>
                                                    <div className="flex-1 text-sm bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md">{value}</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newSpecs = { ...currentProduct.specifications };
                                                            delete newSpecs[key];
                                                            setCurrentProduct({ ...currentProduct, specifications: newSpecs });
                                                        }}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Color"
                                                    id="new_spec_key"
                                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Silver"
                                                    id="new_spec_value"
                                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const keyEl = document.getElementById('new_spec_key') as HTMLInputElement;
                                                        const valEl = document.getElementById('new_spec_value') as HTMLInputElement;
                                                        const key = keyEl.value.trim();
                                                        const val = valEl.value.trim();
                                                        if (key && val) {
                                                            setCurrentProduct({
                                                                ...currentProduct,
                                                                specifications: {
                                                                    ...(currentProduct.specifications || {}),
                                                                    [key]: val
                                                                }
                                                            });
                                                            keyEl.value = "";
                                                            valEl.value = "";
                                                        }
                                                    }}
                                                    className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <RichTextEditor
                                            label="Description"
                                            value={currentProduct.description || ""}
                                            onChange={(html) => setCurrentProduct({ ...currentProduct, description: html })}
                                        />
                                    </div>
                                    <div className="col-span-2 flex gap-6">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={currentProduct.active}
                                                onChange={(e) => setCurrentProduct({ ...currentProduct, active: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-600">Active</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={currentProduct.featured}
                                                onChange={(e) => setCurrentProduct({ ...currentProduct, featured: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-600">Featured</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={currentProduct.track_stock}
                                                onChange={(e) => setCurrentProduct({ ...currentProduct, track_stock: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-600">Track Stock</span>
                                        </label>
                                    </div>
                                    {currentProduct.track_stock && (
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                                            <input
                                                type="number"
                                                value={currentProduct.stock_quantity === null || currentProduct.stock_quantity === undefined ? "" : currentProduct.stock_quantity}
                                                onChange={(e) => setCurrentProduct({ ...currentProduct, stock_quantity: e.target.value ? parseInt(e.target.value, 10) : "" })}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                            />
                                        </div>
                                    )}
                                    <div className="col-span-2 border rounded-lg bg-gray-50/70 p-4">
                                        <div className="mb-4">
                                            <label className="block text-sm font-bold text-[#10275c] uppercase tracking-wider">Shipping Profile</label>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Used for live courier rates and label creation. Configure the packed item size, weight, and whether it ships on its own.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-sm font-medium text-gray-700">Shipping Class</label>
                                                <select
                                                    value={currentProduct.shipping_class || "standard"}
                                                    onChange={(e) => setCurrentProduct({ ...currentProduct, shipping_class: e.target.value })}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                                >
                                                    {SHIPPING_CLASS_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>{option.label} parcel</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1 flex items-end">
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(currentProduct.ships_separately)}
                                                        onChange={(e) => setCurrentProduct({ ...currentProduct, ships_separately: e.target.checked })}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-600">Ships in its own parcel</span>
                                                </label>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.001"
                                                    value={currentProduct.shipping_weight_kg ?? ""}
                                                    onChange={(e) => setCurrentProduct({ ...currentProduct, shipping_weight_kg: e.target.value })}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Length (cm)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    value={currentProduct.shipping_length_cm ?? ""}
                                                    onChange={(e) => setCurrentProduct({ ...currentProduct, shipping_length_cm: e.target.value })}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Width (cm)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    value={currentProduct.shipping_width_cm ?? ""}
                                                    onChange={(e) => setCurrentProduct({ ...currentProduct, shipping_width_cm: e.target.value })}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    value={currentProduct.shipping_height_cm ?? ""}
                                                    onChange={(e) => setCurrentProduct({ ...currentProduct, shipping_height_cm: e.target.value })}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-2 border-t pt-6 bg-gray-50/50 p-6 rounded-lg">
                                        <label className="block text-sm font-bold text-[#10275c] mb-1 uppercase tracking-wider">Product Variants</label>
                                        <p className="text-xs text-gray-500 mb-4">Manage different versions of this product (e.g., Color Red, Blue or Size S, M, L)</p>
                                        <p className="text-xs text-gray-500 mb-4">Each variant can use its own price. Leave a new variant price empty to default to the product price.</p>
                                        <p className="text-xs text-gray-500 mb-4">Edit variants directly in the inputs below.</p>
                                        {useSharedVariantOption && (
                                            <div className="mb-4 max-w-sm">
                                                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Variant Option</label>
                                                <input
                                                    type="text"
                                                    value={sharedVariantOption}
                                                    onChange={(e) => {
                                                        const nextOption = e.target.value;
                                                        setCurrentProduct({
                                                            ...currentProduct,
                                                            variant_option: nextOption,
                                                            variants: (currentProduct.variants || []).map((variant: any) => ({
                                                                ...variant,
                                                                option: nextOption,
                                                            })),
                                                        });
                                                    }}
                                                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-4">
                                            {/* Variant List Table */}
                                            {(currentProduct.variants || []).length > 0 && (
                                                <div className="border border-gray-200 rounded-md overflow-x-auto shadow-sm bg-white">
                                                    <table className={`${hideVariantValueColumn ? "min-w-[1220px]" : "min-w-[1540px]"} divide-y divide-gray-200`}>
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                {!hideVariantOptionColumn && (
                                                                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Option</th>
                                                                )}
                                                                {!hideVariantValueColumn && (
                                                                    <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Value</th>
                                                                )}
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Price</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Stock</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Weight (kg)</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Length (cm)</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Width (cm)</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Height (cm)</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Shipping Class</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Ships Separately</th>
                                                                <th className="px-3 py-2 text-right"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {currentProduct.variants.map((v: any, idx: number) => (
                                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                                    {!hideVariantOptionColumn && (
                                                                        <td className="px-3 py-2">
                                                                            <input
                                                                                type="text"
                                                                                value={v.option ?? ""}
                                                                                onChange={(e) => {
                                                                                    const newVariants = [...(currentProduct.variants || [])];
                                                                                    newVariants[idx] = {
                                                                                        ...newVariants[idx],
                                                                                        option: e.target.value,
                                                                                    };
                                                                                    setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                                }}
                                                                                className="w-full min-w-[180px] rounded border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            />
                                                                        </td>
                                                                    )}
                                                                    {!hideVariantValueColumn && (
                                                                        <td className="px-3 py-2">
                                                                            {shouldAutoGenerateVariantValue(v.option) ? (
                                                                                <div className="min-w-[320px] rounded border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-gray-500">
                                                                                    Auto-generated
                                                                                </div>
                                                                            ) : (
                                                                                <input
                                                                                    type="text"
                                                                                    value={v.value ?? ""}
                                                                                    onChange={(e) => {
                                                                                        const newVariants = [...(currentProduct.variants || [])];
                                                                                        newVariants[idx] = {
                                                                                            ...newVariants[idx],
                                                                                            value: e.target.value,
                                                                                        };
                                                                                        setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                                    }}
                                                                                    className="w-full min-w-[320px] rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                                />
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="text"
                                                                            value={v.price ?? ""}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...(currentProduct.variants || [])];
                                                                                newVariants[idx] = {
                                                                                    ...newVariants[idx],
                                                                                    price: e.target.value,
                                                                                };
                                                                                setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                            }}
                                                                            className="w-full min-w-[120px] rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder={currentProduct.price || "£0.00"}
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={v.stock ?? ""}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...(currentProduct.variants || [])];
                                                                                newVariants[idx] = {
                                                                                    ...newVariants[idx],
                                                                                    stock: normalizeVariantStock(e.target.value),
                                                                                };
                                                                                setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                            }}
                                                                            className="w-24 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={0.01}
                                                                            step="0.001"
                                                                            value={v.shipping_weight_kg ?? ""}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...(currentProduct.variants || [])];
                                                                                newVariants[idx] = {
                                                                                    ...newVariants[idx],
                                                                                    shipping_weight_kg: normalizeShippingNumber(e.target.value),
                                                                                };
                                                                                setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                            }}
                                                                            className="w-24 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder="base"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            step="0.01"
                                                                            value={v.shipping_length_cm ?? ""}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...(currentProduct.variants || [])];
                                                                                newVariants[idx] = {
                                                                                    ...newVariants[idx],
                                                                                    shipping_length_cm: normalizeShippingNumber(e.target.value),
                                                                                };
                                                                                const generatedValue = buildVariantValueFromDimensions(
                                                                                    newVariants[idx].option,
                                                                                    e.target.value,
                                                                                    newVariants[idx].shipping_width_cm,
                                                                                    newVariants[idx].shipping_height_cm,
                                                                                );
                                                                                if (generatedValue) {
                                                                                    newVariants[idx].value = generatedValue;
                                                                                }
                                                                                setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                            }}
                                                                            className="w-24 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder="Length"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            step="0.01"
                                                                            value={v.shipping_width_cm ?? ""}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...(currentProduct.variants || [])];
                                                                                newVariants[idx] = {
                                                                                    ...newVariants[idx],
                                                                                    shipping_width_cm: normalizeShippingNumber(e.target.value),
                                                                                };
                                                                                const generatedValue = buildVariantValueFromDimensions(
                                                                                    newVariants[idx].option,
                                                                                    newVariants[idx].shipping_length_cm,
                                                                                    e.target.value,
                                                                                    newVariants[idx].shipping_height_cm,
                                                                                );
                                                                                if (generatedValue) {
                                                                                    newVariants[idx].value = generatedValue;
                                                                                }
                                                                                setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                            }}
                                                                            className="w-24 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder="Width"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            step="0.01"
                                                                            value={v.shipping_height_cm ?? ""}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...(currentProduct.variants || [])];
                                                                                newVariants[idx] = {
                                                                                    ...newVariants[idx],
                                                                                    shipping_height_cm: normalizeShippingNumber(e.target.value),
                                                                                };
                                                                                const generatedValue = buildVariantValueFromDimensions(
                                                                                    newVariants[idx].option,
                                                                                    newVariants[idx].shipping_length_cm,
                                                                                    newVariants[idx].shipping_width_cm,
                                                                                    e.target.value,
                                                                                );
                                                                                if (generatedValue) {
                                                                                    newVariants[idx].value = generatedValue;
                                                                                }
                                                                                setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                            }}
                                                                            className="w-24 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder="Height"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <select
                                                                            value={v.shipping_class ?? ""}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...(currentProduct.variants || [])];
                                                                                newVariants[idx] = {
                                                                                    ...newVariants[idx],
                                                                                    shipping_class: e.target.value,
                                                                                };
                                                                                setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                            }}
                                                                            className="w-36 rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        >
                                                                            <option value="">Use base</option>
                                                                            {SHIPPING_CLASS_OPTIONS.map((option) => (
                                                                                <option key={option.value} value={option.value}>{option.label}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <label className="flex items-center gap-2 text-sm text-gray-600">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Boolean(v.ships_separately)}
                                                                                onChange={(e) => {
                                                                                    const newVariants = [...(currentProduct.variants || [])];
                                                                                    newVariants[idx] = {
                                                                                        ...newVariants[idx],
                                                                                        ships_separately: e.target.checked,
                                                                                    };
                                                                                    setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                                }}
                                                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                                            />
                                                                            <span>Yes</span>
                                                                        </label>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newVariants = [...currentProduct.variants];
                                                                                newVariants.splice(idx, 1);
                                                                                setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                            }}
                                                                            className="text-red-400 hover:text-red-600 p-1"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* New Variant Inputs */}
                                            <div className={`grid grid-cols-2 ${useSharedVariantOption ? "md:grid-cols-4 xl:grid-cols-8" : "md:grid-cols-5 xl:grid-cols-9"} gap-3 items-end p-4 border rounded-md bg-white shadow-sm`}>
                                                {!useSharedVariantOption && (
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Option</label>
                                                        <input id="var_opt" type="text" placeholder={variantSuggestion?.option || "Size"} className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Price</label>
                                                    <input id="var_price" type="text" placeholder={currentProduct.price || "£0.00"} className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Stock</label>
                                                    <input id="var_stock" type="number" placeholder="10" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Weight (kg)</label>
                                                    <input id="var_shipping_weight" type="number" min="0.01" step="0.001" placeholder="base" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Length (cm)</label>
                                                    <input id="var_shipping_length" type="number" min="1" step="0.01" placeholder="base" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Width (cm)</label>
                                                    <input id="var_shipping_width" type="number" min="1" step="0.01" placeholder="base" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Height (cm)</label>
                                                    <input id="var_shipping_height" type="number" min="1" step="0.01" placeholder="base" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Shipping Class</label>
                                                    <select id="var_shipping_class" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300 bg-white">
                                                        <option value="">Use base</option>
                                                        {SHIPPING_CLASS_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2 pb-2">
                                                    <input id="var_ships_separately" type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                                    <label htmlFor="var_ships_separately" className="text-[10px] text-gray-500 uppercase font-bold">Ships Separately</label>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const optEl = document.getElementById('var_opt') as HTMLInputElement;
                                                        const priceEl = document.getElementById('var_price') as HTMLInputElement;
                                                        const stockEl = document.getElementById('var_stock') as HTMLInputElement;
                                                        const weightEl = document.getElementById('var_shipping_weight') as HTMLInputElement;
                                                        const lengthEl = document.getElementById('var_shipping_length') as HTMLInputElement;
                                                        const widthEl = document.getElementById('var_shipping_width') as HTMLInputElement;
                                                        const heightEl = document.getElementById('var_shipping_height') as HTMLInputElement;
                                                        const classEl = document.getElementById('var_shipping_class') as HTMLSelectElement;
                                                        const separateEl = document.getElementById('var_ships_separately') as HTMLInputElement;
                                                        const generatedValue = buildVariantValueFromDimensions(
                                                            useSharedVariantOption ? sharedVariantOption : optEl?.value,
                                                            lengthEl?.value,
                                                            widthEl?.value,
                                                            heightEl?.value,
                                                        );
                                                        const resolvedOption = (useSharedVariantOption ? sharedVariantOption : optEl?.value || "").trim();
                                                        const isMeasurementVariant = shouldAutoGenerateVariantValue(resolvedOption);
                                                        const resolvedValue = isMeasurementVariant ? generatedValue : resolvedOption;

                                                        if (isMeasurementVariant && !generatedValue) {
                                                            toast.error("For measurement variants, enter Len / Wid / Ht in cm.");
                                                            return;
                                                        }

                                                        if (resolvedOption && resolvedValue) {
                                                            setCurrentProduct({
                                                                ...currentProduct,
                                                                variants: [
                                                                    ...(currentProduct.variants || []),
                                                                    {
                                                                        option: resolvedOption,
                                                                        value: resolvedValue,
                                                                        price: normalizeVariantPrice(priceEl?.value, currentProduct.price),
                                                                        stock: normalizeVariantStock(stockEl.value),
                                                                        shipping_weight_kg: normalizeShippingNumber(weightEl?.value),
                                                                        shipping_length_cm: normalizeShippingNumber(lengthEl?.value),
                                                                        shipping_width_cm: normalizeShippingNumber(widthEl?.value),
                                                                        shipping_height_cm: normalizeShippingNumber(heightEl?.value),
                                                                        shipping_class: classEl?.value || "",
                                                                        ships_separately: Boolean(separateEl?.checked),
                                                                    }
                                                                ]
                                                            });
                                                            if (optEl) optEl.value = ""; if (priceEl) priceEl.value = ""; stockEl.value = "";
                                                            if (weightEl) weightEl.value = "";
                                                            if (lengthEl) lengthEl.value = "";
                                                            if (widthEl) widthEl.value = "";
                                                            if (heightEl) heightEl.value = "";
                                                            if (classEl) classEl.value = "";
                                                            if (separateEl) separateEl.checked = false;
                                                        } else {
                                                            toast.error("Variant option is required.");
                                                        }
                                                    }}
                                                    className="bg-[#eb5c10] text-white py-2 px-3 rounded text-sm font-bold hover:bg-[#d4500b] transition-colors shadow-sm"
                                                >
                                                    Add Variant
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] pb-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-md bg-[#eb5c10] px-4 py-2 text-sm font-medium text-white shadow-sm hover:focus:outline-none"
                                    >
                                        Save Product
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
