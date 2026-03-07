import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, ChevronDown, Search, Tag, User } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  author: string;
  category: string;
  quote: string;
  tags: string[];
  content: string[];
}

const blogPosts: BlogPost[] = [
  {
    id: "importance-of-commercial-ventilation",
    title: "The Importance of Commercial Kitchen Ventilation",
    excerpt: "A well-designed ventilation system is crucial for safety, compliance, and comfort in any commercial kitchen.",
    image: "/images/hero-kitchen.jpg",
    date: "Feb 20, 2026",
    author: "Admin",
    category: "Ventilation",
    quote: "Reliable airflow is not a feature. It is a safety requirement in every commercial kitchen.",
    tags: ["Ventilation", "Safety", "Compliance"],
    content: [
      "A well-designed ventilation system is the backbone of any commercial kitchen. Without proper airflow, kitchens can become dangerous environments filled with smoke, grease particles, and excessive heat.",
      "Building regulations in the UK require all commercial kitchens to have adequate ventilation systems. These systems must remove cooking fumes, steam, and odors while maintaining a comfortable temperature for staff.",
      "There are four critical elements in a ventilation setup: canopy hood, grease filters, ductwork, and extraction fan. Each component must be sized and installed correctly to achieve consistent performance.",
      "Maintenance is just as important as design. Grease buildup in filters and ducts is one of the highest fire risks in kitchen operations. Weekly cleaning and scheduled inspections are essential.",
      "Investing in a quality system improves safety, supports legal compliance, and reduces long-term operating costs through better performance and fewer breakdowns.",
    ],
  },
  {
    id: "choosing-right-grease-filters",
    title: "Choosing the Right Grease Filters for Your Setup",
    excerpt: "Baffle vs mesh filters and how to choose the right option for your environment and maintenance cycle.",
    image: "/images/baffle-filter.jpg",
    date: "Feb 15, 2026",
    author: "Admin",
    category: "Products",
    quote: "The right filter choice lowers risk, cleaning time, and total lifecycle cost.",
    tags: ["Grease Filters", "Products", "Kitchen Design"],
    content: [
      "Grease filters capture airborne grease before it reaches ductwork. This protects your extraction system and reduces fire risk.",
      "Baffle filters force air through directional channels. They are durable, easy to wash, and typically preferred in high-use kitchens.",
      "Mesh filters are usually lower in upfront cost but require more frequent cleaning and replacement. They can be practical in lighter-duty applications.",
      "Selection should be based on cooking volume, menu type, cleaning schedule, and compliance requirements. The cheapest option is rarely the best long-term option.",
      "For most commercial sites, baffle filters deliver stronger long-term value due to durability and lower maintenance overhead.",
    ],
  },
  {
    id: "stainless-steel-wall-cladding-guide",
    title: "A Complete Guide to Stainless Steel Wall Cladding",
    excerpt: "Why stainless steel cladding remains the standard for hygienic and durable food-safe environments.",
    image: "/images/wall-cladding.jpg",
    date: "Feb 10, 2026",
    author: "Admin",
    category: "Guides",
    quote: "Cleanability and durability are the two reasons stainless cladding is a long-term winner.",
    tags: ["Cladding", "Hygiene", "Guides"],
    content: [
      "Stainless steel wall cladding is a preferred surface for food preparation and processing areas where hygiene standards are strict.",
      "Its non-porous surface makes cleaning straightforward and helps reduce bacterial growth compared to painted or porous finishes.",
      "Installation can be completed with mechanical fixings or specialist adhesives, depending on wall condition and project requirements.",
      "Grade 304 works well for standard kitchen spaces, while Grade 316 is better for corrosive environments and high chemical exposure.",
      "Correct detailing around joints and edges is critical for long-term performance and for maintaining easy washdown conditions.",
    ],
  },
  {
    id: "industrial-welding-techniques",
    title: "Industrial Welding Techniques for Kitchen Equipment",
    excerpt: "How TIG and MIG welding are used across stainless fabrication for commercial kitchen systems.",
    image: "/images/welding.jpg",
    date: "Feb 5, 2026",
    author: "Admin",
    category: "Fabrication",
    quote: "Precision welding is the difference between a product that lasts and one that fails early.",
    tags: ["Welding", "Fabrication", "Stainless Steel"],
    content: [
      "Commercial kitchen fabrication demands clean weld quality, dimensional accuracy, and repeatable production methods.",
      "TIG welding is commonly used for stainless components where appearance and precision are critical.",
      "MIG welding is practical for larger structures and higher throughput work where speed is important.",
      "Post-weld finishing is required for hygienic surfaces. Grinding and polishing remove crevices and improve cleanability.",
      "A strong QA process should validate weld integrity, finish quality, and dimensional tolerances before delivery.",
    ],
  },
  {
    id: "canopy-installation-tips",
    title: "5 Tips for a Perfect Canopy Installation",
    excerpt: "Practical canopy installation tips to avoid common capture, airflow, and commissioning mistakes.",
    image: "/images/canopy.jpg",
    date: "Jan 28, 2026",
    author: "Admin",
    category: "Installation",
    quote: "Capture area and airflow balance determine canopy performance, not visual size alone.",
    tags: ["Canopy", "Installation", "Airflow"],
    content: [
      "A canopy must be sized for the cooking line and overhang correctly to capture rising heat and contaminants.",
      "Mounting height directly affects capture effectiveness. Poor height selection can reduce extraction performance.",
      "System airflow should be calculated for actual cooking load, not estimated by generic values.",
      "Make-up air is essential. Without adequate replacement air, kitchens experience drafts and unstable airflow behavior.",
      "Commissioning confirms the system works as designed and should be treated as a required project phase.",
    ],
  },
  {
    id: "exhaust-fan-maintenance",
    title: "How to Maintain Your Exhaust Fan System",
    excerpt: "A practical maintenance checklist to improve fan performance, reliability, and service life.",
    image: "/images/centrifugal-fan.jpg",
    date: "Jan 20, 2026",
    author: "Admin",
    category: "Maintenance",
    quote: "Preventive maintenance costs less than emergency downtime every time.",
    tags: ["Maintenance", "Exhaust Fans", "Operations"],
    content: [
      "Your exhaust fan is a core component of kitchen extraction performance and requires routine care.",
      "Monthly blade cleaning helps maintain balance and prevents vibration from grease accumulation.",
      "Quarterly inspections should check belt condition, fasteners, electrical connections, and noise changes.",
      "Bearing lubrication should follow the manufacturer schedule. Over-lubrication can be as harmful as under-lubrication.",
      "Annual professional inspection validates electrical and mechanical health and helps catch issues before failure.",
    ],
  },
];

