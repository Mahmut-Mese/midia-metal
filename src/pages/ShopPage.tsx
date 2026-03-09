import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ArrowRight, Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { apiFetch } from "@/lib/api";

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("latest");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category"));
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [catsRes, tagsRes] = await Promise.all([
        apiFetch("/v1/product-categories"),
        apiFetch("/v1/products/tags")
      ]);
      setCategories(catsRes || []);
      setTags(tagsRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory, selectedTags, sortBy, priceRange]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Construct tag query parameter if multiple tags are selected
      const tagQuery = selectedTags.length > 0 ? `&tag=${selectedTags[0]}` : "";
      const res = await apiFetch(`/v1/products?search=${searchQuery}&category=${selectedCategory || ""}${tagQuery}`);

      let fetchedProducts = res.data || [];

      // Manual filtering for price since we don't have it on backend index yet
      fetchedProducts = fetchedProducts.filter((p: any) => {
        const price = parseFloat(p.price.toString().replace(/[^\d.]/g, ""));
        return price >= priceRange[0] && price <= priceRange[1];
      });

      // Sorting
      fetchedProducts.sort((a: any, b: any) => {
        const priceA = parseFloat(a.price.toString().replace(/[^\d.]/g, ""));
        const priceB = parseFloat(b.price.toString().replace(/[^\d.]/g, ""));
        if (sortBy === "price-low") return priceA - priceB;
        if (sortBy === "price-high") return priceB - priceA;
        return 0;
      });

      setProducts(fetchedProducts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = searchParams.get("search") || "";
    if (query !== searchQuery) setSearchQuery(query);

    const category = searchParams.get("category");
    if (category !== selectedCategory) setSelectedCategory(category);
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set("search", value);
    else newParams.delete("search");
    setSearchParams(newParams, { replace: true });
  };

  const handleCategoryChange = (categorySlug: string | null) => {
    setSelectedCategory(categorySlug);
    const newParams = new URLSearchParams(searchParams);
    if (categorySlug) newParams.set("category", categorySlug);
    else newParams.delete("category");
    setSearchParams(newParams, { replace: true });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="min-h-screen bg-[#eaf0f3] text-foreground">
      <Header />

      <section className="pt-16 md:pt-24 pb-16 md:pb-20 text-center">
        <h1 className="font-sans text-[52px] md:text-[68px] leading-none font-semibold text-[#10275c]">Shop</h1>
        <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-24">
        <div className="shop-layout grid gap-6 md:gap-8 lg:gap-10 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_370px]">
          <div>
            <div className="flex items-center justify-between mb-8">
              <p className="text-[13px] text-[#9aa6bc]">Showing {products.length} results</p>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-transparent pr-8 text-[14px] font-semibold text-primary outline-none"
                >
                  <option value="latest">Sort by latest</option>
                  <option value="price-low">Sort by price: low to high</option>
                  <option value="price-high">Sort by price: high to low</option>
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/80 pointer-events-none" />
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-[#6e7a92] bg-[#f4f5f7] border border-[#d5deea]">Loading products...</div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-9">
                  {products.map((p) => (
                    <Link to={`/shop/${p.slug}`} key={p.id} className="group">
                      <div className="bg-[#f7f8fa] mb-4">
                        <img src={p.image} alt={p.name} className="w-full aspect-square object-contain transition-transform duration-300 group-hover:scale-[1.02]" />
                      </div>
                      <h3 className="font-sans text-[16px] md:text-[20px] leading-tight font-semibold text-primary group-hover:text-orange transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-[14px] md:text-[20px] text-[#5e6e8c] mt-1">{p.price}</p>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-[#6e7a92] bg-[#f4f5f7] border border-[#d5deea]">
                No products found.
              </div>
            )}
          </div>

          <aside className="bg-[#f4f5f7] p-6 md:p-8 h-fit lg:self-start">
            <div className="space-y-8">
              <div>
                <h3 className="text-[16px] leading-none font-semibold text-primary mb-5 font-sans">Search</h3>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a95ac]" />
                  <input
                    type="text"
                    placeholder="Search for products ..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full h-12 border border-[#d1dbe8] bg-transparent pl-12 pr-4 text-[14px] text-primary placeholder:text-[#9aa6bc] outline-none"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-[16px] leading-none font-semibold text-primary mb-5 font-sans">Categories</h3>
                <ul className="space-y-3">
                  {categories.map((c: any) => (
                    <li key={c.id}>
                      <button
                        onClick={() => handleCategoryChange(selectedCategory === c.slug ? null : c.slug)}
                        className={cn(
                          "text-[15px] inline-flex items-center gap-2 transition-colors",
                          selectedCategory === c.slug ? "text-orange font-semibold" : "text-primary hover:text-orange",
                        )}
                      >
                        <span className="text-[8px]">•</span>
                        {c.name} ({c.products_count})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-[16px] leading-none font-semibold text-primary mb-5 font-sans">Filter</h3>
                <div className="h-1 bg-orange mb-4" />
                <Slider
                  defaultValue={[50, 2000]}
                  min={50}
                  max={2000}
                  step={50}
                  value={[priceRange[0], priceRange[1]]}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                />
                <p className="text-[15px] text-[#9aa6bc] mt-5">Price: £{priceRange[0]} — £{priceRange[1]}</p>
                <button
                  onClick={loadProducts}
                  className="mt-5 h-10 px-8 bg-orange text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-[#d4500b] transition-colors"
                >
                  Filter
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div>
                <h3 className="text-[16px] leading-none font-semibold text-primary mb-5 font-sans">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "h-8 px-4 border text-[12px] transition-colors",
                        selectedTags.includes(tag)
                          ? "bg-orange text-white border-orange"
                          : "border-[#d1dbe8] text-[#6e7a92] hover:text-orange hover:border-orange",
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
      <FloatingSidebar />
    </div>
  );
};

export default ShopPage;
