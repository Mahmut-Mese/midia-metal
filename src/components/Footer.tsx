import { Link } from "react-router-dom";
import { Facebook, Twitter, Dribbble, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8 py-16">
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
              {["Home", "Services", "About Us", "Shop", "Contact"].map((item) => (
                <li key={item}>
                  <Link to="/" className="text-primary-foreground/70 text-sm hover:text-orange transition-colors">
                    {item}
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
