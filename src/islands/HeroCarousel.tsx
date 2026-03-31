import { useState, useEffect } from "react";

type Slide = { id: number; image: string; alt?: string };

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const intervalId = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [slides.length]);

  const goToPrev = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const goToNext = () => setCurrentSlide((prev) => (prev + 1) % slides.length);

  return (
    <div className="relative h-[260px] md:h-[520px] overflow-hidden bg-gray-200">
      {slides.map((slide, index) => (
        <img
          key={slide.id}
          src={slide.image}
          alt={slide.alt || "Hero slide"}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            aria-label="Previous slide"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-16 bg-primary flex items-center justify-center text-primary-foreground hover:bg-navy-light transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button
            onClick={goToNext}
            aria-label="Next slide"
            className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-16 bg-primary flex items-center justify-center text-primary-foreground hover:bg-navy-light transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </>
      )}
    </div>
  );
}
