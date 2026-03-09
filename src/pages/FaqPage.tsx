import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiFetch } from "@/lib/api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Seo from "@/components/Seo";
import { absoluteUrl, buildBreadcrumbJsonLd, stripHtml, truncateText } from "@/lib/seo";

const fallbackContent = `
<h2>Ordering</h2>
<p><strong>Do you sell both standard products and custom fabrication?</strong><br>Yes. We supply selected standard products through the shop and also handle custom stainless steel fabrication and ventilation work.</p>
<p><strong>How do I request a custom quote?</strong><br>Use the quote request form and include as much project detail as possible, including drawings, dimensions, and site requirements.</p>
<h2>Delivery</h2>
<p><strong>How long does delivery take?</strong><br>Lead times depend on whether the item is stock-based or made to order. Standard items are usually faster; custom work depends on project scope and scheduling.</p>
<p><strong>Do you deliver across the UK?</strong><br>Yes. Delivery coverage depends on product size, access requirements, and courier or transport arrangements.</p>
<h2>Returns</h2>
<p><strong>Can I return custom-fabricated items?</strong><br>Custom items are generally non-returnable unless faulty or not produced to the agreed specification.</p>
<p><strong>What should I do if my order arrives damaged?</strong><br>Contact us within 48 hours with photographs and your order reference so we can review and resolve the issue quickly.</p>
<h2>Support</h2>
<p><strong>Can I speak with someone before ordering?</strong><br>Yes. You can contact the team directly to discuss specifications, lead times, and the right solution for your site.</p>
`;

type FaqItem = {
  question: string;
  answerHtml: string;
};

type FaqSection = {
  title: string;
  introHtml: string[];
  items: FaqItem[];
};

const proseClassName = "prose prose-sm max-w-none text-[#6e7a92] prose-p:my-0 prose-strong:text-[#10275c] prose-a:text-orange prose-a:no-underline hover:prose-a:underline prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-ul:list-disc prose-ol:list-decimal";

function parseFaqContent(content: string): FaqSection[] {
  if (typeof window === "undefined") {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="faq-root">${content}</div>`, "text/html");
  const root = doc.getElementById("faq-root");

  if (!root) {
    return [];
  }

  const sections: FaqSection[] = [];
  let currentSection: FaqSection = { title: "", introHtml: [], items: [] };
  sections.push(currentSection);

  const children = Array.from(root.children);

  for (let index = 0; index < children.length; index += 1) {
    const element = children[index];
    const tagName = element.tagName.toLowerCase();

    if (tagName === "h2") {
      currentSection = {
        title: element.textContent?.trim() || "",
        introHtml: [],
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (tagName === "h3") {
      const answerParts: string[] = [];
      let nextIndex = index + 1;

      while (nextIndex < children.length) {
        const nextTag = children[nextIndex].tagName.toLowerCase();
        if (nextTag === "h2" || nextTag === "h3") {
          break;
        }
        answerParts.push(children[nextIndex].outerHTML);
        nextIndex += 1;
      }

      currentSection.items.push({
        question: element.textContent?.trim() || "Question",
        answerHtml: answerParts.join(""),
      });
      index = nextIndex - 1;
      continue;
    }

    if (tagName === "p") {
      const strong = element.querySelector("strong");
      if (strong && strong.textContent?.trim()) {
        const clone = element.cloneNode(true) as HTMLElement;
        const strongClone = clone.querySelector("strong");
        const question = strongClone?.textContent?.trim() || "Question";
        strongClone?.remove();

        const firstChild = clone.firstChild;
        if (firstChild?.nodeName === "BR") {
          firstChild.parentNode?.removeChild(firstChild);
        }

        const answerHtml = clone.innerHTML.trim();
        currentSection.items.push({
          question,
          answerHtml: answerHtml || "<p></p>",
        });
        continue;
      }
    }

    currentSection.introHtml.push(element.outerHTML);
  }

  return sections.filter((section) => section.title || section.items.length || section.introHtml.length);
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFaqs = async () => {
      try {
        const res = await apiFetch("/v1/faqs");
        setFaqs(res);
      } catch (error) {
        console.error("Failed to load FAQs", error);
      } finally {
        setLoading(false);
      }
    };

    loadFaqs();
  }, []);

  const title = "Frequently Asked Questions";

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Seo
        title={title}
        description="Frequently Asked Questions about Midia M Metal's products, services, delivery, and returns."
        canonicalPath="/faq"
        structuredData={buildBreadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: title, url: absoluteUrl("/faq") },
        ])}
      />
      <Header />
      <section className="container mx-auto px-4 lg:px-8 pt-16 md:pt-24 pb-20 md:pb-28 max-w-4xl">
        <div className="bg-white border border-[#cad4e4] p-8 md:p-12">
          <h1 className="font-sans text-[32px] md:text-[42px] leading-tight font-semibold text-orange mb-10">
            {title}
          </h1>

          <div className="space-y-10">
            {loading ? (
              <p className="text-center text-[#6e7a92]">Loading FAQs...</p>
            ) : faqs.length === 0 ? (
              <p className="text-center text-[#6e7a92]">No FAQs found.</p>
            ) : (
              <Accordion type="single" collapsible className="border border-[#cad4e4]">
                {faqs.map((item, itemIndex) => (
                  <AccordionItem
                    key={item.id || itemIndex}
                    value={`item-${itemIndex}`}
                    className="border-b border-[#cad4e4] last:border-b-0"
                  >
                    <AccordionTrigger className="px-5 md:px-6 py-5 text-left font-sans text-[16px] md:text-[18px] font-semibold text-[#10275c] hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-5 md:px-6 pb-5">
                      <div
                        className={proseClassName}
                        dangerouslySetInnerHTML={{ __html: item.answer }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
