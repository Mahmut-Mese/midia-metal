import { Link } from "react-router-dom";
import { Phone, ArrowRight, Star, ChevronDown, Hammer, Trophy, Settings2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const services = [
  { title: "Installation", image: "/images/welding.jpg", desc: "Adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
  { title: "Custom Metal Fabrication", image: "/images/workshop.jpg", desc: "Adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
  { title: "Equipment Installation", image: "/images/installation-service.jpg", desc: "Adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
];

const testimonials = [
  { name: "Flora Shepherd", role: "CFO, Business Co.", rating: 5, text: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserit tempore." },
  { name: "Marcia Hensley", role: "CEO, Business Co.", rating: 5, text: "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis quae praesentium voluptatum." },
  { name: "Martin Flowers", role: "CTO, Business Co.", rating: 5, text: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque." },
];

const ServicesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page Header */}
      <section className="py-16 text-center">
        <h1 className="page-title">Our Services</h1>
        <ChevronDown className="w-6 h-6 mx-auto mt-4 text-muted-foreground" />
      </section>

      {/* Hero Service */}
      <section className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange mb-2">YOUR COMFORT</p>
            <h2 className="section-title mb-4">Stainless steel welding</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Non blandit massa enim nec.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/contact" className="btn-primary">About Us</Link>
              <a href="tel:+18005554433" className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Phone className="w-4 h-4" />
                0 800 555 44 33
              </a>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden">
            <img src="/images/welding.jpg" alt="Stainless steel welding" className="w-full h-96 object-cover" />
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <p className="section-label text-center">PREMIUM QUALITY</p>
        <h2 className="section-title text-center mb-12">Our services make your<br />life comfortable</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 border-4 border-white shadow-md">
                <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Best service</p>
              <h3 className="font-serif text-lg font-bold text-primary mb-3">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
              <Link to="/contact" className="inline-flex items-center gap-1 text-sm text-orange font-semibold hover:underline">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-orange">
        <div className="container mx-auto px-4 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <h3 className="text-xl md:text-2xl font-serif font-bold text-accent-foreground">
            Contact us today for a free<br />consultation and quote.
          </h3>
          <div className="flex gap-4">
            <Link to="/contact" className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded border-2 border-white text-white hover:bg-white hover:text-orange transition-colors duration-200">
              Request a Quote
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded hover:bg-navy-light transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Solutions */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="flex gap-4">
            <img src="/images/workshop.jpg" alt="" className="w-1/2 h-64 object-cover rounded-lg" />
            <img src="/images/hero-kitchen.jpg" alt="" className="w-1/2 h-64 object-cover rounded-lg" />
          </div>
          <div>
            <p className="section-label">MODERN SOLUTIONS</p>
            <h2 className="section-title mb-4">Project with Expert & Metal Welding Collaboration</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <Link to="/shop" className="btn-primary">Visit Our Online Store</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { title: "Restaurant Expertise", icon: <Hammer className="w-8 h-8 text-orange" /> },
            { title: "Quality Assurance", icon: <Trophy className="w-8 h-8 text-orange" /> },
            { title: "Custom Solutions", icon: <Settings2 className="w-8 h-8 text-orange" /> },
          ].map((f, i) => (
            <div key={i}>
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center">{f.icon}</div>
              <h3 className="font-serif font-bold text-primary mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod.</p>
              <Link to="/services" className="inline-flex items-center gap-1 text-sm text-orange font-semibold mt-3 hover:underline">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <p className="section-label text-center">PEOPLE SAY ABOUT US</p>
        <h2 className="section-title text-center mb-12">Our customers say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-secondary rounded-lg p-6">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-orange text-orange" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.text}</p>
              <p className="font-sans font-bold text-sm text-primary">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ServicesPage;
