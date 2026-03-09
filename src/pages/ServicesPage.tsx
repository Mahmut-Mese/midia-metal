import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone, ArrowRight, Star, ChevronDown, Hammer, Trophy, Settings2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiFetch } from "@/lib/api";
import Seo from "@/components/Seo";
import { absoluteUrl, buildBreadcrumbJsonLd, truncateText } from "@/lib/seo";



const ServicesPage = () => {
  const [services, setServices] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesRes, settingsRes, testimonialsRes] = await Promise.all([
          apiFetch("/v1/services"),
          apiFetch("/v1/settings"),
          apiFetch("/v1/testimonials")
        ]);
        setServices(servicesRes);
        setTestimonials(testimonialsRes);
        const settingsMap: Record<string, string> = {};
        settingsRes.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error("Failed to load services data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const t = (key: string, def: string) => settings[key] || def;

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Seo
        title="Services"
        description={truncateText(t("services_hero_desc", "Commercial kitchen ventilation, stainless steel welding, custom fabrication, canopy installation, and maintenance services across the UK."))}
        image={t("services_hero_image_1", "/images/hero-kitchen.jpg")}
        canonicalPath="/services"
        structuredData={[
          buildBreadcrumbJsonLd([
            { name: "Home", url: absoluteUrl("/") },
            { name: "Services", url: absoluteUrl("/services") },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: services.map((service, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: absoluteUrl(`/services/${service.slug}`),
              name: service.title,
            })),
          },
        ]}
      />
      <Header />

      <section className="container mx-auto px-4 lg:px-8 pt-16 md:pt-20 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#10275c] mb-4">{t("services_hero_label", "YOUR COMFORT")}</p>
            <h2 className="font-sans text-[48px] md:text-[62px] leading-[0.95] font-semibold text-[#10275c] mb-6">{t("services_hero_subtitle", "Stainless steel welding")}</h2>
            <p className="text-[#1c2b4a] text-[23px] md:text-[26px] leading-[1.25] mb-5">
              {t("services_hero_tagline", "Professional craftsmanship for demanding projects.")}
            </p>
            <p className="text-[#79849d] text-sm leading-7 mb-8 max-w-lg">
              {t("services_hero_desc", "We offer high-precision welding services for commercial and industrial applications.")}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link to="/about" className="inline-flex items-center justify-center px-8 py-4 bg-orange text-white text-sm font-semibold hover:bg-[#d4500b] transition-colors">
                About Us
              </Link>
              <a href={`tel:${t("services_hero_phone", "0 800 555 44 33")}`} className="flex items-center gap-3 text-sm font-semibold text-primary">
                <span className="w-11 h-11 border border-[#d3dbe7] grid place-items-center bg-white">
                  <Phone className="w-4 h-4" />
                </span>
                {t("services_hero_phone", "0 800 555 44 33")}
              </a>
            </div>
          </div>
          <div className="relative h-[360px] md:h-[520px]">
            <div className="absolute right-0 top-0 w-[58%] h-[74%] overflow-hidden">
              <img src={t("services_hero_image_1", "/images/hero-kitchen.jpg")} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute left-0 bottom-0 w-[68%] h-[84%] overflow-hidden">
              <img src={t("services_hero_image_2", "/images/welding.jpg")} alt="Stainless steel welding" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-4 lg:px-8 py-16 md:py-24">
        <p className="text-center text-[10px] font-bold tracking-[0.24em] text-muted-foreground uppercase mb-3">{t("services_quality_label", "PREMIUM QUALITY")}</p>
        <h2 className="text-center font-sans text-[44px] md:text-[62px] leading-[0.95] font-semibold text-[#10275c] mb-12 md:mb-16 whitespace-pre-line">
          {t("services_quality_title", "Our services make your\nlife comfortable")}
        </h2>
        {loading ? (
          <div className="py-16 text-center text-[#6e7a92] bg-[#f4f5f7] border border-[#d5deea]">Loading services...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            {services.map((s) => (
              <div key={s.id} className="text-center">
                <Link to={`/services/${s.slug}`} className="block">
                  <div className="w-44 h-44 mx-auto rounded-full overflow-hidden mb-7 border-8 border-[#eaf0f3] shadow-sm">
                    <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                  </div>
                </Link>
                <p className="text-xs text-muted-foreground mb-1">Best service</p>
                <h3 className="font-sans text-[33px] leading-tight font-semibold text-[#10275c] mb-3">
                  <Link to={`/services/${s.slug}`} className="hover:text-orange transition-colors">
                    {s.title}
                  </Link>
                </h3>
                <p className="text-sm text-[#7b879f] leading-relaxed mb-5 max-w-sm mx-auto">{s.description}</p>
                <Link to={`/services/${s.slug}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#cfd8e6] text-primary hover:text-orange hover:border-orange transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-[#0c63a4] to-[#1296df]">
        <div className="container mx-auto px-4 lg:px-8 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <h3 className="font-sans text-[36px] md:text-[44px] leading-[1.05] font-semibold text-white whitespace-pre-line">
            {t("services_cta_title", "Contact us today for a free\nconsultation and quote.")}
          </h3>
          <div className="flex gap-4 flex-wrap">
            <Link to="/get-a-quote" className="inline-flex items-center justify-center px-7 py-3 text-sm font-semibold bg-white text-[#10275c] hover:bg-[#eef3f8] transition-colors duration-200">
              Request a Quote
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center px-7 py-3 border border-white text-white text-sm font-semibold hover:bg-white hover:text-[#0f6fb5] transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Solutions */}
      <section className="container mx-auto px-4 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="flex gap-4">
            <img src={t("services_modern_image_1", "/images/workshop.jpg")} alt="" className="w-1/2 h-56 md:h-72 object-cover" />
            <img src={t("services_modern_image_2", "/images/hero-kitchen.jpg")} alt="" className="w-1/2 h-56 md:h-72 object-cover" />
          </div>
          <div className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground mb-3">{t("services_modern_label", "MODERN SOLUTIONS")}</p>
            <h2 className="font-sans text-[50px] md:text-[70px] leading-[0.93] font-semibold text-[#10275c] mb-5">{t("services_modern_title", "Project with Expert & Metal Welding Collaboration")}</h2>
            <p className="text-[#7b879f] text-sm leading-relaxed mb-7">
              {t("services_modern_desc", "From survey to fabrication and final installation, we build stainless steel systems for commercial kitchens, food production spaces, and ventilation projects.")}
            </p>
            <Link to="/shop" className="inline-flex items-center justify-center px-8 py-4 bg-orange text-white text-sm font-semibold hover:bg-[#d4500b] transition-colors">
              Visit Our Online Store
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 lg:px-8 py-8 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 text-center">
          {[
            { title: t("services_feature_1_title", "Restaurant Expertise"), desc: t("services_feature_1_desc", "Specialist experience across extraction canopies, ducting, filters, and stainless steel fit-outs."), icon: <Hammer className="w-8 h-8 text-orange" /> },
            { title: t("services_feature_2_title", "Quality Assurance"), desc: t("services_feature_2_desc", "Every project is built around hygiene, durability, and reliable installation standards."), icon: <Trophy className="w-8 h-8 text-orange" /> },
            { title: t("services_feature_3_title", "Custom Solutions"), desc: t("services_feature_3_desc", "We tailor fabrication, dimensions, and finishes to the needs of each commercial site."), icon: <Settings2 className="w-8 h-8 text-orange" /> },
          ].map((f, i) => (
            <div key={i}>
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center">{f.icon}</div>
              <h3 className="font-sans text-[34px] leading-tight font-semibold text-primary mb-3">{f.title}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{f.desc}</p>
              <Link to="/services" className="inline-flex items-center justify-center mt-4 text-primary hover:text-orange transition-colors">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <p className="text-center text-[10px] font-bold tracking-[0.24em] text-muted-foreground uppercase mb-3">PEOPLE SAY ABOUT US</p>
          <h2 className="text-center font-sans text-[48px] md:text-[68px] leading-[0.95] font-semibold text-[#10275c] mb-12">Our customers say</h2>
        </div>
        {testimonials.length > 0 ? (
          <>
            <div className="container mx-auto px-4 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
                {testimonials.map((t, i) => (
                  <div key={i} className="w-full max-w-[420px] bg-[#f4f5f7] p-8">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-orange text-orange" />
                      ))}
                    </div>
                    <p className="text-sm text-[#58657f] leading-7 mb-6">{t.content}</p>
                    <p className="font-sans font-semibold text-[21px] text-primary">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.company}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-8">
              <span className="w-1.5 h-1.5 rounded-full bg-orange" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#c7cfdb]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#c7cfdb]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#c7cfdb]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#c7cfdb]" />
            </div>
          </>
        ) : (
          <div className="container mx-auto px-4 lg:px-8">
            <p className="text-center text-[#7b879f] text-sm">Testimonials will appear here soon.</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default ServicesPage;
