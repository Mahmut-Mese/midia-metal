export interface PortfolioProject {
  id: number;
  slug: string;
  title: string;
  category: "Ventilation" | "Cladding" | "Installation" | "Custom Work";
  image: string;
  description: string;
  location: string;
  client: string;
  year: string;
  services: string[];
  gallery: string[];
}

export const portfolioProjects: PortfolioProject[] = [
  {
    id: 1,
    slug: "commercial-kitchen-ventilation",
    title: "Commercial Kitchen Ventilation",
    category: "Ventilation",
    image: "/images/hero-kitchen.jpg",
    description: "Full ventilation system for a restaurant in London.",
    location: "London, UK",
    client: "Restaurant Group",
    year: "2025",
    services: ["Site Survey", "Ducting Design", "Fan Installation"],
    gallery: ["/images/hero-kitchen.jpg", "/images/workshop.jpg", "/images/centrifugal-fan.jpg"],
  },
  {
    id: 2,
    slug: "stainless-steel-wall-cladding",
    title: "Stainless Steel Wall Cladding",
    category: "Cladding",
    image: "/images/wall-cladding.jpg",
    description: "Hygienic wall cladding for a food processing plant.",
    location: "Birmingham, UK",
    client: "Food Production Site",
    year: "2024",
    services: ["Panel Fabrication", "On-site Installation", "Finishing"],
    gallery: ["/images/wall-cladding.jpg", "/images/workshop.jpg", "/images/hero-kitchen.jpg"],
  },
  {
    id: 3,
    slug: "industrial-canopy-installation",
    title: "Industrial Canopy Installation",
    category: "Installation",
    image: "/images/canopy.jpg",
    description: "Large-scale canopy system for an industrial kitchen.",
    location: "Manchester, UK",
    client: "Industrial Kitchen",
    year: "2025",
    services: ["Canopy Install", "Balancing", "Commissioning"],
    gallery: ["/images/canopy.jpg", "/images/hero-kitchen.jpg", "/images/welding.jpg"],
  },
  {
    id: 4,
    slug: "custom-welding-project",
    title: "Custom Welding Project",
    category: "Custom Work",
    image: "/images/welding.jpg",
    description: "Bespoke stainless steel fabrication for a hotel chain.",
    location: "Leeds, UK",
    client: "Hotel Chain",
    year: "2026",
    services: ["Design Support", "Welding", "Quality Check"],
    gallery: ["/images/welding.jpg", "/images/workshop.jpg", "/images/installation-service.jpg"],
  },
  {
    id: 5,
    slug: "exhaust-fan-system",
    title: "Exhaust Fan System",
    category: "Ventilation",
    image: "/images/centrifugal-fan.jpg",
    description: "High-capacity exhaust system for a commercial bakery.",
    location: "Liverpool, UK",
    client: "Bakery",
    year: "2025",
    services: ["System Upgrade", "Fan Install", "Testing"],
    gallery: ["/images/centrifugal-fan.jpg", "/images/ventilation-fan-circular.png", "/images/workshop.jpg"],
  },
  {
    id: 6,
    slug: "workshop-fit-out",
    title: "Workshop Fit-Out",
    category: "Installation",
    image: "/images/workshop.jpg",
    description: "Complete workshop ventilation and equipment setup.",
    location: "Bristol, UK",
    client: "Engineering Workshop",
    year: "2024",
    services: ["Planning", "Install", "Handover"],
    gallery: ["/images/workshop.jpg", "/images/control-panel.jpg", "/images/hero-kitchen.jpg"],
  },
  {
    id: 7,
    slug: "baffle-filter-installation",
    title: "Baffle Filter Installation",
    category: "Ventilation",
    image: "/images/baffle-filter.jpg",
    description: "Multi-unit baffle filter system for a restaurant group.",
    location: "London, UK",
    client: "Restaurant Group",
    year: "2026",
    services: ["Supply", "Install", "Maintenance Plan"],
    gallery: ["/images/baffle-filter.jpg", "/images/canopy.jpg", "/images/hero-kitchen.jpg"],
  },
  {
    id: 8,
    slug: "control-panel-setup",
    title: "Control Panel Setup",
    category: "Custom Work",
    image: "/images/control-panel.jpg",
    description: "Custom control panels for automated ventilation systems.",
    location: "Nottingham, UK",
    client: "Factory Site",
    year: "2025",
    services: ["Panel Design", "Assembly", "Configuration"],
    gallery: ["/images/control-panel.jpg", "/images/workshop.jpg", "/images/ventilation-fan-circular.png"],
  },
];

export const portfolioCategories = ["All", "Ventilation", "Cladding", "Installation", "Custom Work"] as const;
