import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Dribbble, Instagram, ArrowRight, ArrowUp } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface FooterProps {
  variant?: "default" | "home";
}

const Footer = ({ variant = "default" }: FooterProps) => {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch("/v1/settings");
        const settingsMap: Record<string, string> = {};
        res.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error("Failed to load footer settings", err);
      }
    };
    loadSettings();
  }, []);

  const t = (key: string, def: string) => settings[key] || def;

  if (variant === "home") {
    return (
      <footer className="relative z-10 bg-[#031946] text-white">
        <div className="container mx-auto px-4 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-14">
            <div>
              <h4 className="text-lg font-semibold mb-5">{t("footer_label_office", "Office")}</h4>
              <div className="space-y-2 text-sm text-white/75">
                <p>
                  {t("contact_address", "Unit 8A Cromwell Centre\nRoebuck Road, Hainaut Business Park\nILFORD, IG6 3UG")}
                </p>
                <p className="pt-1">
                  <a href={`mailto:${t("contact_email", "info@midiammetal.com")}`} className="underline decoration-white/35 hover:decoration-white transition-all">
                    {t("contact_email", "info@midiammetal.com")}
                  </a>
                </p>
              </div>
              <div className="mt-6 space-y-2">
                <p className="text-lg font-semibold tracking-tight text-white">
                  <a href={`tel:${t("contact_phone", "07545888522")}`} className="hover:text-orange transition-colors">{t("contact_phone", "07545888522")}</a>
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-5">{t("footer_label_links", "Links")}</h4>
              <ul className="space-y-3 text-sm text-white/80">
                {[
                  { label: t("nav_home", "Home"), path: "/" },
                  { label: t("nav_services", "Services"), path: "/services" },
                  { label: t("nav_about", "About Us"), path: "/about" },
                  { label: t("nav_shop", "Shop"), path: "/shop" },
                  { label: t("nav_contact", "Contact"), path: "/contact" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link to={item.path} className="hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-5">{t("footer_newsletter_title", "Newsletter")}</h4>
              <p className="text-sm text-white/60 mb-4">{t("footer_newsletter_desc", "Get the latest updates and offers.")}</p>
              <div className="border-b border-white/25 pb-3 flex items-center justify-between gap-3">
                <input
                  type="email"
                  placeholder="Enter Your Email Address"
                  className="w-full bg-transparent text-sm placeholder:text-white/55 focus:outline-none"
                />
                <button className="text-white hover:text-orange transition-colors" aria-label="Submit email">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <label className="mt-6 flex items-start gap-2 text-xs text-white/65">
                <input type="checkbox" className="mt-0.5 accent-orange" />
                <span>
                  I agree to the <a href="#" className="underline underline-offset-2">Privacy Policy.</a>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container mx-auto px-4 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/65">{t("footer_text", "midiaM © 2026. All Rights Reserved.")}</p>
            <div className="flex items-center gap-5 text-xs text-white/50">
              <Link to="/privacy-policy" className="hover:text-white/80 transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white/80 transition-colors">Terms of Service</Link>
              <Link to="/returns-policy" className="hover:text-white/80 transition-colors">Returns Policy</Link>
            </div>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-8 h-8 bg-orange text-white grid place-items-center hover:bg-orange-hover transition-colors"
              aria-label="Back to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 bg-[#031946] text-white">
      <div className="container mx-auto px-4 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-14">
          {/* Working Hours */}
          <div>
            <h4 className="font-sans text-xl font-semibold mb-6">{t("footer_label_working_hours", "Working Hours")}</h4>
            <div className="space-y-2">
              <p className="text-white/70 text-sm whitespace-pre-line">{t("footer_working_hours", "Mon-Fri: 9 AM — 6 PM\nSaturday: 9 AM — 4 PM\nSunday: Closed")}</p>
            </div>
          </div>

          {/* Office */}
          <div>
            <h4 className="font-sans text-xl font-semibold mb-6">{t("footer_label_office", "Office")}</h4>
            <div className="space-y-2">
              <p className="text-white/70 text-sm whitespace-pre-line">{t("contact_address", "Unit 8A Cromwell Centre\nRoebuck Road, Hainaut Business Park\nILFORD, IG6 3UG")}</p>
              <div className="pt-2">
                <a href={`mailto:${t("contact_email", "info@midiammetal.com")}`} className="text-white text-sm underline decoration-white/40 hover:decoration-white transition-all">{t("contact_email", "info@midiammetal.com")}</a>
              </div>
              <div className="pt-4">
                <p className="text-white text-[22px] leading-none font-medium">
                  <a href={`tel:${t("contact_phone", "07545888522")}`} className="hover:text-orange transition-colors">
                    {t("contact_phone", "07545888522")}
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-sans text-xl font-semibold mb-6">{t("footer_label_links", "Links")}</h4>
            <ul className="space-y-2">
              {[
                { label: t("nav_home", "Home"), path: "/" },
                { label: t("nav_services", "Services"), path: "/services" },
                { label: t("nav_about", "About Us"), path: "/about" },
                { label: t("nav_shop", "Shop"), path: "/shop" },
                { label: t("nav_contact", "Contact"), path: "/contact" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.path} className="text-white/80 text-sm hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get in Touch */}
          <div>
            <h4 className="font-sans text-xl font-semibold mb-6">{t("footer_label_get_in_touch", "Get in Touch")}</h4>
            <div className="flex gap-4">
              {[
                { Icon: Facebook, href: t("social_facebook", "#") },
                { Icon: Twitter, href: t("social_twitter", "#") },
                { Icon: Dribbble, href: t("social_dribbble", "#") },
                { Icon: Instagram, href: t("social_instagram", "#") }
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-orange hover:border-orange transition-all group"
                >
                  <Icon className="w-4 h-4 text-white group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 lg:px-8 py-6 flex justify-between items-center">
          <p className="text-white/65 text-xs tracking-wide">{t("footer_text", "midiaM © 2024. All Rights Reserved.")}</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-10 h-10 bg-orange text-white flex items-center justify-center hover:bg-orange-hover transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
