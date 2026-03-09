import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiFetch } from "@/lib/api";

const CategoryPage = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [catDetail, prodsRes] = await Promise.all([
          apiFetch(`/v1/product-categories/${slug}`),
          apiFetch(`/v1/products?category=${slug}`)
        ]);
        setCategory(catDetail);
        setProducts(prodsRes.data || []);
      } catch (err) {
        console.error("Failed to load category data", err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-24 text-center">
          <p className="text-[#6e7a92]">Loading...</p>
        </section>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20">
          <h1 className="font-sans text-[44px] font-semibold text-[#10275c] mb-4">Category Not Found</h1>
          <Link to="/shop" className="text-orange underline">
            Back to shop
          </Link>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="pt-16 md:pt-24 pb-10 md:pb-14 text-center">
        <h1 className="font-sans text-[46px] md:text-[64px] leading-none font-semibold text-[#10275c]">{category.title}</h1>
        <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-16 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-8 md:gap-10 items-center">
          <div className="bg-[#f4f5f7]">
            <img src={category.image} alt={category.title} className="w-full h-[280px] md:h-[420px] object-cover" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#10275c] mb-4">Category Overview</p>
            <h2 className="font-sans text-[34px] md:text-[48px] leading-[0.96] font-semibold text-[#10275c] mb-5">{category.title}</h2>
            <p className="text-[15px] leading-8 text-[#6f7c95]">{category.description}</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-24">
        <h3 className="font-sans text-[34px] md:text-[46px] leading-none font-semibold text-[#10275c] mb-8">Products</h3>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 md:gap-x-8 gap-y-10">
            {products.map((product) => (
              <Link to={`/shop/${product.slug || product.id}`} key={product.id} className="group">
                <div className="bg-[#f7f8fa] mb-4">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full aspect-square object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <h4 className="font-sans text-[18px] md:text-[20px] leading-tight font-semibold text-primary group-hover:text-orange transition-colors">
                  {product.name}
                </h4>
                <p className="text-[16px] md:text-[20px] text-[#5e6e8c] mt-2">{product.price}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 px-6 border border-[#cfd8e6] bg-[#f4f5f7] text-[#6f7c95]">
            No products found for this category.
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default CategoryPage;
