import { Link } from "react-router-dom";
import { Facebook, Twitter, Dribbble, Instagram, ArrowRight, ChevronDown } from "lucide-react";

interface FooterProps {
  variant?: "default" | "home";
}

const Footer = ({ variant = "default" }: FooterProps) => {
  return (
    <footer className="relative z-10 bg-[#0c1427] text-white">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Working Hours */}
          <div>
            <h4 className="font-serif text-xl font-bold mb-6">Working Hours</h4>
            <div className="space-y-2">
              <p className="text-white/60 text-sm">Mon-Fri: 9 AM — 6 PM</p>
              <p className="text-white/60 text-sm">Saturday: 9 AM — 4 PM</p>
              <p className="text-white/60 text-sm">Sunday: Closed</p>
            </div>
          </div>

          {/* Office */}
          <div>
            <h4 className="font-serif text-xl font-bold mb-6">Office</h4>
            <div className="space-y-2">
              <p className="text-white/60 text-sm">Unit 8A Cromwell Centre</p>
              <p className="text-white/60 text-sm">Roebuck Road</p>
              <p className="text-white/60 text-sm">Hainaut Business Park</p>
              <p className="text-white/60 text-sm">ILFORD, IG6 3UG</p>
              <div className="pt-2">
                <a href="mailto:info@midiammetal.com" className="text-orange text-sm underline decoration-orange/30 hover:decoration-orange transition-all">info@midiammetal.com</a>
              </div>
              <div className="pt-1 space-y-1">
                <p className="text-white/60 text-sm font-semibold">Ahmed: <a href="tel:07545888522" className="hover:text-orange transition-colors">07545888522</a></p>
                <p className="text-white/60 text-sm font-semibold">Jwan: <a href="tel:07442914525" className="hover:text-orange transition-colors">07442914525</a></p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-serif text-xl font-bold mb-6">Links</h4>
            <ul className="space-y-2">
              {[
                { label: "Home", path: "/" },
                { label: "Services", path: "/services" },
                { label: "About Us", path: "/about" },
                { label: "Shop", path: "/shop" },
                { label: "Contact", path: "/contact" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.path} className="text-white/60 text-sm hover:text-orange transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get in Touch */}
          <div>
            <h4 className="font-serif text-xl font-bold mb-6">Get in Touch</h4>
            <div className="flex gap-4">
              {[Facebook, Twitter, Dribbble, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-orange hover:border-orange transition-all group"
                >
                  <Icon className="w-4 h-4 text-white group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 bg-[#0a101f]">
        <div className="container mx-auto px-4 lg:px-8 py-6 flex justify-between items-center">
          <p className="text-white/40 text-xs tracking-wide">MidiaM © 2026. All Rights Reserved.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-10 h-10 bg-orange text-white rounded flex items-center justify-center hover:bg-orange-hover transition-all shadow-lg active:scale-95"
          >
            <ChevronDown className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
