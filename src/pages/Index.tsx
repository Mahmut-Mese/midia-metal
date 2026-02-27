import { Link } from "react-router-dom";
import { Gift, CirclePercent, ShoppingBag, WalletMinimal, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StickySidebar from "@/components/StickySidebar";

const features = [
  { icon: Gift, title: "Reward program", desc: "Lorem ipsum" },
  { icon: CirclePercent, title: "Special discounts", desc: "Lorem ipsum" },
  { icon: ShoppingBag, title: "Fast shipping", desc: "Lorem ipsum" },
  { icon: WalletMinimal, title: "Great Prices", desc: "Lorem ipsum" },
];

const categories = [
  { name: "Canopy Grease Filters", image: "/images/baffle-filter.jpg" },
  { name: "Cutting Disks", image: "/images/cutting-disk.jpg" },
  { name: "Canopies", image: "/images/canopy.jpg" },
  { name: "LED Lights", image: "/images/mesh-filter.jpg" },
];

const trendingItems = [
  { name: "Wheels", price: "$1,000.00", image: "/images/wheels.jpg" },
  { name: "Baffle Grease Filters", price: "$800.00", image: "/images/baffle-filter.jpg" },
  { name: "wall cladding circle", price: "$700.00", image: "/images/cutting-disk.jpg" },
  { name: "Wall Cladding Sheets", price: "$830.00", image: "/images/wall-cladding.jpg" },
  { name: "Multi split", price: "$900.00", image: "/images/air-conditioner.jpg" },
  { name: "Control panel", price: "$700.00", image: "/images/control-panel.jpg" },
  { name: "Air dryer", price: "$800.00", oldPrice: "$900.00", badge: "-11%", image: "/images/air-conditioner.jpg" },
  { name: "Indoor unit", price: "$2,000.00", image: "/images/air-conditioner.jpg" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
  

      {/* Hero Slider */}
      <section className="relative h-[400px] md:h-[600px] overflow-hidden">
        <img
          src="/images/portfolio-banner-kitchen.png"
          alt="Commercial kitchen"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center items-end pointer-events-none pr-0">
          <div className="flex flex-col gap-px pointer-events-auto">
            <button className="w-12 h-16 bg-primary flex items-center justify-center text-primary-foreground hover:bg-navy-light transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="w-12 h-16 bg-primary flex items-center justify-center text-primary-foreground hover:bg-navy-light transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="border-b border-border bg-white">
        <div className="container mx-auto px-4 lg:px-8 py-4 md:py-5">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <f.icon className="h-8 w-8 flex-shrink-0 text-[#7a8293]" strokeWidth={1.75} />
                <div className="leading-tight">
                  <p className="font-sans text-sm font-semibold text-[#1d2940]">{f.title}</p>
                  <p className="mt-1 text-xs text-[#8b93a4]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <Link
              key={i}
              to={`/shop?category=${encodeURIComponent(cat.name === "Canopy Grease Filters" ? "Baffle Filters" : cat.name)}`}
              className="category-card block"
            >
              <img src={cat.image} alt={cat.name} />
              <div className="overlay">
                <p className="text-primary-foreground font-semibold text-sm">{cat.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Items */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <p className="text-center text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">OUR CATALOG</p>
        <h2 className="text-center text-3xl md:text-4xl font-bold text-primary mb-12">Trending items</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trendingItems.map((item, i) => (
            <Link to="/shop" key={i} className="product-card">
              <div className="relative bg-secondary rounded-lg overflow-hidden mb-3">
                {item.badge && (
                  <span className="absolute top-2 right-2 z-10 bg-orange text-accent-foreground text-xs font-bold px-2 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
                <img src={item.image} alt={item.name} />
              </div>
              <h3 className="font-sans text-sm font-semibold text-primary hover:text-orange transition-colors">{item.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {item.oldPrice && (
                  <span className="text-sm text-muted-foreground line-through">{item.oldPrice}</span>
                )}
                <span className="text-sm font-medium text-primary/70">{item.price}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/shop" className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-semibold text-sm rounded hover:bg-navy-light transition-colors">
            View More Products
          </Link>
        </div>
      </section>

      {/* CTA Banners */}
      <section className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative rounded-lg overflow-hidden h-72 bg-orange">
            <img src="/images/installation-service.jpg" alt="Installation services" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-orange/85 p-8 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-accent-foreground mb-2">Installation services</h3>
              <p className="text-accent-foreground/90 text-sm mb-6 max-w-sm">Professional installation for all your equipment needs.</p>
              <Link to="/contact" className="inline-flex items-center justify-center w-fit px-6 py-3 border-2 border-accent-foreground text-accent-foreground text-sm font-bold uppercase tracking-wider hover:bg-accent-foreground hover:text-orange transition-all">
                Request a Quote
              </Link>
            </div>
          </div>
          <div className="relative rounded-lg overflow-hidden h-72 bg-secondary flex items-center">
            <div className="flex-1 p-10 flex flex-col justify-center z-10">
              <h3 className="text-2xl font-bold text-primary mb-3 leading-tight">Our products bring comfort to your home</h3>
              <p className="text-muted-foreground text-sm mb-6">Quality equipment for every need.</p>
              <Link to="/shop" className="inline-flex items-center justify-center w-fit px-6 py-3 bg-sky-500 text-white text-sm font-bold uppercase tracking-wider hover:bg-sky-600 transition-colors">
                Learn More
              </Link>
            </div>
            <div className="w-2/5 h-full flex-shrink-0 hidden md:block">
              <img src="/images/air-conditioner.jpg" alt="Our products" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
         
         
        </div>
      </section>

      {/* Gallery Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 h-64 overflow-hidden">
        {["/images/welding.jpg", "/images/hero-kitchen.jpg", "/images/installation-service.jpg", "/images/workshop.jpg"].map((img, i) => (
          <div key={i} className="overflow-hidden h-full">
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </section>

      <Footer variant="home" />
    </div>
  );
};

export default Index;
