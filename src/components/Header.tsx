import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Search, ShoppingCart, Menu, X, LayoutGrid, Facebook, Twitter, Dribbble, Instagram, MapPin, Phone, Mail, User } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useCart } from "@/context/CartContext";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Services", path: "/services" },
  { label: "About", path: "/about" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Blog", path: "/blog" },
  { label: "Shop", path: "/shop" },
  { label: "Contact", path: "/contact" },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart } = useCart();
  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        console.error("Failed to load header settings", err);
      }
    };
    loadSettings();
  }, []);

  const t = (key: string, def: string) => settings[key] || def;

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    setIsInfoSidebarOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isInfoSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isInfoSidebarOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const isPathActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <header className="relative z-50 bg-white border-b border-[#e6e9ef]">
      <div className="container mx-auto flex items-center justify-between h-[64px] md:h-[84px] px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            src={t("site_logo", "/logo.png")}
            alt={`${t("site_name", "Midia M Metal")} Logo`}
            className="h-14 w-auto object-contain"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {[
            { label: t("nav_home", "Home"), path: "/" },
            { label: t("nav_services", "Services"), path: "/services" },
            { label: t("nav_about", "About Us"), path: "/about" },
            { label: t("nav_portfolio", "Portfolio"), path: "/portfolio" },
            { label: t("nav_blog", "Blog"), path: "/blog" },
            { label: t("nav_shop", "Shop"), path: "/shop" },
            { label: t("nav_contact", "Contact"), path: "/contact" },
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-[15px] leading-none font-medium transition-colors ${isPathActive(item.path)
                ? "text-primary underline underline-offset-[10px] decoration-[1.5px]"
                : "text-primary hover:text-orange"
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3 md:gap-5">
          <Link to="/cart" className="relative group">
            <ShoppingCart className="w-[18px] h-[18px] text-primary group-hover:text-orange transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-orange text-accent-foreground text-[10px] flex items-center justify-center rounded-full font-bold">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            className="text-primary hover:text-orange transition-colors"
            onClick={() => navigate('/account')}
          >
            <User className="w-[18px] h-[18px]" />
          </button>
          <button
            className="text-primary hover:text-orange transition-colors"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="w-[18px] h-[18px]" />
          </button>
          <button
            className="text-primary hover:text-orange transition-colors hidden lg:block"
            onClick={() => setIsInfoSidebarOpen(true)}
            aria-label="Open information sidebar"
          >
            <LayoutGrid className="w-[18px] h-[18px]" />
          </button>
          <button
            className="lg:hidden text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="absolute inset-0 bg-white z-[60] flex items-center px-4 lg:px-8">
          <div className="container mx-auto flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                className="w-full bg-transparent border-none text-2xl md:text-3xl font-semibold text-primary placeholder:text-muted-foreground/30 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="hidden">Search</button>
            </form>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="w-8 h-8 text-primary" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-border shadow-lg flex flex-col">
          {[
            { label: t("nav_home", "Home"), path: "/" },
            { label: t("nav_services", "Services"), path: "/services" },
            { label: t("nav_about", "About Us"), path: "/about" },
            { label: t("nav_portfolio", "Portfolio"), path: "/portfolio" },
            { label: t("nav_blog", "Blog"), path: "/blog" },
            { label: t("nav_shop", "Shop"), path: "/shop" },
            { label: t("nav_contact", "Contact"), path: "/contact" },
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-8 py-4 text-[15px] hover:bg-muted transition-colors ${isPathActive(item.path) ? "text-primary font-semibold" : "text-primary"
                }`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {/* Desktop Info Sidebar */}
      {isInfoSidebarOpen && (
        <div className="fixed inset-0 z-[70] hidden lg:block" role="dialog" aria-modal="true">
          <button
            aria-label="Close information sidebar backdrop"
            className="absolute inset-0 bg-[#0b1530]/30"
            onClick={() => setIsInfoSidebarOpen(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-[420px] bg-[#f3f5f8] border-l border-[#d7dfeb] p-10 overflow-y-auto">
            <div className="flex items-center justify-between mb-16">
              <img src={t("site_logo", "/logo.png")} alt={`${t("site_name", "Midia M Metal")} Logo`} className="h-14 w-auto object-contain mix-blend-multiply" />
              <button
                onClick={() => setIsInfoSidebarOpen(false)}
                className="w-14 h-14 rounded-full bg-[#e1e8f0] text-primary hover:bg-[#d6deea] transition-colors grid place-items-center"
                aria-label="Close information sidebar"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {[
                { Icon: Facebook, label: "Facebook", href: t("social_facebook", "#") },
                { Icon: Twitter, label: "Twitter", href: t("social_twitter", "#") },
                { Icon: Dribbble, label: "Dribbble", href: t("social_dribbble", "#") },
                { Icon: Instagram, label: "Instagram", href: t("social_instagram", "#") },
              ].map(({ Icon, label, href }) => (
                <a key={label} href={href} className="flex items-center gap-3 text-primary hover:text-orange transition-colors text-[17px] font-semibold">
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  {label}
                </a>
              ))}
            </div>

            <div className="mt-14 border-t border-[#c9d3e4] pt-10 space-y-6">
              <div className="flex items-start gap-3 text-[#6f7c95] text-[15px] leading-7">
                <MapPin className="w-5 h-5 text-[#2f9cea] mt-0.5 flex-shrink-0" />
                <p>
                  {t("contact_address", "Unit 8A Cromwell Centre\nRoebuck Road, Hainaut Business Park\nILFORD, IG6 3UG")}
                </p>
              </div>

              <div className="space-y-2">
                <a href={`tel:${t("contact_phone", "07545888522")}`} className="flex items-start gap-3 text-primary hover:text-orange transition-colors">
                  <Phone className="w-5 h-5 text-[#2f9cea] mt-1 flex-shrink-0" />
                  <span className="text-[30px] xl:text-[34px] leading-[1.05] font-semibold tracking-tight whitespace-nowrap">{t("contact_phone", "07545888522")}</span>
                </a>
              </div>

              <a href={`mailto:${t("contact_email", "info@midiammetal.com")}`} className="flex items-center gap-3 text-[18px] text-[#6f7c95] hover:text-orange transition-colors">
                <Mail className="w-5 h-5 text-[#2f9cea] flex-shrink-0" />
                {t("contact_email", "info@midiammetal.com")}
              </a>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};

export default Header;
