import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Search, ShoppingCart, Menu, X, ChevronDown, LayoutGrid } from "lucide-react";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Our Services", path: "/services" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Blog", path: "/blog" },
  { label: "Shop", path: "/shop" },
  { label: "Contact", path: "/contact" },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-20 px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            src="/logo.png"
            alt="Midia M Metal Logo"
            className="h-12 w-auto object-contain"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link text-sm uppercase tracking-wide ${location.pathname === item.path ? "active" : "text-primary"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <Link to="/shop" className="relative group">
            <ShoppingCart className="w-5 h-5 text-primary group-hover:text-orange transition-colors" />
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-orange text-accent-foreground text-[10px] flex items-center justify-center rounded-full font-bold">
              1
            </span>
          </Link>
          <button
            className="text-primary hover:text-orange transition-colors"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="w-5 h-5" />
          </button>
          <button className="text-primary hover:text-orange transition-colors hidden lg:block">
            <LayoutGrid className="w-5 h-5" />
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
        <div className="absolute inset-0 bg-background z-[60] flex items-center px-4 lg:px-8">
          <div className="container mx-auto flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                className="w-full bg-transparent border-none text-2xl md:text-3xl font-bold text-primary placeholder:text-muted-foreground/30 focus:outline-none"
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
        <nav className="lg:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg flex flex-col">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-8 py-4 text-sm uppercase tracking-widest hover:bg-muted transition-colors ${location.pathname === item.path ? "text-orange font-bold" : "text-primary"}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
