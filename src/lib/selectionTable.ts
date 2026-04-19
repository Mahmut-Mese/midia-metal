import { getVariantAttributes, normalizeVariantOptionName, type VariantRecord } from "@/lib/variants";

export type FrontendVariantLayout = "default" | "selection_table";
export type SelectionTableTabMode = "table" | "call" | "quote";
export type SelectionTableQuoteFormLayout = "default" | "baffle_non_standard";

export type SelectionTableTabConfig = {
  value: string;
  mode: SelectionTableTabMode;
  heading: string;
  intro_text: string;
};

export type SelectionTableConfig = {
  intro_text: string;
  tab_option: string;
  default_tab: string;
  quote_tab_values: string[];
  quote_intro_text: string;
  quote_submit_label: string;
  quote_form_layout: SelectionTableQuoteFormLayout;
  tabs: SelectionTableTabConfig[];
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const uniqueStrings = (values: string[]): string[] => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
};

const resolveCanonicalValue = (candidates: string[], value: unknown): string => {
  const normalizedValue = normalizeText(value).toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  return candidates.find((candidate) => normalizeText(candidate).toLowerCase() === normalizedValue) ?? "";
};

export const normalizeFrontendVariantLayout = (value: unknown): FrontendVariantLayout =>
  normalizeText(value).toLowerCase() === "selection_table" ? "selection_table" : "default";

const normalizeSelectionTableTabMode = (value: unknown): SelectionTableTabMode => {
  const normalizedValue = normalizeText(value).toLowerCase();
  if (normalizedValue === "call") {
    return "call";
  }

  if (normalizedValue === "quote") {
    return "quote";
  }

  return "table";
};

const normalizeSelectionTableQuoteFormLayout = (value: unknown): SelectionTableQuoteFormLayout =>
  normalizeText(value).toLowerCase() === "baffle_non_standard" ? "baffle_non_standard" : "default";

export const isSelectionTableCustomKey = (key: string): boolean => normalizeText(key).startsWith("custom:");

export const getSelectionTableVariantValue = (
  variant: VariantRecord | null | undefined,
  key: string,
): string => {
  const normalizedKey = normalizeText(key);
  if (!normalizedKey) {
    return "";
  }

  if (isSelectionTableCustomKey(normalizedKey)) {
    const customKey = normalizedKey.slice("custom:".length);
    return normalizeText(variant?.custom_fields?.[customKey]);
  }

  return getVariantAttributes(variant)[normalizeVariantOptionName(normalizedKey)] ?? "";
};

export const getSelectionTableSourceValues = (
  variants: VariantRecord[] | null | undefined,
  sourceKey: string,
): string[] => uniqueStrings(
  (Array.isArray(variants) ? variants : [])
    .map((variant) => getSelectionTableVariantValue(variant, sourceKey))
    .filter(Boolean),
);

