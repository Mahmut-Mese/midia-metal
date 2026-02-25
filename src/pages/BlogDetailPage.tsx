import { useParams, Link } from "react-router-dom";
import { Calendar, User, ArrowLeft, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const blogPosts: Record<string, { title: string; image: string; date: string; author: string; category: string; content: string[] }> = {
  "importance-of-commercial-ventilation": {
    title: "The Importance of Commercial Kitchen Ventilation",
    image: "/images/hero-kitchen.jpg",
    date: "Feb 20, 2026",
    author: "Admin",
    category: "Ventilation",
    content: [
      "A well-designed ventilation system is the backbone of any commercial kitchen. Without proper airflow, kitchens can become dangerous environments filled with smoke, grease particles, and excessive heat.",
      "Building regulations in the UK require all commercial kitchens to have adequate ventilation systems. These systems must effectively remove cooking fumes, steam, and odours while maintaining a comfortable working temperature for staff.",
      "There are several key components to a commercial ventilation system: the canopy hood, grease filters, ductwork, and the extraction fan. Each of these components must be correctly sized and installed to ensure optimal performance.",
      "Regular maintenance is equally important. Grease build-up in filters and ducts is a significant fire hazard. We recommend cleaning baffle filters weekly and having the entire system professionally inspected at least twice a year.",
      "Investing in a quality ventilation system not only ensures regulatory compliance but also improves staff comfort, reduces energy costs, and extends the lifespan of your kitchen equipment.",
    ],
  },
  "choosing-right-grease-filters": {
    title: "Choosing the Right Grease Filters for Your Setup",
    image: "/images/baffle-filter.jpg",
    date: "Feb 15, 2026",
    author: "Admin",
    category: "Products",
    content: [
      "Grease filters are a critical component of any commercial kitchen extraction system. They capture grease particles before they enter the ductwork, preventing fire hazards and maintaining system efficiency.",
      "Baffle filters are constructed from multiple layers of formed metal that force airflow to change direction, causing grease particles to separate and drain into a collection tray. They are highly durable and dishwasher-safe.",
      "Mesh filters, on the other hand, use layers of aluminium or stainless steel mesh to trap grease. While more affordable, they require more frequent cleaning and replacement compared to baffle filters.",
      "For high-volume kitchens, we always recommend baffle filters due to their superior grease capture rate and longevity. They may cost more upfront, but the reduced maintenance and replacement costs make them the better long-term investment.",
    ],
  },
  "stainless-steel-wall-cladding-guide": {
    title: "A Complete Guide to Stainless Steel Wall Cladding",
    image: "/images/wall-cladding.jpg",
    date: "Feb 10, 2026",
    author: "Admin",
    category: "Guides",
    content: [
      "Stainless steel wall cladding is the preferred solution for areas where hygiene is paramount. Its smooth, non-porous surface resists bacteria growth and is easy to clean and maintain.",
      "In commercial kitchens, food processing plants, and hospital prep areas, stainless steel cladding provides a durable, fire-resistant wall covering that meets the strictest health and safety standards.",
      "Installation involves fixing panels directly to existing walls using specialist adhesive or mechanical fixings. Joints are sealed to prevent moisture ingress, creating a continuous hygienic surface.",
      "We supply cladding in various grades and finishes. Grade 304 is suitable for most kitchen applications, while Grade 316 is recommended for environments with exposure to corrosive chemicals or saltwater.",
    ],
  },
  "industrial-welding-techniques": {
    title: "Industrial Welding Techniques for Kitchen Equipment",
    image: "/images/welding.jpg",
    date: "Feb 5, 2026",
    author: "Admin",
    category: "Fabrication",
    content: [
      "Fabricating commercial kitchen equipment requires specialist welding skills and techniques. The choice of welding method depends on the material, joint type, and application.",
      "TIG (Tungsten Inert Gas) welding is the preferred method for stainless steel fabrication. It produces clean, precise welds with minimal distortion — essential for equipment that must be both functional and hygienic.",
      "MIG welding is used for thicker materials and larger structural components. It's faster than TIG but produces a wider weld bead. We use MIG welding for canopy frames and support brackets.",
      "All our welds are ground and polished to a smooth finish, eliminating crevices where bacteria could harbour. This attention to detail ensures our equipment meets food safety standards.",
    ],
  },
  "canopy-installation-tips": {
    title: "5 Tips for a Perfect Canopy Installation",
    image: "/images/canopy.jpg",
    date: "Jan 28, 2026",
    author: "Admin",
    category: "Installation",
    content: [
      "A kitchen canopy is only as good as its installation. Here are five tips to ensure your canopy performs optimally from day one.",
      "1. Correct sizing — The canopy should extend at least 150mm beyond the cooking equipment on all sides. Undersized canopies will fail to capture all cooking fumes.",
      "2. Proper height — Mount the canopy between 1.8m and 2.1m from the floor. Too high and it won't capture fumes effectively; too low and it becomes an obstruction.",
      "3. Adequate airflow — Ensure the extraction rate matches the cooking output. A professional calculation considering the type and volume of cooking is essential.",
      "4. Make-up air — For every cubic metre of air extracted, the same volume must be replaced. Failing to provide adequate make-up air creates negative pressure and drafts.",
      "5. Professional commissioning — Once installed, have the system balanced and commissioned by a qualified engineer to verify airflow rates and system performance.",
    ],
  },
  "exhaust-fan-maintenance": {
    title: "How to Maintain Your Exhaust Fan System",
    image: "/images/centrifugal-fan.jpg",
    date: "Jan 20, 2026",
    author: "Admin",
    category: "Maintenance",
    content: [
      "Your exhaust fan is the engine of your ventilation system. Regular maintenance is essential to keep it running efficiently and to prevent costly breakdowns.",
      "Check and clean fan blades monthly. Grease build-up on the blades causes imbalance, increased vibration, and premature bearing failure.",
      "Inspect drive belts quarterly if your fan uses a belt-drive system. Look for cracks, glazing, and proper tension. Replace belts at the first sign of wear.",
      "Lubricate bearings according to the manufacturer's schedule. Over-lubrication is just as harmful as under-lubrication, so follow the recommended quantities.",
      "Have a professional engineer inspect the complete system annually. They will check electrical connections, motor condition, vibration levels, and overall system performance.",
    ],
  },
};

const postKeys = Object.keys(blogPosts);

const BlogDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? blogPosts[slug] : null;

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="page-title mb-4">Post Not Found</h1>
          <Link to="/blog" className="btn-primary">Back to Blog</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const currentIndex = slug ? postKeys.indexOf(slug) : -1;
  const prevSlug = currentIndex > 0 ? postKeys[currentIndex - 1] : null;
  const nextSlug = currentIndex < postKeys.length - 1 ? postKeys[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <span className="bg-orange text-accent-foreground text-xs font-bold px-3 py-1 rounded mb-4 inline-block">
              {post.category}
            </span>
            <h1 className="text-2xl md:text-4xl font-serif font-bold text-primary-foreground max-w-2xl">{post.title}</h1>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-primary-foreground/70">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 lg:px-8 py-12 max-w-3xl">
        <div className="space-y-5">
          {post.content.map((para, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{para}</p>
          ))}
        </div>

        {/* Nav */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-border">
          {prevSlug ? (
            <Link to={`/blog/${prevSlug}`} className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-orange transition-colors">
              <ArrowLeft className="w-4 h-4" /> Previous Post
            </Link>
          ) : <span />}
          {nextSlug ? (
            <Link to={`/blog/${nextSlug}`} className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-orange transition-colors">
              Next Post <ArrowRight className="w-4 h-4" />
            </Link>
          ) : <span />}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogDetailPage;
