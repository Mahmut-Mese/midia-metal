import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";

const PortfolioPage = () => {
  const [active, setActive] = useState<string>("All");
  const [categories, setCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catsRes, projRes, settingsRes] = await Promise.all([
          apiFetch("/v1/portfolio/categories"),
          apiFetch("/v1/portfolio"),
          apiFetch("/v1/settings")
        ]);
        setCategories(catsRes);
        setProjects(projRes);
        const settingsMap: Record<string, string> = {};
        settingsRes.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error("Failed to load portfolio data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const t = (key: string, def: string) => settings[key] || def;

  const filtered = active === "All" ? projects : projects.filter((p) => p.portfolio_category?.name === active);

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="pt-16 md:pt-24 pb-14 md:pb-16 text-center">
        <h1 className="font-sans text-[52px] md:text-[68px] leading-none font-semibold text-[#10275c]">{t("portfolio_hero_title", "Portfolio")}</h1>
        <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-6 md:pb-8">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActive("All")}
            className={`h-10 px-5 text-[13px] font-semibold transition-colors border ${active === "All"
              ? "bg-[#10275c] text-white border-[#10275c]"
              : "bg-[#eef2f6] text-[#10275c] border-[#cfd8e6] hover:bg-orange hover:border-orange hover:text-white"
              }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.name)}
              className={`h-10 px-5 text-[13px] font-semibold transition-colors border ${active === cat.name
                ? "bg-[#10275c] text-white border-[#10275c]"
                : "bg-[#eef2f6] text-[#10275c] border-[#cfd8e6] hover:bg-orange hover:border-orange hover:text-white"
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-24">
        {loading ? (
          <div className="py-16 text-center text-[#6e7a92] bg-[#f4f5f7] border border-[#d5deea]">Loading projects...</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 md:gap-x-8 gap-y-10">
            {filtered.map((project) => (
              <Link
                key={project.id}
                to={`/portfolio/${project.slug}`}
                className="group block"
              >
                <div className="relative overflow-hidden bg-[#f7f8fa]">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-[250px] md:h-[300px] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/45 transition-colors duration-300 flex items-center justify-center">
                    <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[13px] tracking-wide">
                      View Project
                    </span>
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#8f9ab0] mb-2">{project.portfolio_category?.name || "Uncategorized"}</p>
                  <h3 className="font-sans text-[23px] md:text-[28px] leading-[1.02] font-semibold text-[#10275c] group-hover:text-orange transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-[14px] leading-7 text-[#6e7a92] mt-3">
                    {project.description && project.description.length > 100 ? `${project.description.substring(0, 100)}...` : project.description || ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-[#6e7a92] bg-[#f4f5f7] border border-[#d5deea]">No projects found.</div>
        )}
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-20 md:pb-24">
        <div className="bg-gradient-to-r from-[#0c63a4] to-[#1296df] p-8 md:p-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/75 font-semibold mb-2">{t("portfolio_cta_label", "Ready to start")}</p>
            <h2 className="font-sans text-[34px] md:text-[46px] leading-[0.95] font-semibold text-white whitespace-pre-line">
              {t("portfolio_cta_title", "Have a project in mind?")}
            </h2>
          </div>
          <Link
            to="/get-a-quote"
            className="inline-flex items-center justify-center h-11 px-8 bg-white text-[#10275c] text-[13px] font-semibold hover:bg-[#e9eff6] transition-colors"
          >
            Request a Quote
          </Link>
        </div>
      </section>

      <Footer />
      <FloatingSidebar />
    </div>
  );
};

export default PortfolioPage;
