export const DEFAULT_SITE_NAME = "Midia M Metal";

export function stripHtml(input: string = ""): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(input: string = "", maxLength: number = 160): string {
  const normalized = input.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function absoluteUrl(pathOrUrl: string = ""): string {
  if (!pathOrUrl) {
    return typeof window !== "undefined" ? window.location.href : "";
  }

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  if (typeof window === "undefined") {
    return pathOrUrl;
  }

  return new URL(pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`, window.location.origin).toString();
}

export function buildSeoTitle(title: string, siteName: string = DEFAULT_SITE_NAME): string {
  if (!title) {
    return siteName;
  }

  return title.includes(siteName) ? title : `${title} | ${siteName}`;
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildOrganizationJsonLd({
  name = DEFAULT_SITE_NAME,
  url,
  logo,
  email,
  telephone,
  sameAs = [],
}: {
  name?: string;
  url: string;
  logo?: string;
  email?: string;
  telephone?: string;
  sameAs?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    ...(logo ? { logo } : {}),
    ...(email ? { email } : {}),
    ...(telephone ? { telephone } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function priceToNumber(price: string | number | null | undefined): number | null {
  if (typeof price === "number") {
    return Number.isFinite(price) ? price : null;
  }

  if (typeof price !== "string") {
    return null;
  }

  const numeric = parseFloat(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}
