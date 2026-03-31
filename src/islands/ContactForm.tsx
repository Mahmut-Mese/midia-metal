import { useState } from "react";
import { User, AtSign, Smartphone, Tag, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export default function ContactForm({ messagePlaceholder = "How can we help you? Feel free to get in touch!", buttonLabel = "Get in Touch" }: { messagePlaceholder?: string; buttonLabel?: string }) {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", subject: "", message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { toast.error("Please agree to the privacy policy"); return; }
    setIsSubmitting(true);
    try {
      await apiFetch("/v1/contact", { method: "POST", body: JSON.stringify(formData) });
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-7 gap-y-8">
        <label className="flex items-center gap-3 border-b border-[#c7d0de] pb-3">
          <User className="w-4 h-4 text-primary" />
          <input type="text" placeholder="Name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none" />
        </label>
        <label className="flex items-center gap-3 border-b border-[#c7d0de] pb-3">
          <AtSign className="w-4 h-4 text-primary" />
          <input type="email" placeholder="Email Address" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none" />
        </label>
        <label className="flex items-center gap-3 border-b border-[#c7d0de] pb-3">
          <Smartphone className="w-4 h-4 text-primary" />
          <input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none" />
        </label>
        <label className="flex items-center gap-3 border-b border-[#c7d0de] pb-3">
          <Tag className="w-4 h-4 text-primary" />
          <input type="text" placeholder="Subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none" />
        </label>
      </div>
      <label className="flex items-start gap-3 border-b border-[#c7d0de] pb-10">
        <Pencil className="w-4 h-4 text-primary mt-1" />
        <textarea rows={1} required placeholder={messagePlaceholder} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full bg-transparent text-[15px] text-primary placeholder:text-[#8f9bb2] outline-none resize-none" />
      </label>
      <div className="flex flex-wrap items-center gap-8">
        <button type="submit" disabled={isSubmitting} className="h-[56px] px-10 bg-orange text-white text-[16px] font-semibold inline-flex items-center gap-3 hover:bg-[#d4500b] disabled:opacity-50 transition-colors">
          <Send className="w-4 h-4" />
          {isSubmitting ? "Sending..." : buttonLabel}
        </button>
        <label className="inline-flex items-center gap-3 text-[15px] text-[#8f9bb2] cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 accent-orange" />
          <span>I agree to the <a href="/privacy-policy" className="underline hover:text-primary transition-colors">privacy policy.</a></span>
        </label>
      </div>
    </form>
  );
}
