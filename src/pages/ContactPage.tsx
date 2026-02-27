import { ChevronDown, MapPin, Phone, Mail, User, AtSign, Smartphone, Tag, Pencil } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-12 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-[#1e293b] font-serif mb-6">Contact</h1>
        <div className="flex justify-center -mt-2">
          <ChevronDown className="w-5 h-5 text-muted-foreground/40 animate-bounce" />
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Info */}
          <div>
            <p className="section-label">CONTACT US</p>
            <h2 className="text-3xl md:text-4xl font-bold text-primary font-serif mb-4">
              Have Questions?<br />Get in Touch!
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              Adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim.
            </p>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-orange" />
                </div>
                <div>
                  <p className="text-sm text-foreground">Unit 8A Cromwell Centre, Roebuck Road,<br />Hainaut Business Park, ILFORD, IG6 3UG</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-orange" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-foreground">
                    Ahmed: <a href="tel:07545888522" className="font-semibold hover:text-orange transition-colors cursor-pointer">07545888522</a>
                  </p>
                  <p className="text-sm text-foreground">
                    Jwan: <a href="tel:07442914525" className="font-semibold hover:text-orange transition-colors cursor-pointer">07442914525</a>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-orange" />
                </div>
                <div>
                  <a href="mailto:info@midiammetal.com" className="text-sm text-foreground hover:text-orange transition-colors">info@midiammetal.com</a>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <input type="text" placeholder="Name" className="bg-transparent text-sm w-full outline-none placeholder:text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <AtSign className="w-4 h-4 text-muted-foreground" />
                  <input type="email" placeholder="Email Address" className="bg-transparent text-sm w-full outline-none placeholder:text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <input type="tel" placeholder="Phone" className="bg-transparent text-sm w-full outline-none placeholder:text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <input type="text" placeholder="Subject" className="bg-transparent text-sm w-full outline-none placeholder:text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-start gap-2 border-b border-border pb-2">
                <Pencil className="w-4 h-4 text-muted-foreground mt-1" />
                <textarea
                  placeholder="How can we help you? Feel free to get in touch!"
                  rows={4}
                  className="bg-transparent text-sm w-full outline-none placeholder:text-muted-foreground resize-none"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button type="submit" className="px-8 py-3 bg-orange text-white text-sm font-bold rounded uppercase tracking-wider hover:bg-orange-hover transition-all flex items-center gap-2">
                  <Pencil className="w-3 h-3" /> Get in Touch
                </button>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-border text-orange focus:ring-orange" />
                  <span>I agree to the <a href="#" className="underline decoration-orange/30 group-hover:decoration-orange">privacy policy</a></span>
                </label>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="w-full h-[500px] mt-16">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d158858.18237282!2d-0.24168049!3d51.52855825!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8a00baf21de75%3A0x52963a5addd52a99!2sLondon%2C%20UK!5e0!3m2!1sen!2sus!4v1709000000000!5m2!1sen!2sus"
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
    </div>
  );
};

export default ContactPage;
