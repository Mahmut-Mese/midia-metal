import { useEffect } from "react";
import { absoluteUrl, buildSeoTitle, DEFAULT_SITE_NAME } from "@/lib/seo";

type SeoProps = {
  title: string;
  description: string;
  image?: string;
  canonicalPath?: string;
  canonicalUrl?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  siteName?: string;
  twitterSite?: string;
  structuredData?: object | object[];
};

const ensureMeta = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attrs).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
};

const ensureLink = (rel: string, href: string) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
};

export default function Seo({
  title,
  description,
  image,
  canonicalPath,
  canonicalUrl,
  type = "website",
  noindex = false,
  siteName = DEFAULT_SITE_NAME,
  twitterSite = "@midiametal",
  structuredData = [],
}: SeoProps) {
  useEffect(() => {
    const nextTitle = buildSeoTitle(title, siteName);
    const nextDescription = description.trim();
    const nextCanonicalUrl = canonicalUrl || absoluteUrl(canonicalPath || (typeof window !== "undefined" ? window.location.pathname : "/"));
    const nextImage = image ? absoluteUrl(image) : undefined;

    document.title = nextTitle;

    ensureMeta('meta[name="description"]', { name: "description", content: nextDescription });
    ensureMeta('meta[property="og:title"]', { property: "og:title", content: nextTitle });
    ensureMeta('meta[property="og:description"]', { property: "og:description", content: nextDescription });
    ensureMeta('meta[property="og:type"]', { property: "og:type", content: type });
    ensureMeta('meta[property="og:url"]', { property: "og:url", content: nextCanonicalUrl });
    ensureMeta('meta[property="og:site_name"]', { property: "og:site_name", content: siteName });
    ensureMeta('meta[name="twitter:card"]', { name: "twitter:card", content: nextImage ? "summary_large_image" : "summary" });
    ensureMeta('meta[name="twitter:site"]', { name: "twitter:site", content: twitterSite });
    ensureMeta('meta[name="twitter:title"]', { name: "twitter:title", content: nextTitle });
    ensureMeta('meta[name="twitter:description"]', { name: "twitter:description", content: nextDescription });
    ensureMeta('meta[name="robots"]', { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow" });

    if (nextImage) {
      ensureMeta('meta[property="og:image"]', { property: "og:image", content: nextImage });
      ensureMeta('meta[name="twitter:image"]', { name: "twitter:image", content: nextImage });
    }

    ensureLink("canonical", nextCanonicalUrl);

    const existingJsonLd = Array.from(document.head.querySelectorAll('script[data-seo-jsonld="true"]'));
    existingJsonLd.forEach((script) => script.remove());

    const payloads = Array.isArray(structuredData) ? structuredData : [structuredData];
    payloads
      .filter(Boolean)
      .forEach((payload) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.seoJsonld = "true";
        script.text = JSON.stringify(payload);
        document.head.appendChild(script);
      });
  }, [canonicalPath, canonicalUrl, description, image, noindex, siteName, structuredData, title, twitterSite, type]);

  return null;
}
