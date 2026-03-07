import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ShieldCheck, Wrench, Factory, Clock3, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiFetch } from "@/lib/api";

const highlights = (settings: Record<string, string>) => [
  { value: settings["about_exp_value"] || "15+", label: settings["about_exp_label"] || "Years of Experience" },
  { value: settings["about_proj_value"] || "1,200+", label: settings["about_proj_label"] || "Projects Completed" },
  { value: settings["about_satisfaction_value"] || "98%", label: settings["about_satisfaction_label"] || "Client Satisfaction" },
  { value: settings["about_support_value"] || "24/7", label: settings["about_support_label"] || "Support Availability" },
];

const getValues = (t: (k: string, d: string) => string) => [
  {
    icon: ShieldCheck,
    title: t("about_value_1_title", "Quality First"),
    text: t("about_value_1_desc", "Every product is fabricated with strict quality control and practical attention to detail."),
  },
  {
    icon: Wrench,
    title: t("about_value_2_title", "Expert Craftsmanship"),
    text: t("about_value_2_desc", "Our team combines technical skill and field experience to deliver reliable metal solutions."),
  },
  {
    icon: Factory,
    title: t("about_value_3_title", "Custom Fabrication"),
    text: t("about_value_3_desc", "We build tailored stainless steel systems for kitchens, commercial sites, and industrial spaces."),
  },
  {
    icon: Clock3,
    title: t("about_value_4_title", "On-Time Delivery"),
    text: t("about_value_4_desc", "Clear planning and efficient production keep your project timeline on track from start to finish."),
  },
];

const AboutPage = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch("/v1/settings"); // Public endpoint needed?
        // Wait, check if there is a public settings endpoint.
        const settingsMap: Record<string, string> = {};
        res.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const t = (key: string, def: string) => settings[key] || def;

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="pt-16 md:pt-24 pb-12 md:pb-16 text-center">
        <h1 className="font-sans text-[52px] md:text-[72px] leading-none font-semibold text-[#10275c]">{t("about_hero_title", "About Us")}</h1>
        <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-14 items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#10275c] mb-4">{t("about_who_label", "Who We Are")}</p>
            <h2 className="font-sans text-[46px] md:text-[62px] leading-[0.95] font-semibold text-[#10275c] mb-6 whitespace-pre-wrap">
              {t("about_title", "Precision Metal Solutions for Modern Spaces")}
            </h2>
            <p className="text-[#6f7c95] text-[15px] leading-8 mb-5 whitespace-pre-wrap">
              {t("about_content_1", "Midia M Metal specializes in stainless steel fabrication, kitchen ventilation systems, and tailored installation services.")}
            </p>
            <p className="text-[#6f7c95] text-[15px] leading-8 mb-8 whitespace-pre-wrap">
              {t("about_content_2", "From initial consultation to final handover, we focus on quality workmanship, reliable timelines, and clear communication.")}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center h-12 px-8 bg-orange text-white text-[14px] font-semibold hover:bg-orange-hover transition-colors"
            >
              Start Your Project
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <img src={t("about_image_1", "/images/workshop.jpg")} alt="Workshop" className="w-full h-[220px] md:h-[280px] object-cover" />
            <img src={t("about_image_2", "/images/welding.jpg")} alt="Welding process" className="w-full h-[220px] md:h-[280px] object-cover" />
            <img src={t("about_image_3", "/images/hero-kitchen.jpg")} alt="Kitchen setup" className="w-full h-[220px] md:h-[280px] object-cover" />
            <img src={t("about_image_4", "/images/canopy.jpg")} alt="Canopy fabrication" className="w-full h-[220px] md:h-[280px] object-cover" />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-16 md:pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights(settings).map((item) => (
            <div key={item.label} className="bg-[#f4f5f7] border border-[#d7dfeb] p-6 md:p-8 text-center">
              <p className="font-sans text-[40px] md:text-[56px] leading-none font-semibold text-[#10275c]">{item.value}</p>
              <p className="text-[#6f7c95] text-[13px] md:text-[14px] mt-3">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-16 md:pb-24">
        <p className="text-center text-[10px] font-bold tracking-[0.24em] text-muted-foreground uppercase mb-3">{t("about_values_label", "Our Core Values")}</p>
        <h2 className="text-center font-sans text-[44px] md:text-[62px] leading-[0.95] font-semibold text-[#10275c] mb-12 md:mb-14">
          {t("about_values_title", "Built on Quality and Trust")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {getValues(t).map((value) => (
            <div key={value.title} className="bg-[#f4f5f7] border border-[#d7dfeb] p-7">
              <value.icon className="w-8 h-8 text-orange mb-5" />
              <h3 className="font-sans text-[28px] leading-[1.05] font-semibold text-[#10275c] mb-3">{value.title}</h3>
              <p className="text-[#6f7c95] text-[14px] leading-7">{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#0c63a4] to-[#1296df]">
        <div className="container mx-auto px-4 lg:px-8 py-9 md:py-11 flex flex-col md:flex-row items-center justify-between gap-6">
          <h3 className="font-sans text-[34px] md:text-[44px] leading-[1.02] font-semibold text-white whitespace-pre-line">
            {t("about_cta_title", "Need a custom metal solution\nfor your business?")}
          </h3>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center px-8 h-12 bg-white text-[#10275c] text-sm font-semibold hover:bg-[#edf3f9] transition-colors"
          >
            Contact Us
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
