export interface ShopProduct {
  id: number;
  name: string;
  price: string;
  image: string;
  category: string;
  tags: string[];
}

export interface ShopCategoryPage {
  slug: string;
  title: string;
  image: string;
  description: string;
  productIds: number[];
}

export const shopProducts: ShopProduct[] = [
  { id: 1, name: "Baffle Grease Filters", price: "£1,000.00", image: "/images/baffle-filter.jpg", category: "Baffle Filters", tags: ["New", "Stock"] },
  { id: 2, name: "Canopy", price: "£800.00", image: "/images/canopy.jpg", category: "Canopies", tags: ["Sale", "Stock"] },
  { id: 3, name: "Air conditioner", price: "£700.00", image: "/images/air-conditioner.jpg", category: "Mesh Filters", tags: ["Available"] },
  { id: 4, name: "Centrifugal Fan", price: "£830.00", image: "/images/centrifugal-fan-square.png", category: "Mesh Filters", tags: ["Simple", "Smart"] },
  { id: 5, name: "Aluminium Conveyor Feet Commercial Kitchens", price: "£900.00", image: "/images/conveyor-feet.png", category: "Stainless Steel Sheets", tags: ["Variable", "Discount"] },
  { id: 6, name: "Ventilation Fan", price: "£700.00", image: "/images/ventilation-fan-circular.png", category: "Mesh Filters", tags: ["Item", "Simple"] },
  { id: 7, name: "Stainless Steel Gridmesh Style Grease Filters", price: "£800.00", image: "/images/mesh-filter.jpg", category: "Baffle Filters", tags: ["Simple", "Stock"] },
  { id: 8, name: "Canopy Grease Filter Cleaning Tank and Crystals", price: "£700.00", image: "/images/centrifugal-fan.jpg", category: "Baffle Filters", tags: ["Available", "Item"] },
  { id: 9, name: "Commercial Canopy Hood", price: "£920.00", image: "/images/canopy.jpg", category: "Canopies", tags: ["New", "Smart"] },
  { id: 10, name: "Stainless Extraction Canopy", price: "£860.00", image: "/images/hero-kitchen.jpg", category: "Canopies", tags: ["Simple", "Sale"] },
  { id: 11, name: "Cutting Disk Pro 200", price: "£540.00", image: "/images/cutting-disk.jpg", category: "Cutting Disks", tags: ["Stock", "Available"] },
  { id: 12, name: "Cutting Disk Pro 250", price: "£610.00", image: "/images/cutting-disk.jpg", category: "Cutting Disks", tags: ["Stock", "New"] },
  { id: 13, name: "Precision Cutting Disk Set", price: "£680.00", image: "/images/cutting-disk.jpg", category: "Cutting Disks", tags: ["Item", "Simple"] },
  { id: 14, name: "LED Canopy Light Bar", price: "£430.00", image: "/images/mesh-filter.jpg", category: "LED Lights", tags: ["Available", "Smart"] },
  { id: 15, name: "Waterproof LED Unit", price: "£470.00", image: "/images/air-conditioner.jpg", category: "LED Lights", tags: ["New", "Stock"] },
  { id: 16, name: "Commercial LED Light Pack", price: "£520.00", image: "/images/control-panel.jpg", category: "LED Lights", tags: ["Sale", "Variable"] },
  { id: 17, name: "Wall Cladding Sheets", price: "£900.00", image: "/images/wall-cladding.jpg", category: "Stainless Steel Sheets", tags: ["Item", "Stock"] },
  { id: 18, name: "Brushed Stainless Panel", price: "£830.00", image: "/images/wall-cladding.jpg", category: "Stainless Steel Sheets", tags: ["Available", "Simple"] },
];

const shopCategoryNames = ["Baffle Filters", "Canopies", "Cutting Disks", "LED Lights", "Mesh Filters", "Stainless Steel Sheets"];

export const shopSidebarCategories = shopCategoryNames.map((name) => ({
  name,
  count: shopProducts.filter((product) => product.category === name).length,
}));

export const shopTagsList = ["Available", "Discount", "Item", "New", "Sale", "Simple", "Smart", "Stock", "Variable"];

export const shopCategoryPages: ShopCategoryPage[] = [
  {
    slug: "canopy-grease-filters",
    title: "Canopy Grease Filters",
    image: "/images/baffle-filter.jpg",
    description:
      "Our canopy grease filters are designed for commercial kitchen extraction systems. They improve airflow performance, reduce grease buildup in ducting, and support safer long-term operation.",
    productIds: [1, 7, 8],
  },
  {
    slug: "cutting-disks",
    title: "Cutting Disks",
    image: "/images/cutting-disk.jpg",
    description:
      "Precision cutting products and related metalwork components for fabrication projects. Built for durability, cleaner finishing, and reliable performance in daily production environments.",
    productIds: [11, 12, 13],
  },
  {
    slug: "canopies",
    title: "Canopies",
    image: "/images/canopy.jpg",
    description:
      "Commercial canopy solutions for extraction and heat management in professional kitchens. We provide products suited for both new installations and retrofit projects.",
    productIds: [2, 9, 10],
  },
  {
    slug: "led-lights",
    title: "LED Lights",
    image: "/images/mesh-filter.jpg",
    description:
      "Lighting-ready metal components and related units used in kitchen and technical spaces. Designed to integrate cleanly with modern installation and service requirements.",
    productIds: [14, 15, 16],
  },
];
