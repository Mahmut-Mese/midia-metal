import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const categories = ["All", "Ventilation", "Cladding", "Installation", "Custom Work"];

const projects = [
  { id: 1, title: "Commercial Kitchen Ventilation", category: "Ventilation", image: "/images/hero-kitchen.jpg", description: "Full ventilation system for a restaurant in London." },
  { id: 2, title: "Stainless Steel Wall Cladding", category: "Cladding", image: "/images/wall-cladding.jpg", description: "Hygienic wall cladding for a food processing plant." },
  { id: 3, title: "Industrial Canopy Installation", category: "Installation", image: "/images/canopy.jpg", description: "Large-scale canopy system for an industrial kitchen." },
  { id: 4, title: "Custom Welding Project", category: "Custom Work", image: "/images/welding.jpg", description: "Bespoke stainless steel fabrication for a hotel chain." },
  { id: 5, title: "Exhaust Fan System", category: "Ventilation", image: "/images/centrifugal-fan.jpg", description: "High-capacity exhaust system for a commercial bakery." },
  { id: 6, title: "Workshop Fit-Out", category: "Installation", image: "/images/workshop.jpg", description: "Complete workshop ventilation and equipment setup." },
  { id: 7, title: "Baffle Filter Installation", category: "Ventilation", image: "/images/baffle-filter.jpg", description: "Multi-unit baffle filter system for a restaurant group." },
  { id: 8, title: "Control Panel Setup", category: "Custom Work", image: "/images/control-panel.jpg", description: "Custom control panels for automated ventilation systems." },
];

const PortfolioPage = () => {
  const [active, setActive] = useState("All");

  const filtered = active === "All" ? projects : projects.filter((p) => p.category === active);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="py-16 text-center">
        <p className="section-label">Our Work</p>
        <h1 className="page-title">Portfolio</h1>
        <svg className="w-6 h-6 mx-auto mt-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </section>

      {/* Filter Tabs */}
      <section className="container mx-auto px-4 lg:px-8 pb-4">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-5 py-2 text-sm font-semibold rounded transition-colors ${
                active === cat
                  ? "bg-orange text-accent-foreground"
                  : "bg-secondary text-primary hover:bg-orange hover:text-accent-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Projects Grid */}
      <section className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project) => (
            <div key={project.id} className="group rounded-lg overflow-hidden border border-border">
              <div className="relative overflow-hidden h-64">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-colors duration-300 flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm">
                    View Project
                  </span>
                </div>
              </div>
              <div className="p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-orange">{project.category}</span>
                <h3 className="font-serif text-lg font-bold text-primary mt-1">{project.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{project.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h2 className="text-3xl font-serif font-bold text-primary-foreground mb-4">Have a project in mind?</h2>
          <p className="text-primary-foreground/70 text-sm mb-8 max-w-md mx-auto">
            Get in touch with our team to discuss your requirements and receive a free quote.
          </p>
          <Link to="/contact" className="btn-primary">
            Request a Quote
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PortfolioPage;
