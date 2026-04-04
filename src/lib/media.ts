export const normalizeMediaUrl = (value: unknown, fallback = "/logo.png") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/uploads/")) return `/storage${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `/storage/${trimmed}`;
  if (trimmed.startsWith("/storage/") || trimmed.startsWith("/images/") || trimmed.startsWith("/logo")) return trimmed;
  if (trimmed.startsWith("storage/")) return `/${trimmed}`;
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
};
