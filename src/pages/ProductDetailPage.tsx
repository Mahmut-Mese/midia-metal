import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, Search, ShoppingCart, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "sonner";

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"description" | "reviews">("description");

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, relRes] = await Promise.all([
          apiFetch(`/v1/products/${id}`),
          apiFetch(`/v1/products?limit=3`)
        ]);
        setProduct(prodRes);
        setRelated(relRes.data.filter((p: any) => p.id !== prodRes.id).slice(0, 3));
      } catch (err) {
        console.error("Failed to load product", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20 text-center">
          <p className="text-[#6e7a92]">Loading...</p>
        </section>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20 text-center">
          <h1 className="text-3xl font-bold">Product not found.</h1>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="container mx-auto px-4 lg:px-8 pt-12 md:pt-14 pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-[56%_44%] gap-10 xl:gap-12 items-start">
          <div className="relative">
            <img src={product.image} alt={product.name} className="w-full aspect-square object-contain" />
            <button className="absolute right-2 md:right-4 top-1/3 w-11 h-11 rounded-full bg-[#f8fafc] text-primary grid place-items-center border border-[#d2dbe8]">
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="pt-2">
            <h1 className="font-sans text-[30px] md:text-[40px] leading-[1] font-semibold text-[#10275c]">{product.name}</h1>
            <p className="text-orange text-[28px] md:text-[34px] leading-none font-medium mt-3 mb-7">{product.price}</p>

            <div className="space-y-4 mb-8">
              {(product.description || "").split("\n\n").map((paragraph: string, index: number) => (
                <p key={index} className="text-[13px] md:text-[14px] text-[#6e7a92] leading-7">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap mb-8">
              <div className="w-[118px] h-[50px] border border-[#cad4e4] flex items-center px-5 bg-[#eaf0f3]">
                <span className="text-base text-primary">{qty}</span>
                <div className="ml-auto flex flex-col">
                  <button onClick={() => setQty(qty + 1)} className="text-[#7f8ca5] hover:text-primary">
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="text-[#7f8ca5] hover:text-primary">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  addToCart(product, qty);
                  toast.success("Added to cart!");
                  navigate("/cart");
                }}
                className="h-[50px] px-10 bg-orange text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-orange-hover transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy now
              </button>

              <button
                onClick={() => {
                  if (isInWishlist(product.id)) {
                    removeFromWishlist(product.id);
                    toast.success("Removed from wishlist");
                  } else {
                    addToWishlist({ id: product.id, name: product.name, price: product.price, image: product.image });
                    toast.success("Added to wishlist!");
                  }
                }}
                className={`w-[50px] h-[50px] rounded-full border transition-colors grid place-items-center ${isInWishlist(product.id) ? 'bg-red-50 border-orange text-orange' : 'border-[#d1dbe8] text-[#7f8ca5] hover:text-orange hover:border-orange'}`}
                title={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-orange' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 text-[12px] md:text-[14px]">
              <p>
                <span className="font-semibold text-primary">Category:</span>{" "}
                <span className="text-[#6e7a92]">{product.category?.name || "Uncategorized"}</span>
              </p>
              <p>
                <span className="font-semibold text-primary">Tags:</span>{" "}
                <span className="text-[#6e7a92]">{(product.tags || []).join(", ") || "None"}</span>
              </p>
              <p>
                <span className="font-semibold text-primary">Product ID:</span>{" "}
                <span className="text-[#6e7a92]">{product.id}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-14">
        <div className="flex flex-wrap gap-0 mb-10">
          <button
            onClick={() => setTab("description")}
            className={`w-[170px] md:w-[220px] h-[48px] md:h-[52px] text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${tab === "description"
              ? "bg-[#f4f5f7] text-primary border-t-2 border-primary"
              : "bg-[#f4f5f7] text-primary/70 hover:text-primary"
              }`}
          >
            Description
          </button>
          <button
            onClick={() => setTab("reviews")}
            className={`w-[170px] md:w-[220px] h-[48px] md:h-[52px] text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${tab === "reviews"
              ? "bg-[#f4f5f7] text-primary border-t-2 border-primary"
              : "bg-[#f4f5f7] text-primary/70 hover:text-primary"
              }`}
          >
            Reviews (0)
          </button>
        </div>

        {tab === "description" ? (
          <div className="max-w-[1450px]">
            <p className="text-[13px] md:text-[14px] text-[#6e7a92] leading-7 whitespace-pre-wrap">
              {product.description || "No description provided."}
            </p>
          </div>
        ) : (
          <p className="text-[15px] text-[#6e7a92]">No reviews yet.</p>
        )}
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-24">
        <h2 className="font-sans text-[34px] md:text-[46px] leading-none font-semibold text-[#10275c] mb-10">Related products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {related.map((p) => (
            <Link to={`/shop/${p.id}`} key={p.id} className="group">
              <div className="mb-5 bg-[#f7f8fa]">
                <img src={p.image} alt={p.name} className="w-full aspect-[1.02] object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              </div>
              <h3 className="font-sans text-[18px] md:text-[26px] leading-tight font-semibold text-primary group-hover:text-orange transition-colors">
                {p.name}
              </h3>
              <p className="text-[18px] md:text-[26px] leading-none text-[#1f2f52] mt-3">{p.price}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
      <FloatingSidebar />
    </div>
  );
};

export default ProductDetailPage;
