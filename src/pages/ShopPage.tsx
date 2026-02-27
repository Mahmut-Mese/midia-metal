import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ArrowRight, Search, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

const products = [
  { id: 1, name: "Baffel Filter", price: "£1,000.00", image: "/images/baffle-filter.jpg", category: "Baffle Filters", tags: ["New", "Stock"] },
  { id: 2, name: "Canopy", price: "£800.00", image: "/images/canopy.jpg", category: "Canopies", tags: ["Sale", "Stock"] },
  { id: 3, name: "Air Conditioner", price: "£700.00", image: "/images/air-conditioner.jpg", category: "Mesh Filters", tags: ["Available"] },
  { id: 4, name: "Centrifugal Fan", price: "£830.00", image: "/images/centrifugal-fan-square.png", category: "Mesh Filters", tags: ["Simple", "Smart"] },
  { id: 5, name: "Aluminium Conveyor Feet Commercial Kitchens", price: "£900.00", image: "/images/conveyor-feet.png", category: "Stainless Steel Sheets", tags: ["Variable", "Discount"] },
  { id: 6, name: "Ventilation Fan", price: "£700.00", image: "/images/ventilation-fan-circular.png", category: "Mesh Filters", tags: ["Item", "Simple"] },
];

const categories = [
  { name: "Baffle Filters", count: 8 },
  { name: "Canopies", count: 1 },
  { name: "Cutting Disks", count: 1 },
  { name: "LED Lights", count: 10 },
  { name: "Mesh Filters", count: 4 },
  { name: "Stainless Steel Sheets", count: 4 },
];

