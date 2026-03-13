import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, CirclePercent, ShoppingBag, WalletMinimal, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiFetch } from "@/lib/api";
import Seo from "@/components/Seo";
import { absoluteUrl, buildOrganizationJsonLd, buildBreadcrumbJsonLd, stripHtml, truncateText } from "@/lib/seo";

const getFeatures = (t: (k: string, d: string) => string) => [
  { icon: Gift, title: t("home_reward_title", "Commercial-grade fabrication"), desc: t("home_reward_desc", "Built for demanding kitchen and ventilation environments.") },
  { icon: CirclePercent, title: t("home_discount_title", "Fast quote turnaround"), desc: t("home_discount_desc", "Clear commercial pricing and lead times for every enquiry.") },
  { icon: ShoppingBag, title: t("home_shipping_title", "UK-wide delivery"), desc: t("home_shipping_desc", "Reliable dispatch for stocked products and fabricated components.") },
  { icon: WalletMinimal, title: t("home_prices_title", "Installation support"), desc: t("home_prices_desc", "Supply, fabrication, installation, and aftercare in one workflow.") },
];

const Index = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [trendingItems, setTrendingItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [slidesRes, categoriesRes, trendingRes, settingsRes] = await Promise.all([
          apiFetch("/v1/hero-slides"),
          apiFetch("/v1/product-categories"),
          apiFetch("/v1/products/featured"),
          apiFetch("/v1/settings")
        ]);
        setHeroSlides(slidesRes);
        setCategories(categoriesRes.slice(0, 4)); // Get first 4 categories
        setTrendingItems(trendingRes);

        const settingsMap: Record<string, string> = {};
        settingsRes.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (error) {
        console.error("Failed to load homepage data", error);
      }
    };
    loadData();
  }, []);

  const t = (key: string, def: string) => settings[key] || def;
  const organizationJsonLd = buildOrganizationJsonLd({
    name: t("site_name", "Midia M Metal"),
    url: absoluteUrl("/"),
    logo: absoluteUrl(t("site_logo", "/logo.png")),
    email: t("contact_email", "info@midia-metal.com"),
    telephone: t("contact_phone", "+44 123 456 7890"),
    sameAs: [
      t("social_facebook", ""),
      t("social_twitter", ""),
      t("social_instagram", ""),
      t("social_dribbble", ""),
    ].filter((url) => /^https?:\/\//i.test(url)),
  });
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: t("site_name", "Midia M Metal"),
    url: absoluteUrl("/"),
    description: truncateText(stripHtml(t("meta_description", "Commercial kitchen ventilation and stainless steel fabrication specialists across the UK."))),
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
  ]);
  const weldingPrimaryImage = t("home_welding_image", t("home_gallery_1", "/images/welding.jpg"));
  const weldingSecondaryImage = t("home_welding_secondary_image", t("home_gallery_5", "/images/workshop.jpg"));
  const weldingServiceSlug = (t("home_welding_service_slug", "custom-fabrication") || "custom-fabrication").trim();
  const weldingServicePath = `/services/${encodeURIComponent(weldingServiceSlug || "custom-fabrication")}`;

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  useEffect(() => {
    if (heroSlides.length === 0) return;
    const intervalId = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [heroSlides.length]);

  return (
    <div className="min-h-screen bg-[#f2f3f5]">
      <Seo
        title={t("meta_title", "Midia M Metal - Commercial Kitchen Solutions")}
        description={truncateText(stripHtml(t("meta_description", "Specialist in commercial kitchen ventilation, stainless steel fabrication, and canopy installation across the UK.")))}
        image={heroSlides[0]?.image || t("site_logo", "/logo.png")}
        canonicalPath="/"
        structuredData={[organizationJsonLd, websiteJsonLd, breadcrumbJsonLd]}
      />
      <Header />

      {/* Hero Slider */}
      <section className="container mx-auto px-4 lg:px-8 pt-4 md:pt-6">
        <div className="relative h-[260px] md:h-[520px] overflow-hidden bg-gray-200">
          {heroSlides.map((slide, index) => (
            <img
              key={slide.id}
              src={slide.image}
              alt={slide.alt || "Hero slide"}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${index === currentSlide ? "opacity-100" : "opacity-0"
                }`}
            />
          ))}
          {heroSlides.length > 1 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-px">
              <button
                onClick={goToPrevSlide}
                aria-label="Previous slide"
                className="w-12 h-16 bg-primary flex items-center justify-center text-primary-foreground hover:bg-navy-light transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToNextSlide}
                aria-label="Next slide"
                className="w-12 h-16 bg-primary flex items-center justify-center text-primary-foreground hover:bg-navy-light transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features Bar */}
      <section className="bg-[#f2f3f5]">
        <div className="container mx-auto px-4 lg:px-8 py-7 md:py-10">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
            {getFeatures(t).map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <f.icon className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0 text-[#7a8293]" strokeWidth={1.75} />
                <div className="leading-tight">
                  <p className="font-sans text-[13px] md:text-[17px] font-semibold text-[#15264b]">{f.title}</p>
                  <p className="mt-1 text-[10px] md:text-xs text-[#8b93a4]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metal Welding */}
      <section className="container mx-auto px-4 lg:px-8 pb-8 md:pb-12">
        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4 md:gap-6">
          <div className="bg-primary p-6 md:p-10 flex flex-col justify-between min-h-[320px] md:min-h-[440px]">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase mb-3 md:mb-4">
                {t("home_welding_label", "Metal welding services")}
              </p>
              <h2 className="font-sans text-[34px] md:text-[50px] leading-[0.95] font-semibold text-white mb-5 md:mb-6">
                {t("home_welding_title", "Metal welding & bespoke fabrication")}
              </h2>
              <p className="text-sm md:text-[15px] leading-6 md:leading-7 text-white/80 max-w-xl">
                {t(
                  "home_welding_desc",
                  "Custom stainless steel builds, repair work, on-site modifications, and workshop welding for commercial kitchens, industrial spaces, and made-to-order metalwork."
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-8">
              <Link
                to="/get-a-quote"
                className="inline-flex items-center justify-center px-6 md:px-7 py-3 bg-orange text-white text-xs md:text-sm font-semibold hover:bg-orange-hover transition-colors"
              >
                {t("home_welding_primary_cta", "Request Welding Quote")}
              </Link>
              <Link
                to={weldingServicePath}
                className="inline-flex items-center justify-center px-6 md:px-7 py-3 border border-white/30 text-white text-xs md:text-sm font-semibold hover:bg-white hover:text-primary transition-colors"
              >
                {t("home_welding_secondary_cta", "View More")}
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden bg-[#e8edf1] min-h-[320px] md:min-h-[440px]">
            <img
              src={weldingPrimaryImage}
              alt={t("home_welding_image_alt", "Metal welding and fabrication work")}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#10275c]/18 via-[#10275c]/6 to-[#10275c]/35" />

            <div className="absolute left-4 right-4 bottom-4 md:left-6 md:right-auto md:bottom-6 flex items-end gap-3 md:gap-4">
              <div className="hidden md:block w-[188px] h-[144px] overflow-hidden border border-white/30 shadow-[0_12px_30px_rgba(16,39,92,0.16)]">
                <img
                  src={weldingSecondaryImage}
                  alt={t("home_welding_secondary_image_alt", "Workshop fabrication")}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="bg-[#f4f6f8] border border-[#d4dce6] px-4 md:px-5 py-4 md:py-5 max-w-[340px]">
                <p className="text-[10px] font-bold tracking-[0.18em] text-[#7b879a] uppercase mb-2">
                  {t("home_welding_card_label", "Workshop + site support")}
                </p>
                <p className="font-sans text-[18px] md:text-[22px] leading-[1.05] font-semibold text-primary mb-2">
                  {t("home_welding_card_title", "From fabrication bench to final install")}
                </p>
                <p className="text-[12px] md:text-[13px] leading-5 text-[#6f7e9a]">
                  {t("home_welding_card_desc", "Built for projects that need custom metalwork, fast adjustments, and practical welding support on the job.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 lg:px-8 pb-8 md:pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop/category/${cat.slug}`}
              className="relative block overflow-hidden group"
            >
              <img src={cat.image} alt={cat.name} className="w-full h-[124px] sm:h-[150px] md:h-[260px] object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent flex items-end p-3 md:p-5">
                <p className="text-white text-[13px] sm:text-[16px] md:text-[22px] leading-tight font-semibold">{cat.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Items */}
      <section className="container mx-auto px-4 lg:px-8 py-10 md:py-20">
        <p className="text-center text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">{t("home_catalog_label", "OUR CATALOG")}</p>
        <h2 className="text-center text-[44px] leading-none md:text-[38px] font-semibold text-[#10275c] mb-8 md:mb-12 font-sans">{t("home_trending_title", "Best-selling products")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {trendingItems.map((item) => (
            <Link to={`/shop/${item.slug}`} key={item.id} className="product-card">
              <div className="relative bg-[#e9ecef] overflow-hidden mb-3 md:mb-4">
                {item.badge && (
                  <span className="absolute top-2 left-2 z-10 bg-orange text-accent-foreground text-[11px] font-bold px-2 py-0.5">
                    {item.badge}
                  </span>
                )}
                <img src={item.image} alt={item.name} className="w-full aspect-square object-cover" />
              </div>
              <h3 className="font-sans text-[16px] md:text-[20px] leading-tight md:leading-7 font-semibold text-orange">{item.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.old_price && (
                  <span className="text-[16px] md:text-[20px] text-muted-foreground line-through">{item.old_price}</span>
                )}
                <span className="text-[14px] md:text-[20px] font-medium text-[#15264b]/75">{item.price}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8 md:mt-10">
          <Link to="/shop" className="inline-flex items-center justify-center px-8 md:px-10 py-3 md:py-4 bg-primary text-primary-foreground font-semibold text-xs md:text-sm hover:bg-navy-light transition-colors">
            {t("home_view_more_label", "View More Products")}
          </Link>
        </div>
      </section>

      {/* CTA Banners */}
      <section className="container mx-auto px-4 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden min-h-[200px] md:h-[240px] bg-gradient-to-r from-[#eb5c10] to-[#ff7d1b] p-6 md:p-10 flex flex-col justify-center">
            <h3 className="text-[42px] md:text-5xl leading-[0.95] font-semibold text-white mb-4 md:mb-5 font-sans">{t("home_installation_title", "Installation services")}</h3>
            <p className="text-white/85 text-xs md:text-sm mb-5 md:mb-7 max-w-md">{t("home_installation_desc", "Dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia.")}</p>
            <Link to="/get-a-quote" className="inline-flex items-center justify-center w-fit px-5 md:px-7 py-2.5 md:py-3 border border-white text-white text-xs md:text-sm font-semibold hover:bg-white hover:text-[#eb5c10] transition-all">
              {t("home_request_quote_label", "Request a Quote")}
            </Link>
          </div>
          <div className="relative overflow-hidden min-h-[200px] md:h-[240px] bg-[#e8edf1] flex items-center">
            <div className="flex-1 p-6 md:p-10 flex flex-col justify-center z-10">
            <h3 className="text-[48px] md:text-[35px] leading-[0.95] md:leading-[1.02] font-semibold text-[#10275c] mb-3 md:mb-4 font-sans">{t("home_comfort_title", "Built for commercial kitchens")}</h3>
            <p className="text-[#6f7e9a] text-xs md:text-sm mb-5 md:mb-7">{t("home_comfort_desc", "Stainless steel products and systems designed for hygiene, durability, and compliance.")}</p>
              <Link to="/shop" className="inline-flex items-center justify-center w-fit px-5 md:px-7 py-2.5 md:py-3 bg-[#22a3e6] text-white text-xs md:text-sm font-semibold hover:bg-[#1c90cb] transition-colors">
                {t("home_learn_more_label", "Learn More")}
              </Link>
            </div>
            <div className="w-[32%] h-full flex-shrink-0 hidden md:block">
              <img src={t("home_comfort_image", "/images/air-conditioner.jpg")} alt="Our products" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="container mx-auto px-4 lg:px-8 py-10 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center">
          {[
            t("home_brand_1", "ELEVATE"),
            t("home_brand_2", "AXION"),
            t("home_brand_3", "SPLENDOR"),
            t("home_brand_4", "DELT")
          ].map((name) => (
            <div key={name} className="text-center text-[#bfc7d4] text-[36px] md:text-3xl font-semibold tracking-wide">
              {name}
            </div>
          ))}
          <div className="col-span-2 md:col-span-1 md:justify-self-end">
            <h3 className="text-[56px] md:text-[50px] leading-[0.92] md:leading-[0.98] font-semibold text-[#10275c] font-sans">
              {t("home_brands_title", "We work with the best brands")}
            </h3>
          </div>
        </div>
      </section>

      {/* Gallery Strip */}
      <section className="grid grid-cols-2 md:grid-cols-6 overflow-hidden">
        {[
          t("home_gallery_1", "/images/welding.jpg"),
          t("home_gallery_2", "/images/air-conditioner.jpg"),
          t("home_gallery_3", "/images/hero-kitchen.jpg"),
          t("home_gallery_4", "/images/installation-service.jpg"),
          t("home_gallery_5", "/images/workshop.jpg"),
          t("home_gallery_6", "/images/mesh-filter.jpg"),
        ].map((img, i) => (
          <div key={i} className="overflow-hidden h-28 md:h-56">
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </section>

      <Footer />
    </div>
  );
};

export default Index;
