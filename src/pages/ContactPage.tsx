import { ChevronDown, MapPin, Phone, Mail, User, AtSign, Smartphone, Tag, Pencil } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-16 text-center">
        <h1 className="page-title">Contact</h1>
        <ChevronDown className="w-6 h-6 mx-auto mt-4 text-muted-foreground" />
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
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-orange flex-shrink-0" />
                <p className="text-sm text-foreground">785 15th Street, Office 478 Boston</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-orange flex-shrink-0" />
                <p className="text-sm text-foreground font-semibold">+1 800 555 25 69</p>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-orange flex-shrink-0" />
                <p className="text-sm text-foreground">info@email.com</p>
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
              <div className="flex items-center justify-between">
                <button type="submit" className="btn-primary">
                  ✦ Get in Touch
                </button>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  I agree to the <a href="#" className="underline">privacy policy</a>.
                </label>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="w-full h-[400px] bg-secondary">
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
