import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, X, SlidersHorizontal, Undo2 } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    getSelectionTableSourceValues,
    getSelectionTableTabValues,
    normalizeFrontendVariantLayout,
    normalizeSelectionTableConfig,
    type FrontendVariantLayout,
} from "@/lib/selectionTable";

const normalizeVariantStock = (value: unknown): number | null => {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeVariantCustomFields = (value: unknown): Record<string, string> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .map(([key, fieldValue]) => [key, String(fieldValue ?? "")])
            .filter(([key]) => key.trim() !== ""),
    );
};

const normalizeShippingNumber = (value: unknown): number | null => {
    const parsed = Number.parseFloat(String(value ?? ""));
    return Number.isFinite(parsed) ? parsed : null;
};

const shouldAutoGenerateVariantValue = (option: unknown): boolean => {
    const normalized = String(option ?? "").trim().toLowerCase();
    return normalized.includes("size") || normalized.includes("measurement") || normalized.includes("panel") || normalized.includes("filter");
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

    return `Size : H ${heightMm} x W ${widthMm} x D ${depthMm}mm (${heightInches}" x ${widthInches}" x ${depthInches}")`;
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

const normalizeVariantOptionName = (value: unknown): string => String(value ?? "").trim();

const normalizeVariantOptionList = (value: unknown): string[] => (
    Array.isArray(value)
        ? value.map((option) => normalizeVariantOptionName(option)).filter(Boolean)
        : []
);

const normalizeCombinationAttributes = (
    value: unknown,
    optionNames: string[],
): Record<string, string> => {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

    return Object.fromEntries(
        optionNames.map((optionName) => [optionName, String(source[optionName] ?? "")]),
    );
};

const isCombinationVariant = (variant: any): boolean => {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
        return false;
    }

    return Object.keys(variant.attributes || {}).some((key) => normalizeVariantOptionName(key));
};

const getVariantModeForProduct = (product: any): "legacy" | "combination" => {
    const explicitMode = String(product?.variant_mode ?? "").trim().toLowerCase();
    if (explicitMode === "combination") {
        return "combination";
    }

    return (product?.variants || []).some((variant: any) => isCombinationVariant(variant))
        ? "combination"
        : "legacy";
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
            price: String(variant.option ?? "").toLowerCase() === "size"
                ? normalizeVariantPrice(variant.price, productPrice)
                : (variant.price || null),
            stock: normalizeVariantStock(variant.stock),
            shipping_weight_kg: normalizeShippingNumber(variant.shipping_weight_kg),
            shipping_length_cm: normalizeShippingNumber(variant.shipping_length_cm),
            shipping_width_cm: normalizeShippingNumber(variant.shipping_width_cm),
            shipping_height_cm: normalizeShippingNumber(variant.shipping_height_cm),
            shipping_class: typeof variant.shipping_class === "string" ? variant.shipping_class : "",
            ships_separately: Boolean(variant.ships_separately),
            custom_fields: normalizeVariantCustomFields(variant.custom_fields),
        }));

const mapVariantsForStorage = (variants: any[] = [], productPrice: string) =>
    variants
        .filter((variant) => variant?.option && variant?.value)
        .map((variant) => {
            const isSize = String(variant.option ?? "").toLowerCase() === "size";
            return {
                ...variant,
                option: String(variant.option).trim(),
                value: buildVariantValueFromDimensions(
                    variant.option,
                    variant.shipping_length_cm,
                    variant.shipping_width_cm,
                    variant.shipping_height_cm,
                ) || String(variant.value).trim(),
                price: isSize
                    ? formatPriceForStorage(variant.price, productPrice)
                    : (variant.price || null),
                stock: normalizeVariantStock(variant.stock),
                shipping_weight_kg: normalizeShippingNumber(variant.shipping_weight_kg),
                shipping_length_cm: normalizeShippingNumber(variant.shipping_length_cm),
                shipping_width_cm: normalizeShippingNumber(variant.shipping_width_cm),
                shipping_height_cm: normalizeShippingNumber(variant.shipping_height_cm),
                shipping_class: typeof variant.shipping_class === "string" ? variant.shipping_class : "",
                ships_separately: Boolean(variant.ships_separately),
                custom_fields: normalizeVariantCustomFields(variant.custom_fields),
            };
        });

const createEmptyCombinationVariant = (optionNames: string[] = []) => ({
    attributes: Object.fromEntries(optionNames.map((optionName) => [optionName, ""])),
    price: "",
    stock: "",
    shipping_weight_kg: "",
    shipping_length_cm: "",
    shipping_width_cm: "",
    shipping_height_cm: "",
    shipping_class: "",
    ships_separately: false,
    custom_fields: {},
});

const mapCombinationVariantsToAdmin = (
    variants: any[] = [],
    productPrice: string,
    optionNames: string[],
) => variants
    .filter((variant) => isCombinationVariant(variant))
    .map((variant) => ({
        ...variant,
        attributes: normalizeCombinationAttributes(variant.attributes, optionNames),
        price: normalizeVariantPrice(variant.price, productPrice),
        stock: normalizeVariantStock(variant.stock),
        shipping_weight_kg: normalizeShippingNumber(variant.shipping_weight_kg),
        shipping_length_cm: normalizeShippingNumber(variant.shipping_length_cm),
        shipping_width_cm: normalizeShippingNumber(variant.shipping_width_cm),
        shipping_height_cm: normalizeShippingNumber(variant.shipping_height_cm),
        shipping_class: typeof variant.shipping_class === "string" ? variant.shipping_class : "",
        ships_separately: Boolean(variant.ships_separately),
        custom_fields: normalizeVariantCustomFields(variant.custom_fields),
    }));

const mapCombinationVariantsForStorage = (
    variants: any[] = [],
    productPrice: string,
    optionNames: string[],
) => variants
    .map((variant) => ({
        ...variant,
        attributes: normalizeCombinationAttributes(variant.attributes, optionNames),
        price: formatPriceForStorage(variant.price, productPrice),
        stock: normalizeVariantStock(variant.stock),
        shipping_weight_kg: normalizeShippingNumber(variant.shipping_weight_kg),
        shipping_length_cm: normalizeShippingNumber(variant.shipping_length_cm),
        shipping_width_cm: normalizeShippingNumber(variant.shipping_width_cm),
        shipping_height_cm: normalizeShippingNumber(variant.shipping_height_cm),
        shipping_class: typeof variant.shipping_class === "string" ? variant.shipping_class : "",
        ships_separately: Boolean(variant.ships_separately),
        custom_fields: normalizeVariantCustomFields(variant.custom_fields),
    }))
    .filter((variant) => optionNames.every((optionName) => String(variant.attributes?.[optionName] ?? "").trim()));

const SHIPPING_CLASS_OPTIONS = [
    { value: "standard", label: "Standard" },
    { value: "bulky", label: "Bulky" },
    { value: "oversized", label: "Oversized" },
];

type VariantTableSection = "size" | "general" | "combination";

type VariantTableColumn = {
    key: string;
    label: string;
    visible: boolean;
    frontendVisible: boolean;
};

type VariantTableColumns = Record<VariantTableSection, VariantTableColumn[]>;

type VariantSuggestion = {
    option: string;
    description: string;
    variants: Array<Record<string, any>>;
};

const DEFAULT_VARIANT_TABLE_COLUMNS: VariantTableColumns = {
    size: [
        { key: "price", label: "Price", visible: true, frontendVisible: false },
        { key: "stock", label: "Stock", visible: true, frontendVisible: false },
        { key: "shipping_weight_kg", label: "Weight (kg)", visible: true, frontendVisible: true },
        { key: "shipping_length_cm", label: "Length (cm)", visible: true, frontendVisible: true },
        { key: "shipping_width_cm", label: "Width (cm)", visible: true, frontendVisible: true },
        { key: "shipping_height_cm", label: "Height (cm)", visible: true, frontendVisible: true },
    ],
    general: [
        { key: "option", label: "Option", visible: true, frontendVisible: true },
        { key: "value", label: "Value", visible: true, frontendVisible: true },
        { key: "stock", label: "Stock", visible: true, frontendVisible: false },
    ],
    combination: [],
};

const FIXED_SIZE_COLUMNS: VariantTableColumn[] = [
    { key: "shipping_class", label: "Shipping Class", visible: true, frontendVisible: true },
    { key: "ships_separately", label: "Ships Separately", visible: true, frontendVisible: true },
];
const HIDDEN_SIZE_COLUMN_KEYS = new Set(["value"]);
const FIXED_SIZE_COLUMN_KEYS = new Set(FIXED_SIZE_COLUMNS.map((column) => column.key));

const buildCustomColumnKey = (label: string, existingKeys: string[]) => {
    const base = label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "column";

    let candidate = `custom:${base}`;
    let suffix = 2;

    while (existingKeys.includes(candidate)) {
        candidate = `custom:${base}_${suffix}`;
        suffix += 1;
    }

    return candidate;
};

const isCustomColumnKey = (key: string) => key.startsWith("custom:");

