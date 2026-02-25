import { Link } from "react-router-dom";
import { Gift, Percent, Truck, DollarSign, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const features = [
  { icon: Gift, title: "Reward program", desc: "Lorem ipsum" },
  { icon: Percent, title: "Special discounts", desc: "Lorem ipsum" },
  { icon: Truck, title: "Fast shipping", desc: "Lorem ipsum" },
  { icon: DollarSign, title: "Great Prices", desc: "Lorem ipsum" },
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
      <section className="relative h-[400px] md:h-[500px] overflow-hidden">
        <img
          src="/images/hero-kitchen.jpg"
          alt="Commercial kitchen ventilation"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/30" />
        <div className="absolute right-4 bottom-4 flex gap-2">
          <button className="w-10 h-10 bg-primary flex items-center justify-center text-primary-foreground hover:bg-navy-light transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 bg-primary flex items-center justify-center text-primary-foreground hover:bg-navy-light transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Features Bar */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <f.icon className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <p className="font-sans font-semibold text-sm text-primary">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
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
            <div key={i} className="category-card">
              <img src={cat.image} alt={cat.name} />
              <div className="overlay">
                <p className="text-primary-foreground font-semibold text-sm">{cat.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Items */}
      <section className="container mx-auto px-4 lg:px-8 py-12">
        <p className="section-label text-center">OUR CATALOG</p>
        <h2 className="section-title text-center mb-10">Trending items</h2>
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
                <span className="text-sm text-muted-foreground">{item.price}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative rounded-lg overflow-hidden h-64">
            <img src="/images/welding.jpg" alt="Installation services" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-orange/85 p-8 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-accent-foreground font-serif mb-2">Installation services</h3>
              <p className="text-accent-foreground/80 text-sm mb-4">Professional installation for all your equipment needs.</p>
              <Link to="/contact" className="inline-flex items-center gap-2 w-fit px-5 py-2.5 border border-accent-foreground text-accent-foreground text-sm font-semibold rounded hover:bg-accent-foreground hover:text-orange transition-colors">
                Request a Quote
              </Link>
            </div>
          </div>
          <div className="relative rounded-lg overflow-hidden h-64">
            <img src="/images/installation-service.jpg" alt="Our products" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-primary/85 p-8 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-primary-foreground font-serif mb-2">Our products bring comfort to your home</h3>
              <p className="text-primary-foreground/70 text-sm mb-4">Quality equipment for every need.</p>
              <Link to="/shop" className="btn-primary w-fit">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-8 flex-wrap justify-center">
            {["ELEVATE", "SPLENDOR", "DELT"].map((brand, i) => (
              <span key={i} className="text-xl font-bold text-muted-foreground/40 tracking-wider">{brand}</span>
            ))}
          </div>
          <h3 className="text-xl font-serif font-bold text-primary">We work with the<br />best brands</h3>
        </div>
      </section>

      {/* Gallery Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 h-48">
        {["/images/welding.jpg", "/images/hero-kitchen.jpg", "/images/installation-service.jpg", "/images/workshop.jpg"].map((img, i) => (
          <img key={i} src={img} alt="" className="w-full h-full object-cover" />
        ))}
      </section>

      <Footer variant="home" />
    </div>
  );
};

export default Index;
