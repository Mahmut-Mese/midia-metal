import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, Search, Tag, User } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";
import Seo from "@/components/Seo";
import { absoluteUrl, buildBreadcrumbJsonLd, stripHtml, truncateText } from "@/lib/seo";

export default function BlogDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [post, setPost] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [postRes, postsRes, categoriesRes, recentRes] = await Promise.all([
          apiFetch(`/v1/blog/${slug}`),
          apiFetch("/v1/blog"),
          apiFetch("/v1/blog/categories"),
          apiFetch("/v1/blog/recent"),
        ]);

        setPost(postRes);
        setPosts(postsRes.data || []);
        setCategories(categoriesRes || []);
        setRecentPosts(recentRes || []);
      } catch (error) {
        console.error("Failed to load blog post", error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadData();
    }
  }, [slug]);

  const currentIndex = useMemo(
    () => posts.findIndex((item) => item.slug === post?.slug || String(item.id) === String(post?.id)),
    [post, posts],
  );
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const nextPost = currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
  const publishedDate = post?.published_at || post?.created_at;
  const breadcrumbJsonLd = post
    ? buildBreadcrumbJsonLd([
      { name: "Home", url: absoluteUrl("/") },
      { name: "Blog", url: absoluteUrl("/blog") },
      { name: post.title, url: absoluteUrl(`/blog/${post.slug || slug}`) },
    ])
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20">
          <p className="text-center text-[#6e7a92]">Loading article...</p>
        </section>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Seo
          title="Post Not Found"
          description="The blog article you requested could not be found."
          canonicalPath={`/blog/${slug}`}
          noindex
        />
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

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Seo
        title={post.title}
        description={truncateText(stripHtml(post.excerpt || post.content || post.title))}
        image={post.image}
        canonicalPath={`/blog/${post.slug || slug}`}
        type="article"
        structuredData={[
          breadcrumbJsonLd!,
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: truncateText(stripHtml(post.excerpt || post.content || post.title)),
            image: post.image ? absoluteUrl(post.image) : undefined,
            author: {
              "@type": "Person",
              name: post.author || "Admin",
            },
            publisher: {
              "@type": "Organization",
              name: "Midia M Metal",
              logo: {
                "@type": "ImageObject",
                url: absoluteUrl("/logo.png"),
              },
            },
            mainEntityOfPage: absoluteUrl(`/blog/${post.slug || slug}`),
            datePublished: publishedDate,
            dateModified: post.updated_at || publishedDate,
          },
        ]}
      />
      <Header />

      <section className="container mx-auto px-4 lg:px-8 pt-16 md:pt-24 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-10 xl:gap-12 items-start">
          <article>
            {post.image ? (
              <img src={post.image} alt={post.title} className="w-full h-[260px] md:h-[360px] lg:h-[420px] object-cover" />
            ) : null}

            <div className="mt-7 flex flex-wrap items-center gap-5 text-[13px] text-[#6f7c95]">
              {post.category ? (
                <span className="inline-flex items-center h-8 px-3 bg-orange text-white text-[11px] font-semibold uppercase tracking-wide">
                  {post.category}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2f9cea]" />
                {new Date(publishedDate).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-2">
                <User className="w-4 h-4 text-[#2f9cea]" />
                {post.author || "Admin"}
              </span>
            </div>

            <h1 className="font-sans text-[38px] md:text-[56px] leading-[0.96] font-semibold text-orange mt-5 mb-6">
              {post.title}
            </h1>

            {post.excerpt ? (
              <p className="text-[18px] leading-8 text-[#6f7c95] mb-7">{post.excerpt}</p>
            ) : null}

            <div
              className="prose prose-slate max-w-none text-[15px] leading-8 prose-headings:text-[#10275c] prose-a:text-orange prose-a:no-underline hover:prose-a:underline prose-blockquote:border-orange prose-strong:text-[#10275c] prose-ul:list-disc prose-ol:list-decimal prose-li:my-1"
              dangerouslySetInnerHTML={{ __html: post.content || "" }}
            />

            {post.tags?.length ? (
              <div className="mt-10 border-t border-[#d4dce8] pt-7 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#10275c]">
                  <Tag className="w-4 h-4 text-[#2f9cea]" />
                  Tags:
                </span>
                {post.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex h-8 items-center border border-[#cfd7e4] px-3 text-[12px] font-medium text-[#6f7c95] bg-white"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
              {prevPost ? (
                <Link
                  to={`/blog/${prevPost.slug}`}
                  className="group border border-[#cfd7e4] bg-white px-5 py-5 transition-colors hover:bg-[#f4f5f7]"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6f7c95] mb-2 inline-flex items-center gap-2">
                    <ArrowLeft className="w-3 h-3" />
                    Previous Post
                  </p>
                  <h3 className="text-[18px] font-semibold leading-snug text-orange group-hover:text-orange/80 transition-colors">
                    {prevPost.title}
                  </h3>
                </Link>
              ) : (
                <div />
              )}

              {nextPost ? (
                <Link
                  to={`/blog/${nextPost.slug}`}
                  className="group border border-[#cfd7e4] bg-white px-5 py-5 transition-colors hover:bg-[#f4f5f7]"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6f7c95] mb-2 inline-flex items-center gap-2">
                    Next Post
                    <ArrowRight className="w-3 h-3" />
                  </p>
                  <h3 className="text-[18px] font-semibold leading-snug text-orange group-hover:text-orange/80 transition-colors">
                    {nextPost.title}
                  </h3>
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a95ac]" />
                <input
                  type="text"
                  placeholder="Search for article..."
                  className="w-full h-12 border border-[#d1dbe8] bg-transparent pl-12 pr-4 text-[14px] text-primary placeholder:text-[#9aa6bc] outline-none"
                />
              </div>
            </div>

            <div>
              <h3 className="font-sans text-[28px] leading-none font-semibold text-[#10275c] mb-5">Categories</h3>
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={category.category}>
                    <span className="text-[15px] inline-flex items-center gap-2 text-primary">
                      <span className="text-[8px]">•</span>
                      {category.category} ({category.count})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-sans text-[28px] leading-none font-semibold text-[#10275c] mb-5">Recent Posts</h3>
              <ul className="space-y-4">
                {recentPosts
                  .filter((item) => item.slug !== post.slug)
                  .slice(0, 3)
                  .map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <img src={item.image} alt={item.title} className="w-20 h-20 object-cover flex-shrink-0 bg-[#f7f8fa]" />
                      <div>
                        <Link to={`/blog/${item.slug}`} className="text-[15px] font-semibold text-orange hover:text-orange/80 transition-colors leading-snug">
                          {item.title}
                        </Link>
                        <p className="text-[12px] text-[#7f8aa2] mt-2">
                          {new Date(item.published_at || item.created_at).toLocaleDateString()}
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
}