const cloneVariantTableColumns = (columns: VariantTableColumns): VariantTableColumns => ({
    size: columns.size.map((column) => ({ ...column })),
    general: columns.general.map((column) => ({ ...column })),
    combination: (columns.combination || []).map((column) => ({ ...column })),
});

const normalizeVariantTableColumns = (value: unknown): VariantTableColumns => {
    if (!value || typeof value !== "object") {
        return cloneVariantTableColumns(DEFAULT_VARIANT_TABLE_COLUMNS);
    }

    const provided = value as Partial<Record<VariantTableSection, VariantTableColumn[]>>;

    const normalizeSectionColumns = (
        section: VariantTableSection,
        defaults: VariantTableColumn[],
        providedColumns: VariantTableColumn[] | undefined,
    ) => {
        const safeProvided = Array.isArray(providedColumns) ? providedColumns : [];
        const defaultKeys = new Set(defaults.map((column) => column.key));
        const reservedKeys = section === "size"
            ? new Set([...FIXED_SIZE_COLUMN_KEYS, ...HIDDEN_SIZE_COLUMN_KEYS])
            : new Set<string>();
        const normalizedDefaults = defaults.map((defaultColumn) => {
            const candidate = safeProvided.find((column) => column?.key === defaultColumn.key);
            return {
                ...defaultColumn,
                label: String(candidate?.label ?? defaultColumn.label).trim() || defaultColumn.label,
                visible: typeof candidate?.visible === "boolean" ? candidate.visible : defaultColumn.visible,
                frontendVisible: typeof candidate?.frontendVisible === "boolean"
                    ? candidate.frontendVisible
                    : defaultColumn.frontendVisible,
            };
        });
        const customColumns = safeProvided
            .filter((column) => (
                column
                && typeof column.key === "string"
                && !defaultKeys.has(column.key)
                && !reservedKeys.has(column.key)
            ))
            .map((column) => ({
                key: column.key,
                label: String(column.label ?? "").trim() || "Custom Column",
                visible: typeof column.visible === "boolean" ? column.visible : true,
                frontendVisible: typeof column.frontendVisible === "boolean" ? column.frontendVisible : true,
            }));

        return [...normalizedDefaults, ...customColumns];
    };

    return {
        size: normalizeSectionColumns("size", DEFAULT_VARIANT_TABLE_COLUMNS.size, provided.size),
        general: normalizeSectionColumns("general", DEFAULT_VARIANT_TABLE_COLUMNS.general, provided.general),
        combination: normalizeSectionColumns("combination", DEFAULT_VARIANT_TABLE_COLUMNS.combination, provided.combination),
    };
};

const getDraftField = <T,>(value: unknown, fallback: T): T => value === undefined ? fallback : value as T;

const createEmptySizeVariant = () => ({
    value: "",
    price: "",
    stock: "",
    shipping_weight_kg: "",
    shipping_length_cm: "",
    shipping_width_cm: "",
    shipping_height_cm: "",
    shipping_class: "",
    ships_separately: false,
    custom_fields: {},
});

const createEmptyGeneralVariant = () => ({
    option: "",
    value: "",
    stock: "",
    custom_fields: {},
});

type VariantColumnManagerProps = {
    title: string;
    description: string;
    columns: VariantTableColumn[];
    onLabelChange: (key: string, label: string) => void;
    onVisibilityChange: (key: string, visible: boolean) => void;
    onFrontendVisibilityChange: (key: string, frontendVisible: boolean) => void;
    onAddColumn: (label: string) => void;
};

