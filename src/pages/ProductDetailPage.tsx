import { useParams, Link } from "react-router-dom";
import { Heart, Search, Minus, Plus } from "lucide-react";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const allProducts = [
  { id: 1, name: "Baffle Grease Filters", price: "£1,000.00", image: "/images/baffle-filter.jpg", category: "Filters", desc: "Dicta sunt explicabo. Nemo enim ipsam voluptatem voluptas sit odit aut fugit, sed quia consequuntur. Lorem ipsum dolor. Aquia sit amet, elitr, sed diam nonum eirmod tempor invidunt labore et dolore magna aliquyam.erat, sed diam voluptua. At vero accusam et justo duo dolores et ea rebum." },
  { id: 2, name: "Canopy", price: "£800.00", image: "/images/canopy.jpg", category: "Canopies", desc: "High quality stainless steel canopy for commercial kitchens." },
  { id: 3, name: "Air Conditioner", price: "£700.00", image: "/images/air-conditioner.jpg", category: "HVAC", desc: "Modern split system air conditioning unit." },
  { id: 4, name: "Centrifugal Fan", price: "£830.00", image: "/images/centrifugal-fan.jpg", category: "Ventilation", desc: "Industrial centrifugal fan for ventilation systems." },
  { id: 5, name: "Wall Cladding Sheets", price: "£900.00", image: "/images/wall-cladding.jpg", category: "Sheets", desc: "Stainless steel wall cladding sheets." },
  { id: 6, name: "Ventilation Fan", price: "£700.00", image: "/images/centrifugal-fan.jpg", category: "Ventilation", desc: "Industrial ventilation fan unit." },
];

const ProductDetailPage = () => {
  const { id } = useParams();
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
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">{product.name}</h1>
            <p className="text-2xl text-orange font-bold mb-6">{product.price}</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{product.desc}</p>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-border rounded">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-primary"><Minus className="w-4 h-4" /></button>
                <span className="px-3 py-2 text-sm font-semibold text-primary">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-primary"><Plus className="w-4 h-4" /></button>
              </div>
              <button className="btn-primary flex items-center gap-2">
                🛒 Buy now
              </button>
              <button className="w-10 h-10 border border-border rounded flex items-center justify-center hover:border-orange transition-colors">
                <Heart className="w-4 h-4 text-primary" />
              </button>
            </div>

            <div className="space-y-1 text-sm">
              <p><span className="font-semibold text-primary">Category:</span> <span className="text-muted-foreground">{product.category}</span></p>
              <p><span className="font-semibold text-primary">Tags:</span> <span className="text-orange">Available, Item, New, Simple, Smart, Stock</span></p>
              <p><span className="font-semibold text-primary">Product ID:</span> <span className="text-muted-foreground">22256</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="container mx-auto px-4 lg:px-8 pb-16">
        <div className="flex gap-0 border-b border-border mb-8">
          <button
            onClick={() => setTab("description")}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === "description" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            Description
          </button>
          <button
            onClick={() => setTab("reviews")}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === "reviews" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            Reviews (0)
          </button>
        </div>
        {tab === "description" && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{product.desc}</p>
        )}
        {tab === "reviews" && (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        )}
      </section>

      {/* Related */}
      <section className="container mx-auto px-4 lg:px-8 pb-16">
        <h2 className="section-title mb-8">Related products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {related.map((p) => (
            <Link to={`/shop/${p.id}`} key={p.id} className="product-card">
              <div className="bg-secondary rounded-lg overflow-hidden mb-3">
                <img src={p.image} alt={p.name} />
              </div>
              <h3 className="font-sans text-sm font-semibold text-primary">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.price}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
