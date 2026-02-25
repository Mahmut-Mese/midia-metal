import { Link } from "react-router-dom";
import { Calendar, User, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const blogPosts = [
  {
    id: "importance-of-commercial-ventilation",
    title: "The Importance of Commercial Kitchen Ventilation",
    excerpt: "A well-designed ventilation system is crucial for safety, compliance, and comfort in any commercial kitchen environment.",
    image: "/images/hero-kitchen.jpg",
    date: "Feb 20, 2026",
    author: "Admin",
    category: "Ventilation",
  },
  {
    id: "choosing-right-grease-filters",
    title: "Choosing the Right Grease Filters for Your Setup",
    excerpt: "Baffle vs mesh filters — which one is best for your kitchen? We break down the pros and cons of each type.",
    image: "/images/baffle-filter.jpg",
    date: "Feb 15, 2026",
    author: "Admin",
    category: "Products",
  },
  {
    id: "stainless-steel-wall-cladding-guide",
    title: "A Complete Guide to Stainless Steel Wall Cladding",
    excerpt: "Discover why stainless steel wall cladding is the gold standard for hygiene in food preparation areas.",
    image: "/images/wall-cladding.jpg",
    date: "Feb 10, 2026",
    author: "Admin",
    category: "Guides",
  },
  {
    id: "industrial-welding-techniques",
    title: "Industrial Welding Techniques for Kitchen Equipment",
    excerpt: "TIG, MIG, and spot welding — learn which technique is used for different kitchen fabrication projects.",
    image: "/images/welding.jpg",
    date: "Feb 5, 2026",
    author: "Admin",
    category: "Fabrication",
  },
  {
    id: "canopy-installation-tips",
    title: "5 Tips for a Perfect Canopy Installation",
    excerpt: "Avoid common mistakes and ensure your kitchen canopy is installed correctly the first time.",
    image: "/images/canopy.jpg",
    date: "Jan 28, 2026",
    author: "Admin",
    category: "Installation",
  },
  {
    id: "exhaust-fan-maintenance",
    title: "How to Maintain Your Exhaust Fan System",
    excerpt: "Regular maintenance extends the life of your exhaust fans and keeps your kitchen compliant with regulations.",
    image: "/images/centrifugal-fan.jpg",
    date: "Jan 20, 2026",
    author: "Admin",
    category: "Maintenance",
  },
];

const categories = ["Ventilation", "Products", "Guides", "Fabrication", "Installation", "Maintenance"];

const BlogPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="py-16 text-center">
        <p className="section-label">News & Articles</p>
        <h1 className="page-title">Our Blog</h1>
        <svg className="w-6 h-6 mx-auto mt-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Blog Posts */}
          <div className="lg:col-span-2 space-y-10">
            {blogPosts.map((post) => (
              <article key={post.id} className="group border border-border rounded-lg overflow-hidden">
                <Link to={`/blog/${post.id}`} className="block relative overflow-hidden h-64">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-4 left-4 bg-orange text-accent-foreground text-xs font-bold px-3 py-1 rounded">
                    {post.category}
                  </span>
                </Link>
                <div className="p-6">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author}
                    </span>
                  </div>
                  <Link to={`/blog/${post.id}`}>
                    <h2 className="font-serif text-xl font-bold text-primary hover:text-orange transition-colors mb-2">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="text-sm text-muted-foreground mb-4">{post.excerpt}</p>
                  <Link
                    to={`/blog/${post.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-orange hover:text-orange-hover transition-colors"
                  >
                    Read More <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            {/* Search */}
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-serif font-bold text-primary mb-3">Search</h3>
              <div className="flex border border-border rounded overflow-hidden">
                <input type="text" placeholder="Search..." className="flex-1 px-3 py-2 text-sm outline-none bg-background" />
                <button className="px-4 bg-orange text-accent-foreground text-sm font-semibold">Go</button>
              </div>
            </div>

            {/* Categories */}
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-serif font-bold text-primary mb-3">Categories</h3>
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat}>
                    <span className="text-sm text-muted-foreground hover:text-orange transition-colors cursor-pointer">{cat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Posts */}
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-serif font-bold text-primary mb-3">Recent Posts</h3>
              <ul className="space-y-4">
                {blogPosts.slice(0, 3).map((post) => (
                  <li key={post.id} className="flex gap-3">
                    <img src={post.image} alt={post.title} className="w-16 h-16 rounded object-cover flex-shrink-0" />
                    <div>
                      <Link to={`/blog/${post.id}`} className="text-sm font-semibold text-primary hover:text-orange transition-colors leading-tight">
                        {post.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">{post.date}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogPage;