const BlogDetailPage = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const postIndex = blogPosts.findIndex((item) => item.id === slug);
  const post = postIndex >= 0 ? blogPosts[postIndex] : null;

  if (!post) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20">
          <h1 className="font-sans text-[44px] font-semibold text-[#10275c] mb-4">Post Not Found</h1>
          <Link to="/blog" className="text-orange underline">
            Back to blog
          </Link>
        </section>
        <Footer />
      </div>
    );
  }

  const prevPost = postIndex > 0 ? blogPosts[postIndex - 1] : null;
  const nextPost = postIndex < blogPosts.length - 1 ? blogPosts[postIndex + 1] : null;

  const categoryCounts = blogPosts.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  const recentPosts = blogPosts.filter((item) => item.id !== post.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="pt-16 md:pt-24 pb-10 md:pb-14 text-center">
        <p className="text-[11px] uppercase tracking-[0.26em] font-semibold text-[#6f7c95]">News and Articles</p>
        <h1 className="font-sans text-[48px] md:text-[72px] leading-[0.92] font-semibold text-[#10275c] mt-3">Blog Detail</h1>
        <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-10 xl:gap-12 items-start">
          <article>
            <img src={post.image} alt={post.title} className="w-full h-[260px] md:h-[360px] lg:h-[420px] object-cover" />

            <div className="mt-7 flex flex-wrap items-center gap-5 text-[13px] text-[#6f7c95]">
              <span className="inline-flex items-center h-8 px-3 bg-orange text-white text-[11px] font-semibold uppercase tracking-wide">
                {post.category}
              </span>
              <span className="inline-flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2f9cea]" />
                {post.date}
              </span>
              <span className="inline-flex items-center gap-2">
                <User className="w-4 h-4 text-[#2f9cea]" />
                {post.author}
              </span>
            </div>

            <h2 className="font-sans text-[38px] md:text-[56px] leading-[0.96] font-semibold text-[#10275c] mt-5 mb-6">{post.title}</h2>
            <p className="text-[18px] leading-8 text-[#6f7c95] mb-7">{post.excerpt}</p>

            <div className="space-y-6">
              {post.content.map((paragraph) => (
                <p key={paragraph} className="text-[15px] leading-8 text-[#6f7c95]">
                  {paragraph}
                </p>
              ))}
            </div>

            <blockquote className="mt-8 mb-8 border-l-4 border-orange bg-[#f4f5f7] px-6 py-5 text-[20px] md:text-[24px] leading-snug font-semibold text-[#10275c]">
              {post.quote}
            </blockquote>

            <p className="text-[15px] leading-8 text-[#6f7c95]">
              Detailed planning, right material choice, and scheduled maintenance produce the best outcomes in commercial projects. This same
              method helps reduce rework, protects budget, and improves long-term reliability.
            </p>

            <div className="mt-10 border-t border-[#d4dce8] pt-7 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#10275c]">
                <Tag className="w-4 h-4 text-[#2f9cea]" />
                Tags:
              </span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex h-8 items-center border border-[#cfd7e4] px-3 text-[12px] font-medium text-[#6f7c95] bg-white"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
              {prevPost ? (
                <Link
                  to={`/blog/${prevPost.id}`}
                  className="group border border-[#cfd7e4] bg-white px-5 py-5 transition-colors hover:bg-[#f4f5f7]"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6f7c95] mb-2 inline-flex items-center gap-2">
                    <ArrowLeft className="w-3 h-3" />
                    Previous Post
                  </p>
                  <h3 className="text-[18px] font-semibold leading-snug text-[#10275c] group-hover:text-orange transition-colors">{prevPost.title}</h3>
                </Link>
              ) : (
                <div />
              )}

              {nextPost ? (
                <Link
                  to={`/blog/${nextPost.id}`}
                  className="group border border-[#cfd7e4] bg-white px-5 py-5 transition-colors hover:bg-[#f4f5f7]"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6f7c95] mb-2 inline-flex items-center gap-2">
                    Next Post
                    <ArrowRight className="w-3 h-3" />
                  </p>
                  <h3 className="text-[18px] font-semibold leading-snug text-[#10275c] group-hover:text-orange transition-colors">{nextPost.title}</h3>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </article>

          <aside className="bg-[#f4f5f7] p-8 lg:sticky lg:top-28 h-fit space-y-8">
            <div>
              <h3 className="font-sans text-[28px] leading-none font-semibold text-[#10275c] mb-5">Search</h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#6f7c95]" />
                <input
                  type="text"
                  placeholder="Search for article..."
                  className="w-full h-12 border border-[#cfd7e4] bg-white pl-11 pr-4 text-[14px] text-[#10275c] placeholder:text-[#8a95ab] outline-none"
                />
              </div>
            </div>

            <div>
              <h3 className="font-sans text-[28px] leading-none font-semibold text-[#10275c] mb-5">Categories</h3>
              <ul className="space-y-3">
                {Object.entries(categoryCounts).map(([category, count]) => (
                  <li key={category}>
                    <span className="text-[14px] text-[#6f7c95] hover:text-orange transition-colors cursor-pointer">
                      {category} ({count})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-sans text-[28px] leading-none font-semibold text-[#10275c] mb-5">Recent Posts</h3>
              <ul className="space-y-4">
                {recentPosts.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <img src={item.image} alt={item.title} className="w-20 h-20 object-cover flex-shrink-0" />
                    <div>
                      <Link to={`/blog/${item.id}`} className="text-[15px] font-semibold leading-snug text-[#10275c] hover:text-orange transition-colors">
                        {item.title}
                      </Link>
                      <p className="text-[12px] text-[#6f7c95] mt-2">{item.date}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
      <FloatingSidebar />
    </div>
  );
};

export default BlogDetailPage;