const tagsList = ["Available", "Discount", "Item", "New", "Sale", "Simple", "Smart", "Stock", "Variable"];

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("latest");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category"));
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);

  // Sync searchQuery and selectedCategory state with URL params if they change externally
  useEffect(() => {
    const query = searchParams.get("search") || "";
    if (query !== searchQuery) {
      setSearchQuery(query);
    }

    const category = searchParams.get("category");
    if (category !== selectedCategory) {
      setSelectedCategory(category);
    }
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set("search", value);
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    const newParams = new URLSearchParams(searchParams);
    if (category) {
      newParams.set("category", category);
    } else {
      newParams.delete("category");
    }
    setSearchParams(newParams, { replace: true });
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter((p) =>
        selectedTags.some((tag) => p.tags.includes(tag))
      );
    }

    // Price filter
    result = result.filter((p) => {
      const price = parseFloat(p.price.replace(/[£,]/g, ""));
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sorting
    result.sort((a, b) => {
      const priceA = parseFloat(a.price.replace(/[£,]/g, ""));
      const priceB = parseFloat(b.price.replace(/[£,]/g, ""));

      if (sortBy === "price-low") return priceA - priceB;
      if (sortBy === "price-high") return priceB - priceA;
      return b.id - a.id; // "latest"
    });

    return result;
  }, [searchQuery, selectedCategory, selectedTags, priceRange, sortBy]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedTags([]);
    setPriceRange([0, 2000]);
    setSortBy("latest");
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <section className="py-16 text-center border-b border-border/50">
        <h1 className="page-title text-5xl font-serif font-bold text-primary mb-4">Shop</h1>
        <ChevronDown className="w-6 h-6 mx-auto text-muted-foreground animate-bounce" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
          {/* Main Content */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 bg-secondary/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">
                Showing {filteredProducts.length} results
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-border rounded-md px-4 py-2 text-sm bg-background hover:border-orange transition-colors focus:ring-2 focus:ring-orange/20 outline-none"
                >
                  <option value="latest">Latest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {(searchQuery || selectedCategory || selectedTags.length > 0 || priceRange[0] > 0 || priceRange[1] < 2000) && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-xs font-bold uppercase text-muted-foreground">Active Filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange/10 text-orange rounded-full text-xs font-semibold">
                    Search: {searchQuery}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => handleSearchChange("")} />
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange/10 text-orange rounded-full text-xs font-semibold">
                    Category: {selectedCategory}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => handleCategoryChange(null)} />
                  </span>
                )}
                {selectedTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-orange/10 text-orange rounded-full text-xs font-semibold">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleTag(tag)} />
                  </span>
                ))}
                {(priceRange[0] > 0 || priceRange[1] < 2000) && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange/10 text-orange rounded-full text-xs font-semibold">
                    Price: £{priceRange[0]} - £{priceRange[1]}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceRange([0, 2000])} />
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs font-bold text-primary hover:text-orange underline underline-offset-4 transition-colors ml-2"
                >
                  Clear All
                </button>
              </div>
            )}

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredProducts.map((p) => (
                  <Link to={`/shop/${p.id}`} key={p.id} className="group">
                    <div className="bg-secondary rounded-xl overflow-hidden mb-4 relative aspect-[4/3]">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                      {p.tags.includes("New") && (
                        <span className="absolute top-4 left-4 bg-orange text-white text-[10px] font-bold px-2 py-1 rounded">NEW</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[12px] text-orange font-bold tracking-widest uppercase">{p.category}</p>
                      <h3 className="font-serif text-xl font-bold text-primary group-hover:text-orange transition-colors">{p.name}</h3>
                      <p className="text-lg font-bold text-primary/80">{p.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-secondary/20 rounded-2xl border-2 border-dashed border-border/50">
                <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold text-primary mb-2">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters to find what you're looking for.</p>
                <button
                  onClick={clearFilters}
                  className="mt-6 btn-primary px-8 py-3"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {filteredProducts.length > 0 && (
              <div className="flex items-center gap-3 mt-12">
                <span className="w-10 h-10 bg-primary text-primary-foreground text-sm flex items-center justify-center rounded-lg font-bold shadow-lg shadow-primary/20">1</span>
                <span className="w-10 h-10 text-primary text-sm flex items-center justify-center rounded-lg font-bold hover:bg-secondary transition-colors cursor-pointer border border-border">2</span>
                <span className="w-10 h-10 text-primary text-sm flex items-center justify-center rounded-lg font-bold hover:bg-secondary transition-colors cursor-pointer border border-border">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-10">
            {/* Search */}
            <div className="bg-secondary/20 p-6 rounded-2xl border border-border/50">
              <h3 className="text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2">
                Search
                <div className="h-[2px] w-8 bg-orange" />
              </h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background pr-12 focus:border-orange transition-colors focus:ring-2 focus:ring-orange/10 outline-none shadow-sm"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
              </div>
            </div>

            {/* Categories */}
            <div className="bg-secondary/20 p-6 rounded-2xl border border-border/50">
              <h3 className="text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2">
                Categories
                <div className="h-[2px] w-8 bg-orange" />
              </h3>
              <ul className="space-y-3">
                <li
                  onClick={() => handleCategoryChange(null)}
                  className={cn(
                    "flex items-center justify-between text-[15px] cursor-pointer transition-all hover:translate-x-1",
                    !selectedCategory ? "text-orange font-bold" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", !selectedCategory ? "bg-orange" : "bg-muted-foreground/30")} />
                    All Categories
                  </span>
                  <span className="text-[12px] opacity-60">({products.length})</span>
                </li>
                {categories.map((c) => (
                  <li
                    key={c.name}
                    onClick={() => handleCategoryChange(c.name)}
                    className={cn(
                      "flex items-center justify-between text-[15px] cursor-pointer transition-all hover:translate-x-1",
                      selectedCategory === c.name ? "text-orange font-bold" : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", selectedCategory === c.name ? "bg-orange" : "bg-muted-foreground/30")} />
                      {c.name}
                    </span>
                    <span className="text-[12px] opacity-60">({c.count})</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price Filter */}
            <div className="bg-secondary/20 p-6 rounded-2xl border border-border/50">
              <h3 className="text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2">
                Filter by Price
                <div className="h-[2px] w-8 bg-orange" />
              </h3>
              <div className="space-y-6">
                <Slider
                  defaultValue={[0, 2000]}
                  max={2000}
                  step={50}
                  value={[priceRange[0], priceRange[1]]}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  className="my-8"
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-primary">
                    Price: <span className="text-orange">£{priceRange[0]} — £{priceRange[1]}</span>
                  </p>
                  <button className="bg-primary text-white text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange transition-colors">
                    FILTER <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-secondary/20 p-6 rounded-2xl border border-border/50">
              <h3 className="text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2">
                Popular Tags
                <div className="h-[2px] w-8 bg-orange" />
              </h3>
              <div className="flex flex-wrap gap-2">
                {tagsList.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all",
                      selectedTags.includes(tag)
                        ? "bg-orange border-orange text-white shadow-lg shadow-orange/20"
                        : "border-border text-muted-foreground hover:border-orange hover:text-orange bg-background"
                    )}
                  >
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
