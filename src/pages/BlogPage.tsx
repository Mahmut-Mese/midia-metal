import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowRight, ChevronDown, Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";
import Seo from "@/components/Seo";
import { absoluteUrl, buildBreadcrumbJsonLd, truncateText } from "@/lib/seo";

const BlogPage = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [postsRes, catRes, recentRes, settingsRes] = await Promise.all([
          apiFetch("/v1/blog"),
          apiFetch("/v1/blog/categories"),
          apiFetch("/v1/blog/recent"),
          apiFetch("/v1/settings")
        ]);
        setPosts(postsRes.data);
        setCategories(catRes);
        setRecentPosts(recentRes);
        const settingsMap: Record<string, string> = {};
        settingsRes.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error("Failed to load blog data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const t = (key: string, def: string) => settings[key] || def;

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Seo
        title={t("blog_hero_title", "Blog")}
        description={truncateText("Read insights on commercial kitchen ventilation, stainless steel fabrication, canopy systems, hygiene, and maintenance from Midia M Metal.")}
        image={posts[0]?.image}
        canonicalPath="/blog"
        structuredData={[
          buildBreadcrumbJsonLd([
            { name: "Home", url: absoluteUrl("/") },
            { name: "Blog", url: absoluteUrl("/blog") },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Midia M Metal Blog",
            url: absoluteUrl("/blog"),
            blogPost: posts.slice(0, 10).map((post) => ({
              "@type": "BlogPosting",
              headline: post.title,
              url: absoluteUrl(`/blog/${post.slug}`),
              image: post.image ? absoluteUrl(post.image) : undefined,
            })),
          },
        ]}
      />
      <Header />

      <section className="container mx-auto px-4 lg:px-8 pt-16 md:pt-20 pb-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_370px] gap-8 lg:gap-10">
          <div>
            <p className="text-[13px] text-[#9aa6bc] mb-8">Showing results for blog</p>
            {loading ? (
              <div className="py-16 text-center text-[#6e7a92] bg-[#f4f5f7] border border-[#d5deea]">Loading blog posts...</div>
            ) : posts.length > 0 ? (
              <div className="space-y-10">
                {posts.map((post) => (
                  <article key={post.id} className="group">
                    <Link to={`/blog/${post.slug}`} className="block relative overflow-hidden bg-[#f7f8fa]">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-[260px] md:h-[360px] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      {post.category && (
                        <span className="absolute top-4 left-4 h-8 px-3 inline-flex items-center bg-orange text-white text-[11px] font-semibold uppercase tracking-wide">
                          {post.category}
                        </span>
                      )}
                    </Link>
                    <div className="pt-5">
                      <div className="flex items-center gap-5 text-[13px] text-[#6f7c95] mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-[#2f9cea]" />
                          {new Date(post.published_at || post.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4 text-[#2f9cea]" />
                          {post.author}
                        </span>
                      </div>
                      <Link to={`/blog/${post.slug}`}>
                        <h2 className="font-sans text-[32px] md:text-[42px] leading-[0.96] font-semibold text-orange hover:text-orange/80 transition-colors mb-4">
                          {post.title}
                        </h2>
                      </Link>
                      <p className="text-[15px] leading-8 text-[#6f7c95] mb-5">{post.excerpt}</p>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#10275c] hover:text-orange transition-colors"
                      >
                        Read More <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-[#6e7a92] bg-[#f4f5f7] border border-[#d5deea]">No blog posts found.</div>
            )}
          </div>

          <aside className="bg-[#f4f5f7] p-6 md:p-8 h-fit lg:sticky lg:top-28 space-y-8">
            <div>
              <h3 className="font-sans text-[16px] leading-none font-semibold text-primary mb-5">{t("blog_sidebar_search", "Search")}</h3>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a95ac]" />
                <input
                  type="text"
                  placeholder="Search for article..."
                  className="w-full h-12 border border-[#d1dbe8] bg-transparent pl-12 pr-4 text-[14px] text-primary placeholder:text-[#9aa6bc] outline-none"
                />
              </div>
            </div>

            <div>
              <h3 className="font-sans text-[16px] leading-none font-semibold text-primary mb-5">{t("blog_sidebar_categories", "Categories")}</h3>
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={category.category}>
                    <span className="text-[15px] inline-flex items-center gap-2 text-primary hover:text-orange transition-colors cursor-pointer">
                      <span className="text-[8px]">•</span>
                      {category.category} ({category.count})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-sans text-[16px] leading-none font-semibold text-primary mb-5">{t("blog_sidebar_recent", "Recent Posts")}</h3>
              <ul className="space-y-4">
                {recentPosts.map((post) => (
                  <li key={post.id} className="flex gap-3">
                    <img src={post.image} alt={post.title} className="w-20 h-20 object-cover flex-shrink-0 bg-[#f7f8fa]" />
                    <div>
                      <Link to={`/blog/${post.slug}`} className="text-[15px] font-semibold text-orange hover:text-orange/80 transition-colors leading-snug">
                        {post.title}
                      </Link>
                      <p className="text-[12px] text-[#7f8aa2] mt-2">
                        {new Date(post.published_at || post.created_at).toLocaleDateString()}
                      </p>
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

export default BlogPage;
