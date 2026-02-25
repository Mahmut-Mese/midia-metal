import { Link } from "react-router-dom";
import { Facebook, Twitter, Dribbble, Instagram, ArrowRight } from "lucide-react";

interface FooterProps {
  variant?: "default" | "home";
}

const Footer = ({ variant = "default" }: FooterProps) => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        {variant === "home" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Office */}
            <div>
              <h4 className="font-sans text-lg font-bold mb-4">Office</h4>
              <p className="text-primary-foreground/70 text-sm mb-1">The USA —</p>
              <p className="text-primary-foreground/70 text-sm mb-1">785 15th Street, Office 478</p>
              <p className="text-primary-foreground/70 text-sm mb-3">Boston, MA 02130</p>
              <a href="mailto:info@email.com" className="text-orange text-sm underline">info@email.com</a>
              <p className="text-primary-foreground/70 text-sm mt-2 font-semibold">+1 800 555 25 69</p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-sans text-lg font-bold mb-4">Links</h4>
              <ul className="space-y-2">
                {[
                  { label: "Home", path: "/" },
                  { label: "Services", path: "/services" },
                  { label: "About Us", path: "/" },
                  { label: "Shop", path: "/shop" },
                  { label: "Contact", path: "/contact" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link to={item.path} className="text-primary-foreground/70 text-sm hover:text-orange transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="font-sans text-lg font-bold mb-4">Newsletter</h4>
              <div className="flex items-center border-b border-primary-foreground/30 pb-2 mb-4">
                <svg className="w-4 h-4 text-primary-foreground/50 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  type="email"
                  placeholder="Enter Your Email Address"
                  className="bg-transparent text-sm w-full outline-none placeholder:text-primary-foreground/50 text-primary-foreground"
                />
                <button className="text-primary-foreground/70 hover:text-orange transition-colors ml-2">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs text-primary-foreground/50 cursor-pointer">
                <input type="checkbox" className="rounded border-primary-foreground/30" />
                I agree to the <a href="#" className="underline text-primary-foreground/70">Privacy Policy</a>.
              </label>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Working Hours */}
            <div>
              <h4 className="font-sans text-lg font-bold mb-4">Working Hours</h4>
              <p className="text-primary-foreground/70 text-sm mb-1">Mon-Fri: 9 AM — 6 PM</p>
              <p className="text-primary-foreground/70 text-sm mb-1">Saturday: 9 AM — 4 PM</p>
              <p className="text-primary-foreground/70 text-sm">Sunday: Closed</p>
            </div>

            {/* Office */}
            <div>
              <h4 className="font-sans text-lg font-bold mb-4">Office</h4>
              <p className="text-primary-foreground/70 text-sm mb-1">The USA —</p>
              <p className="text-primary-foreground/70 text-sm mb-1">785 15th Street, Office 478</p>
              <p className="text-primary-foreground/70 text-sm mb-3">Boston, MA 02130</p>
              <a href="mailto:info@email.com" className="text-orange text-sm underline">info@email.com</a>
              <p className="text-primary-foreground/70 text-sm mt-2 font-semibold">+1 800 555 25 69</p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-sans text-lg font-bold mb-4">Links</h4>
              <ul className="space-y-2">
                {[
                  { label: "Home", path: "/" },
                  { label: "Services", path: "/services" },
                  { label: "About Us", path: "/" },
                  { label: "Shop", path: "/shop" },
                  { label: "Contact", path: "/contact" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link to={item.path} className="text-primary-foreground/70 text-sm hover:text-orange transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Get in Touch */}
            <div>
              <h4 className="font-sans text-lg font-bold mb-4">Get in Touch</h4>
              <div className="flex gap-3">
                {[Facebook, Twitter, Dribbble, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 rounded-full border border-primary-foreground/30 flex items-center justify-center hover:bg-orange hover:border-orange transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          <p className="text-primary-foreground/50 text-xs">ThemeREX © 2026. All Rights Reserved.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-8 h-8 bg-orange rounded flex items-center justify-center hover:bg-orange-hover transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L1 6M6 1L11 6M6 1V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
