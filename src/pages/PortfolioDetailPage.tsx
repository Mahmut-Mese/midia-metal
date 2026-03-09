import { Link, useParams } from "react-router-dom";
import { ChevronDown, MapPin, Calendar, User } from "lucide-react";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";
import Seo from "@/components/Seo";
import { absoluteUrl, buildBreadcrumbJsonLd, stripHtml, truncateText } from "@/lib/seo";

const PortfolioDetailPage = () => {
  const { slug = "" } = useParams();
  const [project, setProject] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projRes, relRes] = await Promise.all([
          apiFetch(`/v1/portfolio/${slug}`),
          apiFetch("/v1/portfolio")
        ]);
        setProject(projRes);
        setRelated(relRes.filter((p: any) => p.slug !== slug).slice(0, 3));
      } catch (err) {
        console.error("Failed to fetch project detail", err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) {
      fetchData();
    }
  }, [slug]);

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

  if (!project) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20 text-center">
          <h1 className="font-sans text-[44px] font-semibold text-[#10275c] mb-4">Project Not Found</h1>
          <Link to="/portfolio" className="text-orange underline">
            Back to portfolio
          </Link>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Seo
        title={project.title}
        description={truncateText(stripHtml(project.description || `${project.title} portfolio project by Midia M Metal.`))}
        image={project.image}
        canonicalPath={`/portfolio/${project.slug || slug}`}
        structuredData={[
          buildBreadcrumbJsonLd([
            { name: "Home", url: absoluteUrl("/") },
            { name: "Portfolio", url: absoluteUrl("/portfolio") },
            { name: project.title, url: absoluteUrl(`/portfolio/${project.slug || slug}`) },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: project.title,
            description: truncateText(stripHtml(project.description || project.title), 500),
            image: absoluteUrl(project.image),
            url: absoluteUrl(`/portfolio/${project.slug || slug}`),
            ...(project.client ? { creator: { "@type": "Organization", name: project.client } } : {}),
          },
        ]}
      />
      <Header />

      <section className="container mx-auto px-4 lg:px-8 pt-16 md:pt-24 pb-14 md:pb-20">
        <div className="grid grid-cols-1 xl:grid-cols-[68%_32%] gap-8 xl:gap-10 items-start">
          <div>
            <img src={project.image} alt={project.title} className="w-full h-[360px] md:h-[520px] object-cover" />

            <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{project.portfolio_category?.name || "Uncategorized"}</p>
            <h2 className="font-sans text-[42px] md:text-[58px] leading-[0.95] font-semibold text-[#10275c] mt-3 mb-6">{project.title}</h2>

            <p className="text-[15px] text-[#6f7c95] leading-8 mb-6 whitespace-pre-wrap">
              {project.description || "No description provided."}
            </p>

            {project.gallery && project.gallery.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {project.gallery.slice(0, 2).map((imgUrl: string, idx: number) => (
                  <img key={idx} src={imgUrl} alt="" className="w-full h-[280px] object-cover" />
                ))}
              </div>
            )}
          </div>

          <aside className="bg-[#f4f5f7] p-8">
            <h3 className="font-sans text-[30px] leading-none font-semibold text-primary mb-8">Project Info</h3>
            <div className="space-y-5 text-[15px] text-[#6f7c95]">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-[#2f9cea] mt-1" />
                <p>
                  <span className="text-primary font-semibold">Client:</span> {project.client || "N/A"}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#2f9cea] mt-1" />
                <p>
                  <span className="text-primary font-semibold">Location:</span> {project.location || "N/A"}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-[#2f9cea] mt-1" />
                <p>
                  <span className="text-primary font-semibold">Year:</span> {project.year || "N/A"}
                </p>
              </div>
            </div>

            {project.services_list && project.services_list.length > 0 && (
              <>
                <h4 className="font-sans text-[24px] leading-none font-semibold text-primary mt-10 mb-4">Services</h4>
                <ul className="space-y-2">
                  {project.services_list.map((service: string) => (
                    <li key={service} className="text-[14px] text-[#6f7c95]">
                      - {service}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <Link
              to="/contact"
              className="mt-10 inline-flex items-center justify-center h-12 px-8 w-full bg-orange text-white text-[14px] font-semibold hover:bg-[#d4500b] transition-colors"
            >
              Start Your Project
            </Link>
          </aside>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-24">
        <h3 className="font-sans text-[38px] md:text-[50px] leading-none font-semibold text-[#10275c] mb-8">Related Projects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {related.map((item) => (
            <Link key={item.id} to={`/portfolio/${item.slug}`} className="group">
              <div className="mb-4 overflow-hidden">
                <img src={item.image} alt={item.title} className="w-full h-[240px] object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <h4 className="font-sans text-[20px] font-semibold text-primary group-hover:text-orange transition-colors">{item.title}</h4>
              <p className="text-[14px] text-[#6f7c95] mt-1">{item.portfolio_category?.name || "Uncategorized"}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
      <FloatingSidebar />
    </div>
  );
};

export default PortfolioDetailPage;
