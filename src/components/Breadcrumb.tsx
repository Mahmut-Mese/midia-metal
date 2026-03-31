import { ChevronRight, Home } from "lucide-react";

type BreadcrumbItem = {
  name: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * Visible breadcrumb navigation component.
 * Renders semantic <nav> + <ol> markup for SEO and accessibility.
 * Mirrors the BreadcrumbList JSON-LD injected server-side.
 */
const Breadcrumb = ({ items, className = "" }: BreadcrumbProps) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`w-full ${className}`}
    >
      <ol
        className="flex flex-wrap items-center gap-1 text-[12px] text-[#7f8ca5]"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        <li
          className="flex items-center gap-1"
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
        >
          <a
            href="/"
            className="flex items-center gap-1 hover:text-orange transition-colors"
            itemProp="item"
          >
            <Home className="w-3 h-3" />
            <span itemProp="name">Home</span>
          </a>
          <meta itemProp="position" content="1" />
        </li>

        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-center gap-1"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <ChevronRight className="w-3 h-3 text-[#b0bac9] flex-shrink-0" />
            {item.href ? (
              <a
                href={item.href}
                className="hover:text-orange transition-colors truncate max-w-[200px]"
                itemProp="item"
              >
                <span itemProp="name">{item.name}</span>
              </a>
            ) : (
              <span
                className="text-[#10275c] font-medium truncate max-w-[200px]"
                itemProp="name"
              >
                {item.name}
              </span>
            )}
            <meta itemProp="position" content={String(index + 2)} />
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
