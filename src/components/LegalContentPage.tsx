import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiFetch } from "@/lib/api";
import Seo from "@/components/Seo";
import { absoluteUrl, buildBreadcrumbJsonLd, stripHtml, truncateText } from "@/lib/seo";

type LegalContentPageProps = {
  titleKey: string;
  contentKey: string;
  fallbackTitle: string;
  fallbackContent: string;
  path: string;
};

const proseClassName = "bg-white border border-[#cad4e4] p-8 md:p-12 prose prose-slate max-w-none prose-headings:text-[#10275c] prose-a:text-orange prose-a:no-underline hover:prose-a:underline";

export default function LegalContentPage({
  titleKey,
  contentKey,
  fallbackTitle,
  fallbackContent,
  path,
}: LegalContentPageProps) {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch("/v1/settings");
        const nextSettings: Record<string, string> = {};
        res.forEach((item: any) => {
          nextSettings[item.key] = item.value;
        });
        setSettings(nextSettings);
      } catch (error) {
        console.error("Failed to load legal page settings", error);
      }
    };

    loadSettings();
  }, []);

  const title = settings[titleKey] || fallbackTitle;
  const content = settings[contentKey] || fallbackContent;

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Seo
        title={title}
        description={truncateText(stripHtml(content))}
        canonicalPath={path}
        structuredData={buildBreadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: title, url: absoluteUrl(path) },
        ])}
      />
      <Header />
      <section className="container mx-auto px-4 lg:px-8 pt-16 md:pt-24 pb-20 md:pb-28 max-w-3xl">
        <div className={proseClassName}>
          <h1 className="font-sans text-[32px] md:text-[42px] leading-tight font-semibold text-orange mb-8">
            {title}
          </h1>
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </section>
      <Footer />
    </div>
  );
}