function VariantColumnManager({
    title,
    description,
    columns,
    onLabelChange,
    onVisibilityChange,
    onFrontendVisibilityChange,
    onAddColumn,
}: VariantColumnManagerProps) {
    const visibleCount = columns.filter((column) => column.visible).length;
    const [newColumnLabel, setNewColumnLabel] = useState("");

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Columns</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                        {visibleCount}/{columns.length}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] p-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{title}</p>
                    <p className="text-xs text-gray-400">{description}</p>
                </div>
                <ScrollArea className="mt-3 h-[min(420px,60vh)] pr-3">
                    <div className="space-y-2">
                        {columns.map((column) => (
                            <div key={column.key} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-2">
                                <button
                                    type="button"
                                    onClick={() => onVisibilityChange(column.key, !column.visible)}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                                        column.visible
                                            ? "border-red-200 bg-white text-red-500 hover:bg-red-50"
                                            : "border-green-200 bg-white text-green-600 hover:bg-green-50"
                                    }`}
                                    aria-label={column.visible ? `Remove ${column.label} column` : `Restore ${column.label} column`}
                                    title={column.visible ? "Remove column" : "Restore column"}
                                >
                                    {column.visible ? <Trash2 className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                                </button>
                                <div className="min-w-0">
                                    <input
                                        type="text"
                                        value={column.label}
                                        onChange={(event) => onLabelChange(column.key, event.target.value)}
                                        className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                    />
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-400">
                                            {column.visible ? "visible" : "removed"} • {isCustomColumnKey(column.key) ? "custom" : column.key}
                                        </div>
                                        <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                                            <input
                                                type="checkbox"
                                                checked={column.frontendVisible}
                                                onChange={(event) => onFrontendVisibilityChange(column.key, event.target.checked)}
                                                className="rounded border-gray-300 text-[#eb5c10] focus:ring-[#eb5c10]"
                                            />
                                            <span>Show on frontend</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <div className="mt-3 border-t border-gray-200 pt-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newColumnLabel}
                            onChange={(event) => setNewColumnLabel(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    const label = newColumnLabel.trim();
                                    if (!label) return;
                                    onAddColumn(label);
                                    setNewColumnLabel("");
                                }
                            }}
                            className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                            placeholder="Add new text column"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const label = newColumnLabel.trim();
                                if (!label) return;
                                onAddColumn(label);
                                setNewColumnLabel("");
                            }}
                            className="inline-flex items-center rounded-md bg-[#eb5c10] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#d4500b]"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

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
    const [newSizeVariant, setNewSizeVariant] = useState(createEmptySizeVariant());
    const [newOtherVariant, setNewOtherVariant] = useState(createEmptyGeneralVariant());
    const [newCombinationVariant, setNewCombinationVariant] = useState(createEmptyCombinationVariant());
    const [newCombinationOptionName, setNewCombinationOptionName] = useState("");
    const [newSelectionTableTabValue, setNewSelectionTableTabValue] = useState("");

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
            const res = await apiFetch("/admin/products?per_page=500");
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
            const variantMode = getVariantModeForProduct(product);
            const combinationOptions = normalizeVariantOptionList(product.variant_options);
            const inferredCombinationOptions = (product.variants || []).flatMap((variant: any) => Object.keys(variant?.attributes || {}).map((key) => normalizeVariantOptionName(key)));
            const variantOptions = Array.from(
                new Set((product.variants || []).map((variant: any) => String(variant?.option ?? "").trim()).filter(Boolean))
            );
            const optionNames = variantMode === "combination"
                ? Array.from(new Set([...combinationOptions, ...inferredCombinationOptions].filter(Boolean)))
                : variantOptions;
            const productPrice = stripCurrencyForAdmin(product.price || "");
            const variantTableColumns = normalizeVariantTableColumns(product.variant_table_columns);
            const selectionTableSourceKeys = [
                ...optionNames,
                ...variantTableColumns.combination.map((column) => column.key),
            ];

            return {
                ...product,
                variant_mode: variantMode,
                variant_options: optionNames,
                frontend_variant_layout: normalizeFrontendVariantLayout(product.frontend_variant_layout),
                selection_table_config: normalizeSelectionTableConfig(product.selection_table_config, optionNames, product.variants || [], selectionTableSourceKeys),
                price: stripCurrencyForAdmin(product.price),
                old_price: stripCurrencyForAdmin(product.old_price),
                show_variant_in_title: Boolean(product.show_variant_in_title),
                specifications: product.specifications || {},
                variants: variantMode === "combination"
                    ? mapCombinationVariantsToAdmin(product.variants || [], productPrice, optionNames)
                    : mapVariantsToProductPrice(product.variants || [], productPrice),
                legacy_variants_draft: variantMode === "legacy"
                    ? mapVariantsToProductPrice(product.variants || [], productPrice)
                    : [],
                combination_variants_draft: variantMode === "combination"
                    ? mapCombinationVariantsToAdmin(product.variants || [], productPrice, optionNames)
                    : [],
                legacy_variant_option_draft: variantMode === "legacy" ? (variantOptions.length === 1 ? variantOptions[0] : "") : "",
                combination_variant_options_draft: variantMode === "combination" ? optionNames : [],
                combination_frontend_variant_layout_draft: normalizeFrontendVariantLayout(product.frontend_variant_layout),
                combination_selection_table_config_draft: normalizeSelectionTableConfig(product.selection_table_config, optionNames, product.variants || [], selectionTableSourceKeys),
                variant_table_columns: variantTableColumns,
                variant_option: variantOptions.length === 1 ? variantOptions[0] : "",
            };
        })() : null;
        setCurrentProduct(
            prod || {
                name: "",
                variant_mode: "legacy",
                variant_options: [],
                frontend_variant_layout: "default" satisfies FrontendVariantLayout,
                selection_table_config: normalizeSelectionTableConfig(null),
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
                legacy_variants_draft: [],
                combination_variants_draft: [],
                legacy_variant_option_draft: "",
                combination_variant_options_draft: [],
                combination_frontend_variant_layout_draft: "default" satisfies FrontendVariantLayout,
                combination_selection_table_config_draft: normalizeSelectionTableConfig(null),
                variant_table_columns: cloneVariantTableColumns(DEFAULT_VARIANT_TABLE_COLUMNS),
                variant_option: "",
                show_variant_in_title: false,
            }
        );
        setNewSizeVariant(createEmptySizeVariant());
        setNewOtherVariant(createEmptyGeneralVariant());
        setNewCombinationVariant(createEmptyCombinationVariant(prod?.variant_options || []));
        setNewCombinationOptionName("");
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

            finalProduct.price = formatPriceForStorage(finalProduct.price);
            finalProduct.old_price = finalProduct.old_price ? formatPriceForStorage(finalProduct.old_price) : "";
            delete finalProduct.legacy_variants_draft;
            delete finalProduct.combination_variants_draft;
            delete finalProduct.legacy_variant_option_draft;
            delete finalProduct.combination_variant_options_draft;
            delete finalProduct.combination_frontend_variant_layout_draft;
            delete finalProduct.combination_selection_table_config_draft;
            finalProduct.variant_mode = finalProduct.variant_mode === "combination" ? "combination" : "legacy";
            finalProduct.frontend_variant_layout = normalizeFrontendVariantLayout(finalProduct.frontend_variant_layout);
            finalProduct.variant_options = finalProduct.variant_mode === "combination"
                ? normalizeVariantOptionList(finalProduct.variant_options)
                : [];
            finalProduct.variants = finalProduct.variant_mode === "combination"
                ? mapCombinationVariantsForStorage(finalProduct.variants || [], finalProduct.price || "", finalProduct.variant_options)
                : mapVariantsForStorage(finalProduct.variants || [], finalProduct.price || "");
            finalProduct.variant_table_columns = normalizeVariantTableColumns(finalProduct.variant_table_columns);
            const selectionTableSourceKeys = [
                ...finalProduct.variant_options,
                ...finalProduct.variant_table_columns.combination.map((column: VariantTableColumn) => column.key),
            ];
            finalProduct.selection_table_config = normalizeSelectionTableConfig(
                finalProduct.selection_table_config,
                finalProduct.variant_options,
                finalProduct.variants || [],
                selectionTableSourceKeys,
            );
            finalProduct.shipping_weight_kg = normalizeShippingNumber(finalProduct.shipping_weight_kg);
            finalProduct.shipping_length_cm = normalizeShippingNumber(finalProduct.shipping_length_cm);
            finalProduct.shipping_width_cm = normalizeShippingNumber(finalProduct.shipping_width_cm);
            finalProduct.shipping_height_cm = normalizeShippingNumber(finalProduct.shipping_height_cm);

            if (finalProduct.frontend_variant_layout === "selection_table") {
                if (finalProduct.variant_mode !== "combination") {
                    toast.error("Selection table layout requires combination pricing.");
                    return;
                }

                if (!finalProduct.selection_table_config?.tab_option) {
                    toast.error("Choose which combination option should drive the table tabs.");
                    return;
                }
            } else {
                finalProduct.selection_table_config = null;
            }

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

    const updateVariantTableColumn = (
        section: VariantTableSection,
        key: string,
        patch: Partial<VariantTableColumn>,
    ) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const config = normalizeVariantTableColumns(prev.variant_table_columns);

            return {
                ...prev,
                variant_table_columns: {
                    ...config,
                    [section]: config[section].map((column) => (
                        column.key === key ? { ...column, ...patch } : column
                    )),
                },
            };
        });
    };

    const addVariantTableColumn = (section: VariantTableSection, label: string) => {
        const trimmedLabel = label.trim();
        if (!trimmedLabel) {
            return;
        }

        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const config = normalizeVariantTableColumns(prev.variant_table_columns);
            const fixedKeys = section === "size" ? FIXED_SIZE_COLUMNS.map((column) => column.key) : [];
            const allSectionColumns = [...config[section], ...FIXED_SIZE_COLUMNS.filter(() => section === "size")];
            const duplicateLabel = allSectionColumns.some((column) => column.label.trim().toLowerCase() === trimmedLabel.toLowerCase());

            if (duplicateLabel) {
                toast.error("That column already exists.");
                return prev;
            }

            const newColumn: VariantTableColumn = {
                key: buildCustomColumnKey(trimmedLabel, [...config[section].map((column) => column.key), ...fixedKeys]),
                label: trimmedLabel,
                visible: true,
                frontendVisible: true,
            };

            return {
                ...prev,
                variant_table_columns: {
                    ...config,
                    [section]: [...config[section], newColumn],
                },
            };
        });
    };

    const updateSelectionTableConfig = (patch: Record<string, unknown>) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;
            const selectionTableSourceKeys = [
                ...normalizeVariantOptionList(prev.variant_options),
                ...normalizeVariantTableColumns(prev.variant_table_columns).combination.map((column) => column.key),
            ];

            return {
                ...prev,
                selection_table_config: {
                    ...normalizeSelectionTableConfig(prev.selection_table_config, normalizeVariantOptionList(prev.variant_options), prev.variants || [], selectionTableSourceKeys),
                    ...patch,
                },
            };
        });
    };

    const updateSelectionTableTab = (tabValue: string, patch: Record<string, unknown>) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const optionNames = normalizeVariantOptionList(prev.variant_options);
            const selectionTableSourceKeys = [
                ...optionNames,
                ...normalizeVariantTableColumns(prev.variant_table_columns).combination.map((column) => column.key),
            ];
            const config = normalizeSelectionTableConfig(prev.selection_table_config, optionNames, prev.variants || [], selectionTableSourceKeys);

            return {
                ...prev,
                selection_table_config: {
                    ...config,
                    tabs: config.tabs.map((tab) => tab.value === tabValue ? { ...tab, ...patch } : tab),
                },
            };
        });
    };

    const addSelectionTableTab = () => {
        const trimmedValue = newSelectionTableTabValue.trim();
        if (!trimmedValue) {
            return;
        }

        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const optionNames = normalizeVariantOptionList(prev.variant_options);
            const selectionTableSourceKeys = [
                ...optionNames,
                ...normalizeVariantTableColumns(prev.variant_table_columns).combination.map((column) => column.key),
            ];
            const config = normalizeSelectionTableConfig(prev.selection_table_config, optionNames, prev.variants || [], selectionTableSourceKeys);

            if (config.tabs.some((tab) => tab.value.trim().toLowerCase() === trimmedValue.toLowerCase())) {
                toast.error("That tab already exists.");
                return prev;
            }

            return {
                ...prev,
                selection_table_config: {
                    ...config,
                    tabs: [
                        ...config.tabs,
                        {
                            value: trimmedValue,
                            mode: "table",
                            heading: "",
                            intro_text: "",
                        },
                    ],
                },
            };
        });

        setNewSelectionTableTabValue("");
    };

    const removeSelectionTableTab = (tabValue: string) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const optionNames = normalizeVariantOptionList(prev.variant_options);
            const selectionTableSourceKeys = [
                ...optionNames,
                ...normalizeVariantTableColumns(prev.variant_table_columns).combination.map((column) => column.key),
            ];
            const config = normalizeSelectionTableConfig(prev.selection_table_config, optionNames, prev.variants || [], selectionTableSourceKeys);

            return {
                ...prev,
                selection_table_config: {
                    ...config,
                    default_tab: config.default_tab === tabValue ? "" : config.default_tab,
                    tabs: config.tabs.filter((tab) => tab.value !== tabValue),
                },
            };
        });
    };

    const updateVariantCustomField = (index: number, customKey: string, value: string) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const variants = [...(prev.variants || [])];
            const variant = variants[index] || {};
            const customFields = normalizeVariantCustomFields(variant.custom_fields);
            variants[index] = {
                ...variant,
                custom_fields: {
                    ...customFields,
                    [customKey]: value,
                },
            };

            return {
                ...prev,
                variants,
            };
        });
    };

    const updateNewVariantCustomField = (
        section: VariantTableSection,
        customKey: string,
        value: string,
    ) => {
        if (section === "size") {
            setNewSizeVariant((prev) => ({
                ...prev,
                custom_fields: {
                    ...normalizeVariantCustomFields(prev.custom_fields),
                    [customKey]: value,
                },
            }));
            return;
        }

        setNewOtherVariant((prev) => ({
            ...prev,
            custom_fields: {
                ...normalizeVariantCustomFields(prev.custom_fields),
                [customKey]: value,
            },
        }));
    };

    const updateSizeVariantField = (index: number, field: string, value: unknown) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const variants = [...(prev.variants || [])];
            const nextVariant = {
                ...variants[index],
                [field]: value,
            };

            if (["shipping_length_cm", "shipping_width_cm", "shipping_height_cm"].includes(field)) {
                const generatedValue = buildVariantValueFromDimensions(
                    "Size",
                    nextVariant.shipping_length_cm,
                    nextVariant.shipping_width_cm,
                    nextVariant.shipping_height_cm,
                );

                if (generatedValue) {
                    nextVariant.value = generatedValue;
                }
            }

            variants[index] = nextVariant;

            return {
                ...prev,
                variants,
            };
        });
    };

    const updateOtherVariantField = (index: number, field: string, value: unknown) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const variants = [...(prev.variants || [])];
            variants[index] = {
                ...variants[index],
                [field]: value,
            };

            return {
                ...prev,
                variants,
            };
        });
    };

    const removeVariantAtIndex = (index: number) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const variants = [...(prev.variants || [])];
            variants.splice(index, 1);

            return {
                ...prev,
                variants,
            };
        });
    };

    const appendNewSizeVariant = () => {
        const generatedValue = buildVariantValueFromDimensions(
            "Size",
            newSizeVariant.shipping_length_cm,
            newSizeVariant.shipping_width_cm,
            newSizeVariant.shipping_height_cm,
        );
        const manualValue = String(newSizeVariant.value ?? "").trim();
        const finalValue = generatedValue || manualValue;

        if (!finalValue) {
            toast.error("Enter Length, Width, and Height.");
            return;
        }

        setCurrentProduct((prev: any) => ({
            ...prev,
            variants: [
                ...(prev?.variants || []),
                {
                    option: "Size",
                    value: finalValue,
                    price: normalizeVariantPrice(newSizeVariant.price, prev?.price || ""),
                    stock: normalizeVariantStock(newSizeVariant.stock),
                    shipping_weight_kg: normalizeShippingNumber(newSizeVariant.shipping_weight_kg),
                    shipping_length_cm: normalizeShippingNumber(newSizeVariant.shipping_length_cm),
                    shipping_width_cm: normalizeShippingNumber(newSizeVariant.shipping_width_cm),
                    shipping_height_cm: normalizeShippingNumber(newSizeVariant.shipping_height_cm),
                    shipping_class: newSizeVariant.shipping_class || "",
                    ships_separately: Boolean(newSizeVariant.ships_separately),
                    custom_fields: normalizeVariantCustomFields(newSizeVariant.custom_fields),
                },
            ],
        }));

        setNewSizeVariant(createEmptySizeVariant());
    };

    const appendNewOtherVariant = () => {
        const optionName = String(newOtherVariant.option ?? "").trim();
        const variantValue = String(newOtherVariant.value ?? "").trim();

        if (!optionName) {
            toast.error("Please enter an option name (e.g. Color).");
            return;
        }

        if (!variantValue) {
            toast.error("Please enter a value (e.g. Red).");
            return;
        }

        setCurrentProduct((prev: any) => ({
            ...prev,
            variants: [
                ...(prev?.variants || []),
                {
                    option: optionName,
                    value: variantValue,
                    price: null,
                    stock: normalizeVariantStock(newOtherVariant.stock),
                    shipping_weight_kg: null,
                    shipping_length_cm: null,
                    shipping_width_cm: null,
                    shipping_height_cm: null,
                    shipping_class: "",
                    ships_separately: false,
                    custom_fields: normalizeVariantCustomFields(newOtherVariant.custom_fields),
                },
            ],
        }));

        setNewOtherVariant(createEmptyGeneralVariant());
    };

    const setProductVariantMode = (nextMode: "legacy" | "combination") => {
        setCurrentProduct((prev: any) => {
            if (!prev || prev.variant_mode === nextMode) {
                return prev;
            }

            const currentVariantMode = prev.variant_mode === "combination" ? "combination" : "legacy";
            const variantTableColumns = normalizeVariantTableColumns(prev.variant_table_columns);

            const legacyVariantsDraft = currentVariantMode === "legacy"
                ? (prev.variants || [])
                : getDraftField(prev.legacy_variants_draft, []);
            const combinationVariantsDraft = currentVariantMode === "combination"
                ? (prev.variants || [])
                : getDraftField(prev.combination_variants_draft, []);
            const legacyVariantOptionDraft = currentVariantMode === "legacy"
                ? String(prev.variant_option ?? "")
                : String(getDraftField(prev.legacy_variant_option_draft, ""));
            const combinationVariantOptionsDraft = currentVariantMode === "combination"
                ? normalizeVariantOptionList(prev.variant_options)
                : normalizeVariantOptionList(getDraftField(prev.combination_variant_options_draft, []));
            const combinationFrontendLayoutDraft = currentVariantMode === "combination"
                ? normalizeFrontendVariantLayout(prev.frontend_variant_layout)
                : normalizeFrontendVariantLayout(getDraftField(prev.combination_frontend_variant_layout_draft, "default"));
            const combinationSelectionConfigDraft = currentVariantMode === "combination"
                ? prev.selection_table_config
                : getDraftField(prev.combination_selection_table_config_draft, normalizeSelectionTableConfig(null));

            const nextVariantOptions = nextMode === "combination" ? combinationVariantOptionsDraft : [];
            const nextVariants = nextMode === "combination" ? combinationVariantsDraft : legacyVariantsDraft;
            const nextFrontendLayout = nextMode === "combination" ? combinationFrontendLayoutDraft : "default";
            const nextSelectionTableSourceKeys = [
                ...nextVariantOptions,
                ...variantTableColumns.combination.map((column) => column.key),
            ];

            return {
                ...prev,
                variant_mode: nextMode,
                variants: nextVariants,
                variant_options: nextVariantOptions,
                variant_option: nextMode === "legacy" ? legacyVariantOptionDraft : String(prev.variant_option ?? ""),
                legacy_variants_draft: legacyVariantsDraft,
                combination_variants_draft: combinationVariantsDraft,
                legacy_variant_option_draft: legacyVariantOptionDraft,
                combination_variant_options_draft: combinationVariantOptionsDraft,
                combination_frontend_variant_layout_draft: combinationFrontendLayoutDraft,
                combination_selection_table_config_draft: combinationSelectionConfigDraft,
                frontend_variant_layout: nextFrontendLayout,
                selection_table_config: nextMode === "combination"
                    ? normalizeSelectionTableConfig(
                        combinationSelectionConfigDraft,
                        nextVariantOptions,
                        nextVariants,
                        nextSelectionTableSourceKeys,
                    )
                    : prev.selection_table_config,
            };
        });

        setNewSizeVariant(createEmptySizeVariant());
        setNewOtherVariant(createEmptyGeneralVariant());
        setNewCombinationVariant(createEmptyCombinationVariant(
            nextMode === "combination"
                ? normalizeVariantOptionList(currentProduct?.combination_variant_options_draft || currentProduct?.variant_options || [])
                : [],
        ));
        setNewCombinationOptionName("");
    };

    const addCombinationOption = () => {
        const optionName = normalizeVariantOptionName(newCombinationOptionName);
        if (!optionName) {
            toast.error("Enter an option name such as Height or Feature.");
            return;
        }

        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const existingOptions = normalizeVariantOptionList(prev.variant_options);
            if (existingOptions.includes(optionName)) {
                toast.error("That option already exists.");
                return prev;
            }

            const nextOptions = [...existingOptions, optionName];

            return {
                ...prev,
                variant_options: nextOptions,
                variants: (prev.variants || []).map((variant: any) => ({
                    ...variant,
                    attributes: {
                        ...normalizeCombinationAttributes(variant.attributes, existingOptions),
                        [optionName]: "",
                    },
                })),
            };
        });

        setNewCombinationVariant((prev) => ({
            ...prev,
            attributes: {
                ...normalizeCombinationAttributes(prev.attributes, normalizeVariantOptionList(currentProduct?.variant_options)),
                [optionName]: "",
            },
        }));
        setNewCombinationOptionName("");
    };

    const removeCombinationOption = (optionName: string) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const nextOptions = normalizeVariantOptionList(prev.variant_options).filter((option) => option !== optionName);
            const nextSelectionTableConfig = normalizeSelectionTableConfig(
                prev.selection_table_config,
                nextOptions,
                prev.variants || [],
                [
                    ...nextOptions,
                    ...normalizeVariantTableColumns(prev.variant_table_columns).combination.map((column) => column.key),
                ],
            );
            return {
                ...prev,
                variant_options: nextOptions,
                selection_table_config: nextSelectionTableConfig,
                variants: (prev.variants || []).map((variant: any) => ({
                    ...variant,
                    attributes: normalizeCombinationAttributes(variant.attributes, nextOptions),
                })),
            };
        });

        setNewCombinationVariant((prev) => ({
            ...prev,
            attributes: Object.fromEntries(
                Object.entries(prev.attributes || {}).filter(([key]) => key !== optionName),
            ),
        }));
    };

    const updateCombinationVariantAttribute = (index: number, optionName: string, value: string) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const variants = [...(prev.variants || [])];
            variants[index] = {
                ...variants[index],
                attributes: {
                    ...normalizeCombinationAttributes(variants[index]?.attributes, normalizeVariantOptionList(prev.variant_options)),
                    [optionName]: value,
                },
            };

            return {
                ...prev,
                variants,
            };
        });
    };

    const updateCombinationVariantField = (index: number, field: string, value: unknown) => {
        setCurrentProduct((prev: any) => {
            if (!prev) return prev;

            const variants = [...(prev.variants || [])];
            variants[index] = {
                ...variants[index],
                [field]: value,
            };

            return {
                ...prev,
                variants,
            };
        });
    };

    const appendNewCombinationVariant = () => {
        const optionNames = normalizeVariantOptionList(currentProduct?.variant_options);

        if (optionNames.length === 0) {
            toast.error("Add at least one option name first.");
            return;
        }

        const attributes = normalizeCombinationAttributes(newCombinationVariant.attributes, optionNames);
        const missingOption = optionNames.find((optionName) => !String(attributes[optionName] ?? "").trim());
        if (missingOption) {
            toast.error(`Please enter a value for ${missingOption}.`);
            return;
        }

        setCurrentProduct((prev: any) => ({
            ...prev,
            variants: [
                ...(prev?.variants || []),
                {
                    attributes,
                    price: normalizeVariantPrice(newCombinationVariant.price, prev?.price || ""),
                    stock: normalizeVariantStock(newCombinationVariant.stock),
                    shipping_weight_kg: normalizeShippingNumber(newCombinationVariant.shipping_weight_kg),
                    shipping_length_cm: normalizeShippingNumber(newCombinationVariant.shipping_length_cm),
                    shipping_width_cm: normalizeShippingNumber(newCombinationVariant.shipping_width_cm),
                    shipping_height_cm: normalizeShippingNumber(newCombinationVariant.shipping_height_cm),
                    shipping_class: newCombinationVariant.shipping_class || "",
                    ships_separately: Boolean(newCombinationVariant.ships_separately),
                    custom_fields: normalizeVariantCustomFields(newCombinationVariant.custom_fields),
                },
            ],
        }));

        setNewCombinationVariant(createEmptyCombinationVariant(optionNames));
    };

    const variantTableColumns = currentProduct
        ? normalizeVariantTableColumns(currentProduct.variant_table_columns)
        : cloneVariantTableColumns(DEFAULT_VARIANT_TABLE_COLUMNS);
    const combinationOptionNames = normalizeVariantOptionList(currentProduct?.variant_options);
    const selectionTableSourceKeys = [
        ...combinationOptionNames,
        ...variantTableColumns.combination.map((column) => column.key),
    ];
    const selectionTableConfig = normalizeSelectionTableConfig(currentProduct?.selection_table_config, combinationOptionNames, currentProduct?.variants || [], selectionTableSourceKeys);
    const selectionTableTabValues = getSelectionTableTabValues(selectionTableConfig, currentProduct?.variants || []);
    const selectionTableDataTabValues = selectionTableConfig.tab_option
        ? getSelectionTableSourceValues(currentProduct?.variants || [], selectionTableConfig.tab_option)
        : [];
    const combinationVariantEntries = (currentProduct?.variants || []).map((variant: any, index: number) => ({ variant, index }));
    const visibleSizeColumns = [
        ...variantTableColumns.size.filter((column) => column.visible),
        ...FIXED_SIZE_COLUMNS,
    ];
    const visibleGeneralColumns = variantTableColumns.general.filter((column) => column.visible);
    const visibleCombinationCustomColumns = variantTableColumns.combination.filter((column) => column.visible);
    const selectionTableTabSources = [
        ...combinationOptionNames.map((optionName) => ({
            key: optionName,
            label: `Option: ${optionName}`,
        })),
        ...variantTableColumns.combination.map((column) => ({
            key: column.key,
            label: `Column: ${column.label}`,
        })),
    ];
    const sizeVariantEntries = (currentProduct?.variants || []).flatMap((variant: any, index: number) => (
        String(variant?.option ?? "").toLowerCase() === "size" ? [{ variant, index }] : []
    ));
    const otherVariantEntries = (currentProduct?.variants || []).flatMap((variant: any, index: number) => (
        String(variant?.option ?? "").toLowerCase() !== "size" ? [{ variant, index }] : []
    ));

    const renderSizeVariantCell = (columnKey: string, variant: any, index: number) => {
        const baseInputClass = "rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none";
        const customKey = columnKey.startsWith("custom:") ? columnKey.slice("custom:".length) : null;

        if (customKey) {
            return (
                <input
                    type="text"
                    value={variant?.custom_fields?.[customKey] ?? ""}
                    onChange={(event) => updateVariantCustomField(index, customKey, event.target.value)}
                    className={`w-24 ${baseInputClass}`}
                    placeholder="Value"
                />
            );
        }

        switch (columnKey) {
            case "value":
                return (
                    <input
                        type="text"
                        value={variant.value ?? ""}
                        onChange={(event) => updateSizeVariantField(index, "value", event.target.value)}
                        className={`w-40 ${baseInputClass}`}
                        placeholder="e.g. H600 x W1200 x D500mm"
                    />
                );
            case "price":
                return (
                    <input
                        type="text"
                        value={variant.price ?? ""}
                        onChange={(event) => updateSizeVariantField(index, "price", event.target.value)}
                        className={`w-16 ${baseInputClass}`}
                        placeholder={currentProduct?.price || "£0.00"}
                    />
                );
            case "stock":
                return (
                    <input
                        type="number"
                        min={0}
                        value={variant.stock ?? ""}
                        onChange={(event) => updateSizeVariantField(index, "stock", normalizeVariantStock(event.target.value))}
                        className={`w-16 ${baseInputClass}`}
                    />
                );
            case "shipping_weight_kg":
                return (
                    <input
                        type="number"
                        min={0.01}
                        step="0.001"
                        value={variant.shipping_weight_kg ?? ""}
                        onChange={(event) => updateSizeVariantField(index, "shipping_weight_kg", normalizeShippingNumber(event.target.value))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder="base"
                    />
                );
            case "shipping_length_cm":
                return (
                    <input
                        type="number"
                        min={1}
                        step="0.01"
                        value={variant.shipping_length_cm ?? ""}
                        onChange={(event) => updateSizeVariantField(index, "shipping_length_cm", normalizeShippingNumber(event.target.value))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder="base"
                    />
                );
            case "shipping_width_cm":
                return (
                    <input
                        type="number"
                        min={1}
                        step="0.01"
                        value={variant.shipping_width_cm ?? ""}
                        onChange={(event) => updateSizeVariantField(index, "shipping_width_cm", normalizeShippingNumber(event.target.value))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder="base"
                    />
                );
            case "shipping_height_cm":
                return (
                    <input
                        type="number"
                        min={1}
                        step="0.01"
                        value={variant.shipping_height_cm ?? ""}
                        onChange={(event) => updateSizeVariantField(index, "shipping_height_cm", normalizeShippingNumber(event.target.value))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder="base"
                    />
                );
            case "shipping_class":
                return (
                    <select
                        value={variant.shipping_class ?? ""}
                        onChange={(event) => updateSizeVariantField(index, "shipping_class", event.target.value)}
                        className={`w-24 ${baseInputClass}`}
                    >
                        <option value="">Use base</option>
                        {SHIPPING_CLASS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                );
            case "ships_separately":
                return (
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={Boolean(variant.ships_separately)}
                            onChange={(event) => updateSizeVariantField(index, "ships_separately", event.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Yes</span>
                    </label>
                );
            default:
                return null;
        }
    };

    const renderNewSizeVariantCell = (columnKey: string) => {
        const baseInputClass = "rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none";
        const customKey = columnKey.startsWith("custom:") ? columnKey.slice("custom:".length) : null;

        if (customKey) {
            return (
                <input
                    type="text"
                    value={newSizeVariant.custom_fields?.[customKey] ?? ""}
                    onChange={(event) => updateNewVariantCustomField("size", customKey, event.target.value)}
                    className={`w-24 ${baseInputClass}`}
                    placeholder="Value"
                />
            );
        }

        switch (columnKey) {
            case "value":
                return (
                    <input
                        type="text"
                        value={newSizeVariant.value}
                        onChange={(event) => setNewSizeVariant((prev) => ({ ...prev, value: event.target.value }))}
                        className={`w-40 ${baseInputClass}`}
                        placeholder="Optional manual label"
                    />
                );
            case "price":
                return (
                    <input
                        type="text"
                        value={newSizeVariant.price}
                        onChange={(event) => setNewSizeVariant((prev) => ({ ...prev, price: event.target.value }))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder={currentProduct?.price || "£0.00"}
                    />
                );
            case "stock":
                return (
                    <input
                        type="number"
                        value={newSizeVariant.stock}
                        onChange={(event) => setNewSizeVariant((prev) => ({ ...prev, stock: event.target.value }))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder="10"
                    />
                );
            case "shipping_weight_kg":
                return (
                    <input
                        type="number"
                        min={0.01}
                        step="0.001"
                        value={newSizeVariant.shipping_weight_kg}
                        onChange={(event) => setNewSizeVariant((prev) => ({ ...prev, shipping_weight_kg: event.target.value }))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder="base"
                    />
                );
            case "shipping_length_cm":
                return (
                    <input
                        type="number"
                        min={1}
                        step="0.01"
                        value={newSizeVariant.shipping_length_cm}
                        onChange={(event) => setNewSizeVariant((prev) => ({ ...prev, shipping_length_cm: event.target.value }))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder="base"
                    />
                );
            case "shipping_width_cm":
                return (
                    <input
                        type="number"
                        min={1}
                        step="0.01"
                        value={newSizeVariant.shipping_width_cm}
                        onChange={(event) => setNewSizeVariant((prev) => ({ ...prev, shipping_width_cm: event.target.value }))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder="base"
                    />
                );
            case "shipping_height_cm":
                return (
                    <input
                        type="number"
                        min={1}
                        step="0.01"
                        value={newSizeVariant.shipping_height_cm}
                        onChange={(event) => setNewSizeVariant((prev) => ({ ...prev, shipping_height_cm: event.target.value }))}
                        className={`w-16 ${baseInputClass}`}
                        placeholder="base"
                    />
                );
            case "shipping_class":
                return (
                    <select
                        value={newSizeVariant.shipping_class}
                        onChange={(event) => setNewSizeVariant((prev) => ({ ...prev, shipping_class: event.target.value }))}
                        className={`w-24 ${baseInputClass}`}
                    >
                        <option value="">Use base</option>
                        {SHIPPING_CLASS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                );
            case "ships_separately":
                return (
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={newSizeVariant.ships_separately}
                            onChange={(event) => setNewSizeVariant((prev) => ({ ...prev, ships_separately: event.target.checked }))}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Yes</span>
                    </label>
                );
            default:
                return null;
        }
    };

    const renderOtherVariantCell = (columnKey: string, variant: any, index: number) => {
        const baseInputClass = "w-20 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none";
        const customKey = columnKey.startsWith("custom:") ? columnKey.slice("custom:".length) : null;

        if (customKey) {
            return (
                <input
                    type="text"
                    value={variant?.custom_fields?.[customKey] ?? ""}
                    onChange={(event) => updateVariantCustomField(index, customKey, event.target.value)}
                    className={baseInputClass}
                    placeholder="Value"
                />
            );
        }

        switch (columnKey) {
            case "option":
                return (
                    <input
                        type="text"
                        value={variant.option ?? ""}
                        onChange={(event) => updateOtherVariantField(index, "option", event.target.value)}
                        className={baseInputClass}
                        placeholder="Color"
                    />
                );
            case "value":
                return (
                    <input
                        type="text"
                        value={variant.value ?? ""}
                        onChange={(event) => updateOtherVariantField(index, "value", event.target.value)}
                        className={baseInputClass}
                        placeholder="e.g. Red"
                    />
                );
            case "stock":
                return (
                    <input
                        type="number"
                        min={0}
                        value={variant.stock ?? ""}
                        onChange={(event) => updateOtherVariantField(index, "stock", normalizeVariantStock(event.target.value))}
                        className={baseInputClass}
                    />
                );
            default:
                return null;
        }
    };

    const renderNewOtherVariantCell = (columnKey: string) => {
        const baseInputClass = "w-20 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none";
        const customKey = columnKey.startsWith("custom:") ? columnKey.slice("custom:".length) : null;

        if (customKey) {
            return (
                <input
                    type="text"
                    value={newOtherVariant.custom_fields?.[customKey] ?? ""}
                    onChange={(event) => updateNewVariantCustomField("general", customKey, event.target.value)}
                    className={baseInputClass}
                    placeholder="Value"
                />
            );
        }

        switch (columnKey) {
            case "option":
                return (
                    <input
                        type="text"
                        value={newOtherVariant.option}
                        onChange={(event) => setNewOtherVariant((prev) => ({ ...prev, option: event.target.value }))}
                        className={baseInputClass}
                        placeholder="Color"
                    />
                );
            case "value":
                return (
                    <input
                        type="text"
                        value={newOtherVariant.value}
                        onChange={(event) => setNewOtherVariant((prev) => ({ ...prev, value: event.target.value }))}
                        className={baseInputClass}
                        placeholder="e.g. Red"
                    />
                );
            case "stock":
                return (
                    <input
                        type="number"
                        value={newOtherVariant.stock}
                        onChange={(event) => setNewOtherVariant((prev) => ({ ...prev, stock: event.target.value }))}
                        className={baseInputClass}
                        placeholder="10"
                    />
                );
            default:
                return null;
        }
    };

    const renderCombinationCustomFieldCell = (variant: any, index: number, columnKey: string) => {
        const customKey = columnKey.startsWith("custom:") ? columnKey.slice("custom:".length) : "";
        if (!customKey) {
            return null;
        }

        return (
            <input
                type="text"
                value={variant?.custom_fields?.[customKey] ?? ""}
                onChange={(event) => updateVariantCustomField(index, customKey, event.target.value)}
                className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                placeholder="Value"
            />
        );
    };

    const renderNewCombinationCustomFieldCell = (columnKey: string) => {
        const customKey = columnKey.startsWith("custom:") ? columnKey.slice("custom:".length) : "";
        if (!customKey) {
            return null;
        }

        return (
            <input
                type="text"
                value={newCombinationVariant.custom_fields?.[customKey] ?? ""}
                onChange={(event) => setNewCombinationVariant((prev) => ({
                    ...prev,
                    custom_fields: {
                        ...normalizeVariantCustomFields(prev.custom_fields),
                        [customKey]: event.target.value,
                    },
                }))}
                className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                placeholder="Value"
            />
        );
    };

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
                                    <div className="col-span-2">
                                        <label className="inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={currentProduct.show_variant_in_title}
                                                onChange={(e) => setCurrentProduct({ ...currentProduct, show_variant_in_title: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 h-4 w-4"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Show variant in product title</span>
                                        </label>
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

                                    <div className="col-span-2 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                                        <label className="block text-sm font-bold text-[#10275c] uppercase tracking-wider">Frontend Layout</label>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Keep the normal product page for most items, or switch selected combination products to a tabbed selection table.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-4">
                                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                                <input
                                                    type="radio"
                                                    name="frontend_variant_layout"
                                                    checked={currentProduct.frontend_variant_layout !== "selection_table"}
                                                    onChange={() => setCurrentProduct({ ...currentProduct, frontend_variant_layout: "default" })}
                                                    className="h-4 w-4 border-gray-300 text-[#eb5c10] focus:ring-[#eb5c10]"
                                                />
                                                <span>Default product page</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                                <input
                                                    type="radio"
                                                    name="frontend_variant_layout"
                                                    checked={currentProduct.frontend_variant_layout === "selection_table"}
                                                    onChange={() => setCurrentProduct({
                                                        ...currentProduct,
                                                        frontend_variant_layout: "selection_table",
                                                        selection_table_config: normalizeSelectionTableConfig(currentProduct.selection_table_config, combinationOptionNames, currentProduct.variants || [], selectionTableSourceKeys),
                                                    })}
                                                    className="h-4 w-4 border-gray-300 text-[#eb5c10] focus:ring-[#eb5c10]"
                                                />
                                                <span>Selection table</span>
                                            </label>
                                        </div>

                                        {currentProduct.frontend_variant_layout === "selection_table" && (
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                    Selection table works with combination pricing. One variant attribute becomes the tab group, and each row stays an exact sellable combination.
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700">Intro Text</label>
                                                    <textarea
                                                        rows={3}
                                                        value={selectionTableConfig.intro_text}
                                                        onChange={(event) => updateSelectionTableConfig({ intro_text: event.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                        placeholder="Optional text shown above the table."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Tab Group Source</label>
                                                    <select
                                                        value={selectionTableConfig.tab_option}
                                                        onChange={(event) => updateSelectionTableConfig({
                                                            tab_option: event.target.value,
                                                            default_tab: "",
                                                        })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                                    >
                                                        <option value="">Choose row group</option>
                                                        {selectionTableTabSources.map((source) => (
                                                            <option key={source.key} value={source.key}>{source.label}</option>
                                                        ))}
                                                    </select>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Use an option when the tabs are part of the sellable combination. Use a custom column when the tabs are category labels like Stainless Steel 430 or 304.
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Default Tab</label>
                                                    <select
                                                        value={selectionTableConfig.default_tab}
                                                        onChange={(event) => updateSelectionTableConfig({ default_tab: event.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                                    >
                                                        <option value="">First available tab</option>
                                                        {selectionTableTabValues.map((tabValue) => (
                                                            <option key={tabValue} value={tabValue}>{tabValue}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700">Quote-Only Tabs</label>
                                                    <input
                                                        type="text"
                                                        value={selectionTableConfig.quote_tab_values.join(", ")}
                                                        onChange={(event) => {
                                                            const quoteTabValues = event.target.value
                                                                .split(",")
                                                                .map((value) => value.trim())
                                                                .filter(Boolean);

                                                            updateSelectionTableConfig({
                                                                quote_tab_values: quoteTabValues,
                                                                tabs: selectionTableConfig.tabs.map((tab) => (
                                                                    quoteTabValues.includes(tab.value)
                                                                        ? { ...tab, mode: "quote" }
                                                                        : tab.mode === "quote"
                                                                            ? { ...tab, mode: "table" }
                                                                            : tab
                                                                )),
                                                            });
                                                        }}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                        placeholder="Non-Standard, Bespoke"
                                                    />
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Tabs listed here show the quote form instead of add-to-cart rows. They can exist even without matching variant rows.
                                                    </p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700">Quote Panel Text</label>
                                                    <textarea
                                                        rows={3}
                                                        value={selectionTableConfig.quote_intro_text}
                                                        onChange={(event) => updateSelectionTableConfig({ quote_intro_text: event.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                        placeholder="Optional instructions shown above the inline quote form."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Quote Button Label</label>
                                                    <input
                                                        type="text"
                                                        value={selectionTableConfig.quote_submit_label}
                                                        onChange={(event) => updateSelectionTableConfig({ quote_submit_label: event.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                        placeholder="Request quote"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Quote Form Layout</label>
                                                    <select
                                                        value={selectionTableConfig.quote_form_layout}
                                                        onChange={(event) => updateSelectionTableConfig({ quote_form_layout: event.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                                    >
                                                        <option value="default">Default</option>
                                                        <option value="baffle_non_standard">Baffle non-standard</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2 rounded-md border border-gray-200 bg-white p-4">
                                                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Tab Settings</label>
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                Use this when different tabs need different behaviour, like add-to-cart, call-only, or quote form.
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={newSelectionTableTabValue}
                                                                onChange={(event) => setNewSelectionTableTabValue(event.target.value)}
                                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                                placeholder="Add manual tab"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={addSelectionTableTab}
                                                                className="rounded-md bg-[#10275c] px-3 py-2 text-sm font-medium text-white hover:bg-[#0b1d47]"
                                                            >
                                                                Add Tab
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 space-y-3">
                                                        {selectionTableConfig.tabs.length === 0 ? (
                                                            <p className="text-xs text-gray-500">Tabs will appear after you choose a tab source or add a manual tab.</p>
                                                        ) : selectionTableConfig.tabs.map((tab) => {
                                                            const isDataTab = selectionTableDataTabValues.includes(tab.value);
                                                            const canRemove = !isDataTab;

                                                            return (
                                                                <div key={tab.value} className="rounded-md border border-gray-200 p-3">
                                                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.2fr)_180px_minmax(0,1fr)_auto] md:items-end">
                                                                        <div>
                                                                            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">Tab Label</label>
                                                                            <input
                                                                                type="text"
                                                                                value={tab.value}
                                                                                onChange={(event) => updateSelectionTableTab(tab.value, { value: event.target.value })}
                                                                                disabled={isDataTab}
                                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:bg-gray-100 disabled:text-gray-500"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">Mode</label>
                                                                            <select
                                                                                value={tab.mode}
                                                                                onChange={(event) => updateSelectionTableTab(tab.value, { mode: event.target.value })}
                                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                                                            >
                                                                                <option value="table">Add to cart</option>
                                                                                <option value="call">Call only</option>
                                                                                <option value="quote">Quote form</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">Heading</label>
                                                                            <input
                                                                                type="text"
                                                                                value={tab.heading}
                                                                                onChange={(event) => updateSelectionTableTab(tab.value, { heading: event.target.value })}
                                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                                                placeholder="Optional green header title"
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-end">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeSelectionTableTab(tab.value)}
                                                                                disabled={!canRemove}
                                                                                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-3">
                                                                        <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">Tab Intro Text</label>
                                                                        <textarea
                                                                            rows={2}
                                                                            value={tab.intro_text}
                                                                            onChange={(event) => updateSelectionTableTab(tab.value, { intro_text: event.target.value })}
                                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                                            placeholder="Optional tab-specific text shown above the call or quote panel."
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2 border-t pt-6 bg-gray-50/50 py-6 px-1 rounded-lg">
                                        <label className="block text-sm font-bold text-[#10275c] mb-4 uppercase tracking-wider px-4">PRODUCT VARIANTS</label>

                                        <div className="px-4">
                                            <div className="flex flex-wrap gap-4">
                                                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                                    <input
                                                        type="radio"
                                                        name="variant_mode"
                                                        checked={currentProduct.variant_mode !== "combination"}
                                                        onChange={() => setProductVariantMode("legacy")}
                                                        className="h-4 w-4 border-gray-300 text-[#eb5c10] focus:ring-[#eb5c10]"
                                                    />
                                                    <span>Legacy variants</span>
                                                </label>
                                                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                                    <input
                                                        type="radio"
                                                        name="variant_mode"
                                                        checked={currentProduct.variant_mode === "combination"}
                                                        onChange={() => setProductVariantMode("combination")}
                                                        className="h-4 w-4 border-gray-300 text-[#eb5c10] focus:ring-[#eb5c10]"
                                                    />
                                                    <span>Combination pricing</span>
                                                </label>
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500">
                                                Use combination pricing when one exact mix like Height + Feature needs its own price and stock.
                                            </p>
                                        </div>

                                        {currentProduct.variant_mode === "combination" ? (
                                            <div className="mt-6 space-y-4 px-4">
                                                <div className="rounded-md border border-gray-200 bg-white p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Variant Attributes</p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Add the fields that make one row a different sellable combination, such as Material, Height, Feature, or Type.
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {combinationOptionNames.map((optionName) => (
                                                            <span key={optionName} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                                                                {optionName}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeCombinationOption(optionName)}
                                                                    className="text-red-400 hover:text-red-600"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="mt-3 flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newCombinationOptionName}
                                                            onChange={(e) => setNewCombinationOptionName(e.target.value)}
                                                            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                            placeholder="e.g. Material"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={addCombinationOption}
                                                            className="rounded-md bg-[#eb5c10] px-3 py-2 text-sm font-semibold text-white hover:bg-[#d4500b]"
                                                        >
                                                            Add Attribute
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 px-1">
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Extra Table Columns</p>
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            Add display-only row data like Part Number, Airflow, or P.D. for the optional selection table layout.
                                                        </p>
                                                    </div>
                                                    <VariantColumnManager
                                                        title="Extra Table Columns"
                                                        description="These display-only text columns are stored on each combination row and can be shown on the frontend selection table."
                                                        columns={variantTableColumns.combination}
                                                        onLabelChange={(key, label) => updateVariantTableColumn("combination", key, { label })}
                                                        onVisibilityChange={(key, visible) => updateVariantTableColumn("combination", key, { visible })}
                                                        onFrontendVisibilityChange={(key, frontendVisible) => updateVariantTableColumn("combination", key, { frontendVisible })}
                                                        onAddColumn={(label) => addVariantTableColumn("combination", label)}
                                                    />
                                                </div>

                                                <div className="border border-gray-200 rounded-md overflow-x-auto shadow-sm bg-white">
                                                    <table className="w-max divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                {combinationOptionNames.map((optionName) => (
                                                                    <th key={optionName} className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">
                                                                        {optionName}
                                                                    </th>
                                                                ))}
                                                                {visibleCombinationCustomColumns.map((column) => (
                                                                    <th key={column.key} className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">
                                                                        {column.label}
                                                                    </th>
                                                                ))}
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">Price</th>
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">Stock</th>
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">Weight (kg)</th>
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">Length (cm)</th>
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">Width (cm)</th>
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">Height (cm)</th>
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">Shipping Class</th>
                                                                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-500">Ships Separately</th>
                                                                <th className="px-2 py-2 text-right"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 bg-white">
                                                            {combinationVariantEntries.map(({ variant, index }) => (
                                                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                                    {combinationOptionNames.map((optionName) => (
                                                                        <td key={optionName} className="px-2 py-2">
                                                                            <input
                                                                                type="text"
                                                                                value={variant.attributes?.[optionName] ?? ""}
                                                                                onChange={(event) => updateCombinationVariantAttribute(index, optionName, event.target.value)}
                                                                                className="w-28 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                                placeholder={optionName}
                                                                            />
                                                                        </td>
                                                                    ))}
                                                                    {visibleCombinationCustomColumns.map((column) => (
                                                                        <td key={column.key} className="px-2 py-2">
                                                                            {renderCombinationCustomFieldCell(variant, index, column.key)}
                                                                        </td>
                                                                    ))}
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="text"
                                                                            value={variant.price ?? ""}
                                                                            onChange={(event) => updateCombinationVariantField(index, "price", event.target.value)}
                                                                            className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder={currentProduct.price || "£0.00"}
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={variant.stock ?? ""}
                                                                            onChange={(event) => updateCombinationVariantField(index, "stock", normalizeVariantStock(event.target.value))}
                                                                            className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={0.01}
                                                                            step="0.001"
                                                                            value={variant.shipping_weight_kg ?? ""}
                                                                            onChange={(event) => updateCombinationVariantField(index, "shipping_weight_kg", normalizeShippingNumber(event.target.value))}
                                                                            className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder="base"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            step="0.01"
                                                                            value={variant.shipping_length_cm ?? ""}
                                                                            onChange={(event) => updateCombinationVariantField(index, "shipping_length_cm", normalizeShippingNumber(event.target.value))}
                                                                            className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder="base"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            step="0.01"
                                                                            value={variant.shipping_width_cm ?? ""}
                                                                            onChange={(event) => updateCombinationVariantField(index, "shipping_width_cm", normalizeShippingNumber(event.target.value))}
                                                                            className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder="base"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            step="0.01"
                                                                            value={variant.shipping_height_cm ?? ""}
                                                                            onChange={(event) => updateCombinationVariantField(index, "shipping_height_cm", normalizeShippingNumber(event.target.value))}
                                                                            className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder="base"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <select
                                                                            value={variant.shipping_class ?? ""}
                                                                            onChange={(event) => updateCombinationVariantField(index, "shipping_class", event.target.value)}
                                                                            className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        >
                                                                            <option value="">Use base</option>
                                                                            {SHIPPING_CLASS_OPTIONS.map((option) => (
                                                                                <option key={option.value} value={option.value}>{option.label}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <label className="flex items-center gap-2 text-xs text-gray-600">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Boolean(variant.ships_separately)}
                                                                                onChange={(event) => updateCombinationVariantField(index, "ships_separately", event.target.checked)}
                                                                                className="rounded border-gray-300 text-[#eb5c10] focus:ring-[#eb5c10]"
                                                                            />
                                                                            <span>Yes</span>
                                                                        </label>
                                                                    </td>
                                                                    <td className="px-2 py-2 text-right">
                                                                        <button type="button" onClick={() => removeVariantAtIndex(index)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                                            <tr>
                                                                {combinationOptionNames.map((optionName) => (
                                                                    <td key={optionName} className="px-2 py-2">
                                                                        <input
                                                                            type="text"
                                                                            value={newCombinationVariant.attributes?.[optionName] ?? ""}
                                                                            onChange={(event) => setNewCombinationVariant((prev) => ({
                                                                                ...prev,
                                                                                attributes: {
                                                                                    ...normalizeCombinationAttributes(prev.attributes, combinationOptionNames),
                                                                                    [optionName]: event.target.value,
                                                                                },
                                                                            }))}
                                                                            className="w-28 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                            placeholder={optionName}
                                                                        />
                                                                    </td>
                                                                ))}
                                                                {visibleCombinationCustomColumns.map((column) => (
                                                                    <td key={column.key} className="px-2 py-2">
                                                                        {renderNewCombinationCustomFieldCell(column.key)}
                                                                    </td>
                                                                ))}
                                                                <td className="px-2 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={newCombinationVariant.price}
                                                                        onChange={(event) => setNewCombinationVariant((prev) => ({ ...prev, price: event.target.value }))}
                                                                        className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        placeholder={currentProduct.price || "£0.00"}
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input
                                                                        type="number"
                                                                        value={newCombinationVariant.stock}
                                                                        onChange={(event) => setNewCombinationVariant((prev) => ({ ...prev, stock: event.target.value }))}
                                                                        className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        placeholder="10"
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input
                                                                        type="number"
                                                                        min={0.01}
                                                                        step="0.001"
                                                                        value={newCombinationVariant.shipping_weight_kg}
                                                                        onChange={(event) => setNewCombinationVariant((prev) => ({ ...prev, shipping_weight_kg: event.target.value }))}
                                                                        className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        placeholder="base"
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        step="0.01"
                                                                        value={newCombinationVariant.shipping_length_cm}
                                                                        onChange={(event) => setNewCombinationVariant((prev) => ({ ...prev, shipping_length_cm: event.target.value }))}
                                                                        className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        placeholder="base"
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        step="0.01"
                                                                        value={newCombinationVariant.shipping_width_cm}
                                                                        onChange={(event) => setNewCombinationVariant((prev) => ({ ...prev, shipping_width_cm: event.target.value }))}
                                                                        className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        placeholder="base"
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        step="0.01"
                                                                        value={newCombinationVariant.shipping_height_cm}
                                                                        onChange={(event) => setNewCombinationVariant((prev) => ({ ...prev, shipping_height_cm: event.target.value }))}
                                                                        className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                        placeholder="base"
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <select
                                                                        value={newCombinationVariant.shipping_class}
                                                                        onChange={(event) => setNewCombinationVariant((prev) => ({ ...prev, shipping_class: event.target.value }))}
                                                                        className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-[#eb5c10] focus:outline-none"
                                                                    >
                                                                        <option value="">Use base</option>
                                                                        {SHIPPING_CLASS_OPTIONS.map((option) => (
                                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="px-2 py-2">
                                                                    <label className="flex items-center gap-2 text-xs text-gray-600">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={newCombinationVariant.ships_separately}
                                                                            onChange={(event) => setNewCombinationVariant((prev) => ({ ...prev, ships_separately: event.target.checked }))}
                                                                            className="rounded border-gray-300 text-[#eb5c10] focus:ring-[#eb5c10]"
                                                                        />
                                                                        <span>Yes</span>
                                                                    </label>
                                                                </td>
                                                                <td className="px-2 py-2 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={appendNewCombinationVariant}
                                                                        className="bg-[#eb5c10] text-white py-1.5 px-3 rounded text-xs font-bold hover:bg-[#d4500b] transition-colors shadow-sm whitespace-nowrap"
                                                                    >
                                                                        Add
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-2 flex items-center justify-between gap-3 px-4">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Size</p>
                                                    <VariantColumnManager
                                                        title="Size Table Columns"
                                                        description="Rename headers, remove columns from the admin table, and choose what appears on the product page."
                                                        columns={variantTableColumns.size}
                                                        onLabelChange={(key, label) => updateVariantTableColumn("size", key, { label })}
                                                        onVisibilityChange={(key, visible) => updateVariantTableColumn("size", key, { visible })}
                                                        onFrontendVisibilityChange={(key, frontendVisible) => updateVariantTableColumn("size", key, { frontendVisible })}
                                                        onAddColumn={(label) => addVariantTableColumn("size", label)}
                                                    />
                                                </div>
                                                <div className="space-y-4 mb-6">
                                                    <div className="border border-gray-200 rounded-md overflow-x-auto shadow-sm bg-white">
                                                        <table className="w-max divide-y divide-gray-200">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    {visibleSizeColumns.map((column) => (
                                                                        <th key={column.key} className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">
                                                                            {column.label}
                                                                        </th>
                                                                    ))}
                                                                    <th className="px-2 py-2 text-right"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {sizeVariantEntries.map(({ variant, index }) => (
                                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                                        {visibleSizeColumns.map((column) => (
                                                                            <td key={column.key} className="px-2 py-2">
                                                                                {renderSizeVariantCell(column.key, variant, index)}
                                                                            </td>
                                                                        ))}
                                                                        <td className="px-2 py-2 text-right">
                                                                            <button type="button" onClick={() => removeVariantAtIndex(index)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                                                <tr>
                                                                    {visibleSizeColumns.map((column) => (
                                                                        <td key={column.key} className="px-2 py-2">
                                                                            {renderNewSizeVariantCell(column.key)}
                                                                        </td>
                                                                    ))}
                                                                    <td className="px-2 py-2 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={appendNewSizeVariant}
                                                                            className="bg-[#eb5c10] text-white py-1.5 px-3 rounded text-xs font-bold hover:bg-[#d4500b] transition-colors shadow-sm whitespace-nowrap"
                                                                        >Add</button>
                                                                    </td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </div>

                                                <div className="mb-2 flex items-center justify-between gap-3 px-4">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Other Variants <span className="normal-case font-normal text-gray-400">(Color, Material, etc.)</span></p>
                                                    <VariantColumnManager
                                                        title="Other Variant Columns"
                                                        description="Rename headers, remove columns from the admin table, and choose what appears on the product page."
                                                        columns={variantTableColumns.general}
                                                        onLabelChange={(key, label) => updateVariantTableColumn("general", key, { label })}
                                                        onVisibilityChange={(key, visible) => updateVariantTableColumn("general", key, { visible })}
                                                        onFrontendVisibilityChange={(key, frontendVisible) => updateVariantTableColumn("general", key, { frontendVisible })}
                                                        onAddColumn={(label) => addVariantTableColumn("general", label)}
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="border border-gray-200 rounded-md overflow-x-auto shadow-sm bg-white">
                                                        <table className="w-max divide-y divide-gray-200">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    {visibleGeneralColumns.map((column) => (
                                                                        <th key={column.key} className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">
                                                                            {column.label}
                                                                        </th>
                                                                    ))}
                                                                    <th className="px-2 py-2 text-right"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {otherVariantEntries.map(({ variant, index }) => (
                                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                                        {visibleGeneralColumns.map((column) => (
                                                                            <td key={column.key} className="px-2 py-2">
                                                                                {renderOtherVariantCell(column.key, variant, index)}
                                                                            </td>
                                                                        ))}
                                                                        <td className="px-2 py-2 text-right">
                                                                            <button type="button" onClick={() => removeVariantAtIndex(index)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                                                <tr>
                                                                    {visibleGeneralColumns.map((column) => (
                                                                        <td key={column.key} className="px-2 py-2">
                                                                            {renderNewOtherVariantCell(column.key)}
                                                                        </td>
                                                                    ))}
                                                                    <td className="px-2 py-2 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={appendNewOtherVariant}
                                                                            className="bg-[#eb5c10] text-white py-1.5 px-3 rounded text-xs font-bold hover:bg-[#d4500b] transition-colors shadow-sm whitespace-nowrap"
                                                                        >Add</button>
                                                                    </td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </div>
                                            </>
                                        )}
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
