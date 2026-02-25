import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const products = [
  { id: 1, name: "Baffel Filter", price: "£1,000.00", image: "/images/baffle-filter.jpg", category: "Baffle Filters" },
  { id: 2, name: "Canopy", price: "£800.00", image: "/images/canopy.jpg", category: "Canopies" },
  { id: 3, name: "Air Conditioner", price: "£700.00", image: "/images/air-conditioner.jpg", category: "Mesh Filters" },
  { id: 4, name: "Centrifugal Fan", price: "£830.00", image: "/images/centrifugal-fan.jpg", category: "Mesh Filters" },
  { id: 5, name: "Wall Cladding Sheets", price: "£900.00", image: "/images/wall-cladding.jpg", category: "Stainless Steel Sheets" },
  { id: 6, name: "Ventilation Fan", price: "£700.00", image: "/images/centrifugal-fan.jpg", category: "Mesh Filters" },
];

const categories = [
  { name: "Baffle Filters", count: 8 },
  { name: "Canopies", count: 1 },
  { name: "Cutting Disks", count: 1 },
  { name: "LED Lights", count: 0 },
  { name: "Mesh Filters", count: 4 },
  { name: "Stainless Steel Sheets", count: 4 },
];

const tags = ["Available", "Discount", "Item", "New", "Sale", "Simple", "Smart", "Stock", "Variable"];

const ShopPage = () => {
  const [sortBy, setSortBy] = useState("latest");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-16 text-center">
        <h1 className="page-title">Shop</h1>
        <ChevronDown className="w-6 h-6 mx-auto mt-4 text-muted-foreground" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">Showing 1–6 of 12 results</p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
              >
                <option value="latest">Sort by latest</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {products.map((p) => (
                <Link to={`/shop/${p.id}`} key={p.id} className="product-card">
                  <div className="bg-secondary rounded-lg overflow-hidden mb-3">
                    <img src={p.image} alt={p.name} />
                  </div>
                  <h3 className="font-sans text-sm font-semibold text-primary hover:text-orange transition-colors">{p.name}</h3>
                  <p className="text-sm text-orange font-semibold mt-1">{p.price}</p>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-8">
              <span className="w-8 h-8 bg-primary text-primary-foreground text-sm flex items-center justify-center rounded font-semibold">1</span>
              <span className="w-8 h-8 text-primary text-sm flex items-center justify-center rounded font-semibold hover:bg-secondary cursor-pointer">2</span>
              <span className="w-8 h-8 text-primary text-sm flex items-center justify-center rounded font-semibold hover:bg-secondary cursor-pointer">
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            {/* Cart */}
            <div className="bg-secondary rounded-lg p-5">
              <h3 className="font-sans font-bold text-primary mb-2">Cart</h3>
              <p className="text-sm text-muted-foreground">No products in the cart.</p>
            </div>

            {/* Search */}
            <div>
              <h3 className="font-sans font-bold text-primary mb-3">Search</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for products..."
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-background pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-sans font-bold text-primary mb-3">Categories</h3>
              <ul className="space-y-2">
                {categories.map((c) => (
                  <li key={c.name} className="text-sm text-muted-foreground hover:text-orange cursor-pointer transition-colors">
                    • {c.name} ({c.count})
                  </li>
                ))}
              </ul>
            </div>

            {/* Price Filter */}
            <div>
              <h3 className="font-sans font-bold text-primary mb-3">Filter</h3>
              <div className="h-1 bg-border rounded mb-3 relative">
                <div className="absolute h-full bg-orange rounded" style={{ left: '5%', width: '80%' }} />
              </div>
              <p className="text-sm text-muted-foreground mb-3">Price: $50 — $2,000</p>
              <button className="btn-primary text-xs px-4 py-2 flex items-center gap-1">
                Filter <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Tags */}
            <div>
              <h3 className="font-sans font-bold text-primary mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 border border-border rounded text-xs text-muted-foreground hover:border-orange hover:text-orange cursor-pointer transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ShopPage;