export const normalizeSelectionTableConfig = (
  value: unknown,
  optionNames: string[] = [],
  variants: VariantRecord[] | null | undefined = [],
  sourceKeys: string[] = [],
): SelectionTableConfig => {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  const safeOptionNames = uniqueStrings(optionNames.map((optionName) => normalizeVariantOptionName(optionName)));
  const safeSourceKeys = uniqueStrings([
    ...safeOptionNames,
    ...sourceKeys.map((entry) => normalizeText(entry)).filter(Boolean),
  ]);
  const requestedTabKey = normalizeText(source.tab_option);
  const tabOption = resolveCanonicalValue(safeSourceKeys, requestedTabKey)
    || (requestedTabKey && isSelectionTableCustomKey(requestedTabKey) ? requestedTabKey : "");
  const variantTabValues = tabOption ? getSelectionTableSourceValues(variants, tabOption) : [];
  const rawQuoteTabValues = Array.isArray(source.quote_tab_values)
    ? source.quote_tab_values
    : typeof source.quote_tab_values === "string"
      ? String(source.quote_tab_values).split(",")
      : [];
  const quoteTabValues = uniqueStrings(
    rawQuoteTabValues
      .map((tabValue) => resolveCanonicalValue([...variantTabValues, ...rawQuoteTabValues.map((entry) => normalizeText(entry))], tabValue) || normalizeText(tabValue))
      .filter(Boolean),
  );
  const rawTabs = Array.isArray(source.tabs)
    ? source.tabs
    : [];
  const tabCandidates = uniqueStrings([
    ...variantTabValues,
    ...rawTabs.map((entry) => normalizeText((entry as Record<string, unknown>)?.value)),
  ]);
  const normalizedTabs = rawTabs
    .map((entry) => {
      const tabSource = entry && typeof entry === "object" && !Array.isArray(entry)
        ? entry as Record<string, unknown>
        : {};
      const normalizedValue = resolveCanonicalValue(tabCandidates, tabSource.value) || normalizeText(tabSource.value);

      if (!normalizedValue) {
        return null;
      }

      return {
        value: normalizedValue,
        mode: normalizeSelectionTableTabMode(tabSource.mode || (quoteTabValues.includes(normalizedValue) ? "quote" : "table")),
        heading: normalizeText(tabSource.heading),
        intro_text: normalizeText(tabSource.intro_text),
      } satisfies SelectionTableTabConfig;
    })
    .filter((entry): entry is SelectionTableTabConfig => Boolean(entry));
  const availableTabs = uniqueStrings([
    ...normalizedTabs.map((entry) => entry.value),
    ...variantTabValues,
  ]);
  const tabs = uniqueStrings([
    ...normalizedTabs.map((entry) => entry.value),
    ...availableTabs,
  ]).map((tabValue): SelectionTableTabConfig => normalizedTabs.find((entry) => entry.value.toLowerCase() === tabValue.toLowerCase()) || ({
    value: tabValue,
    mode: quoteTabValues.some((entry) => entry.toLowerCase() === tabValue.toLowerCase()) ? "quote" as const : "table" as const,
    heading: "",
    intro_text: "",
  }));
  const normalizedQuoteTabValues = uniqueStrings([
    ...quoteTabValues,
    ...tabs
      .filter((entry) => entry.mode === "quote")
      .map((entry) => entry.value),
  ]);

  return {
    intro_text: normalizeText(source.intro_text),
    tab_option: tabOption,
    default_tab: resolveCanonicalValue(availableTabs, source.default_tab),
    quote_tab_values: normalizedQuoteTabValues,
    quote_intro_text: normalizeText(source.quote_intro_text),
    quote_submit_label: normalizeText(source.quote_submit_label),
    quote_form_layout: normalizeSelectionTableQuoteFormLayout(source.quote_form_layout),
    tabs,
  };
};

export const getSelectionTableTabValues = (
  config: Pick<SelectionTableConfig, "tab_option" | "quote_tab_values" | "tabs">,
  variants: VariantRecord[] | null | undefined,
): string[] => {
  if (!config.tab_option) {
    return [];
  }

  return uniqueStrings([
    ...(Array.isArray(config.tabs) ? config.tabs.map((tab) => normalizeText(tab?.value)) : []),
    ...getSelectionTableSourceValues(variants, config.tab_option),
  ]);
};

export const getSelectionTableTabConfig = (
  config: Pick<SelectionTableConfig, "tabs" | "quote_tab_values">,
  tabValue: string,
): SelectionTableTabConfig => {
  const normalizedValue = normalizeText(tabValue);
  const directMatch = Array.isArray(config.tabs)
    ? config.tabs.find((entry) => entry.value.toLowerCase() === normalizedValue.toLowerCase())
    : null;

  if (directMatch) {
    return directMatch;
  }

  return {
    value: normalizedValue,
    mode: (Array.isArray(config.quote_tab_values) && config.quote_tab_values.some((entry) => entry.toLowerCase() === normalizedValue.toLowerCase()))
      ? "quote"
      : "table",
    heading: "",
    intro_text: "",
  };
};
