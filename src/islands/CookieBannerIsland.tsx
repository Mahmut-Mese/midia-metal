import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";

const COOKIE_KEY = "midia_cookie_consent";

export default function CookieBannerIsland() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:p-6 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto bg-[#10275c] text-white rounded-lg shadow-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Cookie className="w-6 h-6 flex-shrink-0 mt-0.5 text-orange" />
          <div>
            <p className="text-sm font-semibold mb-1">We use cookies</p>
            <p className="text-xs text-[#8ab0d1] leading-relaxed">
              We use cookies to enhance your browsing experience, remember your
              cart, and analyse site traffic. By clicking &ldquo;Accept&rdquo;,
              you consent to our use of cookies. You can learn more in our{" "}
              <a
                href="/privacy-policy"
                className="underline text-orange hover:text-orange/80"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={decline}
            className="text-xs text-[#8ab0d1] hover:text-white transition-colors px-3 py-2"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="text-xs font-semibold bg-orange text-white px-5 py-2.5 rounded hover:bg-[#d4500b] transition-colors"
          >
            Accept All
          </button>
          <button
            onClick={decline}
            className="text-[#8ab0d1] hover:text-white p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
