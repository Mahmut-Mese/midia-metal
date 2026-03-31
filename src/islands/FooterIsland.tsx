/**
 * FooterIsland — React island wrapper for the Footer component.
 * Used in BaseLayout.astro with client:load directive.
 *
 * Standalone version that uses <a> tags instead of react-router-dom <Link>.
 * Faithfully reproduces src/components/Footer.tsx layout and behaviour.
 */
import { useEffect, useState } from 'react';
import { Facebook, Twitter, Dribbble, Instagram, ArrowUp } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function FooterIsland() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch('/v1/settings');
        const settingsMap: Record<string, string> = {};
        res.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error('Failed to load footer settings', err);
      }
    };
    loadSettings();
  }, []);

  const t = (key: string, def: string) => settings[key] || def;

  return (
    <footer className="relative z-10 bg-[#031946] text-white">
      <div className="container mx-auto px-4 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 md:gap-12">
          {/* Working Hours */}
          <div>
            <h4 className="font-sans text-xl font-semibold mb-6">
              {t('footer_label_working_hours', 'Working Hours')}
            </h4>
            <div className="space-y-2">
              <p className="text-white/70 text-sm whitespace-pre-line">
                {t('footer_working_hours', 'Mon-Fri: 9 AM — 6 PM\nSaturday: 9 AM — 4 PM\nSunday: Closed')}
              </p>
            </div>
          </div>

          {/* Office */}
          <div>
            <h4 className="font-sans text-xl font-semibold mb-6">
              {t('footer_label_office', 'Office')}
            </h4>
            <div className="space-y-2">
              <p className="text-white/70 text-sm whitespace-pre-line">
                {t('contact_address', 'Unit 8A Cromwell Centre\nRoebuck Road, Hainaut Business Park\nILFORD, IG6 3UG')}
              </p>
              <div className="pt-2">
                <a
                  href={`mailto:${t('contact_email', 'info@midiammetal.com')}`}
                  className="text-white text-sm underline decoration-white/40 hover:decoration-white transition-all"
                >
                  {t('contact_email', 'info@midiammetal.com')}
                </a>
              </div>
              <div className="pt-4">
                <p className="text-white text-[22px] leading-none font-medium">
                  <a
                    href={`tel:${t('contact_phone', '07545888522')}`}
                    className="hover:text-orange transition-colors"
                  >
                    {t('contact_phone', '07545888522')}
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-sans text-xl font-semibold mb-6">
              {t('footer_label_links', 'Quick Links')}
            </h4>
            <ul className="space-y-2">
              {[
                { label: t('footer_nav_home', 'Home'), path: '/' },
                { label: t('footer_nav_services', 'Services'), path: '/services' },
                { label: t('footer_nav_about', 'About Us'), path: '/about' },
                { label: t('footer_nav_shop', 'Shop'), path: '/shop' },
                { label: t('footer_nav_contact', 'Contact'), path: '/contact' },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.path}
                    className="text-white/80 text-sm hover:text-white transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Information links */}
          <div>
            <h4 className="font-sans text-xl font-semibold mb-6">
              {t('footer_label_info', 'Information')}
            </h4>
            <ul className="space-y-2">
              {[
                { label: t('footer_info_privacy', 'Privacy Policy'), path: '/privacy-policy' },
                { label: t('footer_info_terms', 'Terms & Conditions'), path: '/terms-of-service' },
                { label: t('footer_info_cookies', 'Cookies Page'), path: '/cookies' },
                { label: t('footer_info_returns', 'Returns & Refunds'), path: '/returns-policy' },
                { label: t('footer_info_faq', 'FAQ'), path: '/faq' },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.path}
                    className="text-white/80 text-sm hover:text-white transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Get in Touch */}
          <div>
            <h4 className="font-sans text-xl font-semibold mb-6">
              {t('footer_label_get_in_touch', 'Get in Touch')}
            </h4>
            <div className="flex gap-4">
              {[
                { Icon: Facebook, href: t('social_facebook', '#') },
                { Icon: Twitter, href: t('social_twitter', '#') },
                { Icon: Dribbble, href: t('social_dribbble', '#') },
                { Icon: Instagram, href: t('social_instagram', '#') },
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
          <p className="text-white/65 text-xs tracking-wide">
            {t('footer_text', 'midiaM \u00A9 2024. All Rights Reserved.')}
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-10 h-10 bg-orange text-white flex items-center justify-center hover:bg-orange-hover transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
