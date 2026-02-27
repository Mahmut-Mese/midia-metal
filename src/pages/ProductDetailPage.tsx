import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, Search, Minus, Plus } from "lucide-react";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const allProducts = [
  {
    id: 1,
    name: "Baffle Grease Filters",
    price: "£1,000.00",
    image: "/images/baffle-filter.jpg",
    category: "Filters",
    desc: "Dicta sunt explicabo. Nemo enim ipsam voluptatem voluptas sit odit aut fugit, sed quia consequuntur. Lorem ipsum dolor. Aquia sit amet, elitr, sed diam nonum eirmod tempor invidunt labore et dolore magna aliquyam.erat, sed diam voluptua. At vero accusam et justo duo dolores et ea rebum.\n\nAqua sit amet, elitr, sed diam nonum eirmod tempor invidunt labore et dolore magna aliquyam.erat, sed diam voluptua. At vero accusam et justo duo dolores et ea rebum. Stet clitain vidunt ut labore eirmod tempor invidunt magna aliquyam."
  },
  { id: 2, name: "Mesh Grease Filters", price: "£830.00", image: "/images/canopy.jpg", category: "Filters", desc: "Industrial mesh grease filters for commercial kitchens." },
  { id: 3, name: "Stainless Steel Gridmesh Style Grease Filters", price: "£800.00", image: "/images/air-conditioner.jpg", category: "Filters", desc: "High quality stainless steel gridmesh style grease filters." },
  { id: 4, name: "Canopy Grease Filter Cleaning Tank and Crystals", price: "£700.00", image: "/images/centrifugal-fan.jpg", category: "Cleaning", desc: "Effective cleaning tank and crystals for canopy grease filters." },
  { id: 5, name: "Wall Cladding Sheets", price: "£900.00", image: "/images/wall-cladding.jpg", category: "Sheets", desc: "Stainless steel wall cladding sheets." },
  { id: 6, name: "Ventilation Fan", price: "£700.00", image: "/images/centrifugal-fan.jpg", category: "Ventilation", desc: "Industrial ventilation fan unit." },
];

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"description" | "reviews">("description");
  const product = allProducts.find((p) => p.id === Number(id)) || allProducts[0];
  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="relative bg-secondary rounded-lg overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" />
            <button className="absolute top-4 right-4 w-8 h-8 bg-background rounded-full flex items-center justify-center shadow">
              <Search className="w-4 h-4 text-primary" />
            </button>
          </div>

          {/* Info */}
          <div>
            <h1 className="text-4xl font-serif font-bold text-primary mb-4">{product.name}</h1>
            <p className="text-2xl text-orange font-bold mb-8">{product.price}</p>
            <div className="space-y-4 mb-8">
              {product.desc.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-[15px] text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="flex items-center gap-4 mb-10">
              <div className="flex items-center border border-border rounded bg-[#f8f9fa]">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-3 text-muted-foreground hover:text-primary transition-colors"><Minus className="w-3 h-3" /></button>
                <span className="px-4 py-3 text-[15px] font-medium text-primary border-x border-border min-w-[50px] text-center">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-3 text-muted-foreground hover:text-primary transition-colors"><Plus className="w-3 h-3" /></button>
              </div>
              <button
                onClick={() => navigate("/cart")}
                className="bg-orange hover:bg-orange-hover text-white px-10 py-4 rounded text-[15px] font-bold flex items-center gap-3 transition-colors"
              >
                <Search className="w-4 h-4" /> {/* Should be a cart icon technically, but using search as per design mockup's icon appearance if it looks like that, wait, design shows a shopping cart icon */}
                <span className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                  Buy now
                </span>
              </button>
              <button className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-orange hover:border-orange hover:text-white transition-all text-primary group">
                <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="space-y-3 text-[14px]">
              <p><span className="font-bold text-primary">Category:</span> <span className="text-muted-foreground">{product.category}</span></p>
              <p><span className="font-bold text-primary">Tags:</span> <span className="text-muted-foreground">Available, Item, New, Simple, Smart, Stock</span></p>
              <p><span className="font-bold text-primary">Product ID:</span> <span className="text-muted-foreground">22256</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="container mx-auto px-4 lg:px-8 pb-16">
        <div className="flex border-b border-border mb-10 overflow-x-auto">
          <button
            onClick={() => setTab("description")}
            className={`px-8 py-4 text-sm font-bold uppercase tracking-[0.15em] border-b-2 transition-all whitespace-nowrap ${tab === "description" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-primary"}`}
          >
            Description
          </button>
          <button
            onClick={() => setTab("reviews")}
            className={`px-8 py-4 text-sm font-bold uppercase tracking-[0.15em] border-b-2 transition-all whitespace-nowrap ${tab === "reviews" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-primary"}`}
          >
            Reviews (0)
          </button>
        </div>
        <div className="animate-fade-in">
          {tab === "description" && (
            <div className="space-y-6 max-w-4xl">
              {product.desc.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-[15px] text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
          {tab === "reviews" && (
            <p className="text-[15px] text-muted-foreground">No reviews yet.</p>
          )}
        </div>
      </section>

      {/* Related */}
      <section className="container mx-auto px-4 lg:px-8 pb-20">
        <h2 className="text-4xl font-serif font-bold text-primary mb-12">Related products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {related.map((p) => (
            <Link to={`/shop/${p.id}`} key={p.id} className="group cursor-pointer">
              <div className="bg-secondary rounded overflow-hidden mb-5">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="font-sans text-lg font-bold text-primary mb-2 group-hover:text-orange transition-colors">{p.name}</h3>
              <p className="text-muted-foreground font-medium">{p.price}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
