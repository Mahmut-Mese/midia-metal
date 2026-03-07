import { useState, useEffect } from "react";
import { ChevronDown, MapPin, Phone, Mail, User, AtSign, Smartphone, Tag, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";

const ContactPage = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch("/v1/settings");
        const settingsMap: Record<string, string> = {};
        res.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    loadSettings();
  }, []);

  const t = (key: string, def: string) => settings[key] || def;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("Please agree to the privacy policy");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/v1/contact", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      toast.success("Message sent successfully!");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setAgreed(false);
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Header />

      <section className="pt-16 md:pt-24 pb-14 md:pb-16 text-center">
        <h1 className="font-sans text-[52px] md:text-[72px] leading-none font-semibold text-[#10275c]">Contact</h1>
        <ChevronDown className="w-5 h-5 mx-auto mt-6 text-primary" />
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-14 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#10275c] mb-5">{t("contact_hero_label", "CONTACT US")}</p>
            <h2 className="font-sans text-[54px] md:text-[68px] leading-[0.94] font-semibold text-[#10275c] mb-6 whitespace-pre-line">
              {t("contact_hero_title", "Have Questions?\nGet in Touch!")}
            </h2>
            <p className="text-[#6f7c95] text-[16px] leading-8 max-w-[560px] mb-10">
              {t("contact_welcome", "Get in touch with us for Any custom stainless steel fabrication or ventilation system inquiries.")}
            </p>

            <div className="space-y-5 text-[#6f7c95] text-[16px]">
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-[#2f9cea] mt-1 flex-shrink-0" />
                <p>{t("contact_address", "785 15th Street, Office 478 Boston")}</p>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="w-5 h-5 text-[#2f9cea] mt-1 flex-shrink-0" />
                <p className="text-[#10275c] text-[39px] leading-none font-medium">{t("contact_phone", "+1 800 555 25 69")}</p>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="w-5 h-5 text-[#2f9cea] mt-1 flex-shrink-0" />
                <a href={`mailto:${t("contact_email", "info@email.com")}`} className="hover:text-orange transition-colors">{t("contact_email", "info@email.com")}</a>
              </div>
            </div>
          </div>

          <div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-7 gap-y-8">
                <label className="flex items-center gap-3 border-b border-[#c7d0de] pb-3">
                  <User className="w-4 h-4 text-primary" />
                  <input
                    type="text"
                    placeholder="Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none"
                  />
                </label>

                <label className="flex items-center gap-3 border-b border-[#c7d0de] pb-3">
                  <AtSign className="w-4 h-4 text-primary" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none"
                  />
                </label>

                <label className="flex items-center gap-3 border-b border-[#c7d0de] pb-3">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none"
                  />
                </label>

                <label className="flex items-center gap-3 border-b border-[#c7d0de] pb-3">
                  <Tag className="w-4 h-4 text-primary" />
                  <input
                    type="text"
                    placeholder="Subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none"
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 border-b border-[#c7d0de] pb-10">
                <Pencil className="w-4 h-4 text-primary mt-1" />
                <textarea
                  rows={1}
                  required
                  placeholder={t("contact_form_message_placeholder", "How can we help you? Feel free to get in touch!")}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none resize-none"
                />
              </label>

              <div className="flex flex-wrap items-center gap-8">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-[56px] px-10 bg-orange text-white text-[16px] font-semibold inline-flex items-center gap-3 hover:bg-[#d4500b] disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Sending..." : t("contact_form_button_label", "Get in Touch")}
                </button>

                <label className="inline-flex items-center gap-3 text-[15px] text-[#8f9bb2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-4 h-4 accent-orange"
                  />
                  <span>
                    I agree to the{" "}
                    <a href="#" className="underline hover:text-primary transition-colors">
                      privacy policy.
                    </a>
                  </span>
                </label>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="w-full h-[460px] md:h-[620px]">
        <iframe
          src={t("contact_map_url", "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d158858.18237282!2d-0.24168049!3d51.52855825!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8a00baf21de75%3A0x52963a5addd52a99!2sLondon%2C%20UK!5e0!3m2!1sen!2sus!4v1709000000000!5m2!1sen!2sus")}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Location Map"
        />
      </section>

      <Footer />
      <FloatingSidebar />
    </div>
  );
};

export default ContactPage;
