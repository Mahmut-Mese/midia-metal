import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Mail, MapPin, Phone, Send, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";

const ServiceDetailPage = () => {
  const { slug = "" } = useParams();
  const [service, setService] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [serviceRes, settingsRes] = await Promise.all([
          apiFetch(`/v1/services/${slug}`),
          apiFetch("/v1/settings")
        ]);
        setService(serviceRes);
        const settingsMap: Record<string, string> = {};
        settingsRes.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error("Failed to fetch service detail", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const t = (key: string, def: string) => settings[key] || def;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20">
          <p className="text-center text-[#6e7a92]">Loading service...</p>
        </section>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20">
          <h1 className="font-sans text-[44px] font-semibold text-primary mb-4">Service Not Found</h1>
          <Link to="/services" className="text-orange underline">
            Back to services
          </Link>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="container mx-auto px-4 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 xl:grid-cols-[68%_32%] gap-8 xl:gap-10 items-start">
          <div>
            {service.image && (
              <img src={service.image} alt={service.title} className="w-full h-[400px] object-cover mb-8" />
            )}

            <h1 className="font-sans text-[48px] md:text-[68px] leading-none font-semibold text-[#10275c] mb-6">
              {service.title}
            </h1>

            {service.excerpt && (
              <p className="text-[18px] text-primary/80 font-medium leading-8 mb-6">
                {service.excerpt}
              </p>
            )}

            {service.content && (
              <div
                className="text-[16px] text-[#6f7c95] leading-8 mb-8 space-y-4"
                dangerouslySetInnerHTML={{ __html: service.content }}
              />
            )}

            {service.features && service.features.length > 0 && (
              <div className="mb-10">
                <h3 className="font-sans text-[28px] font-semibold text-[#10275c] mb-4">Service Features</h3>
                <ul className="space-y-3">
                  {service.features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3 text-[15px] text-[#6f7c95] leading-relaxed">
                      <ChevronRight className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="bg-[#f4f5f7] p-8">
            <h3 className="font-sans text-[32px] leading-none font-semibold text-primary mb-6">Get in Touch</h3>
            <form className="space-y-4 mb-8">
              <input type="text" placeholder="Name" className="w-full h-10 border-b border-[#c7d0de] bg-transparent outline-none text-[14px]" />
              <input type="email" placeholder="Email" className="w-full h-10 border-b border-[#c7d0de] bg-transparent outline-none text-[14px]" />
              <textarea placeholder="Message" rows={3} className="w-full border-b border-[#c7d0de] bg-transparent outline-none text-[14px] resize-none pt-2" />
              <button type="submit" className="h-[46px] w-full bg-orange text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#d4500b] transition-colors">
                <Send className="w-4 h-4" />
                Get in Touch
              </button>
            </form>

            <h4 className="font-sans text-[26px] leading-none font-semibold text-primary mb-5">Contact Info</h4>
            <div className="space-y-4 text-[14px] text-[#6f7c95]">
              <div className="flex gap-3 items-start">
                <MapPin className="w-4 h-4 text-[#2f9cea] mt-0.5 flex-shrink-0" />
                <p className="whitespace-pre-line">
                  {t("contact_address", "Unit 8A Cromwell Centre\nRoebuck Road, Hainaut Business Park\nILFORD, IG6 3UG")}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Mail className="w-4 h-4 text-[#2f9cea]" />
                <a href={`mailto:${t("contact_email", "info@midiammetal.com")}`} className="hover:text-orange">
                  {t("contact_email", "info@midiammetal.com")}
                </a>
              </div>
              <div className="flex gap-3 items-center">
                <Phone className="w-4 h-4 text-[#2f9cea]" />
                <a href={`tel:${t("contact_phone", "07545888522")}`} className="hover:text-orange">
                  {t("contact_phone", "07545888522")}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
      <FloatingSidebar />
    </div>
  );
};

export default ServiceDetailPage;
