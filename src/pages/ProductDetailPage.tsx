import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Heart,
  ShoppingCart,
  ChevronUp,
  ChevronDown,
  Star,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Twitter,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingSidebar from "@/components/FloatingSidebar";
import { apiFetch } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { toast } from "sonner";
import Seo from "@/components/Seo";
import { absoluteUrl, buildBreadcrumbJsonLd, priceToNumber, stripHtml, truncateText } from "@/lib/seo";
import { formatMoneyValue, resolveSelectedVariantUnitPrice } from "@/lib/pricing";
import { getAvailableStock } from "@/lib/stock";

const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const cmToInches = (value: number): string => formatNumber(value / 2.54);

const formatSpecValue = (value: unknown): string => String(value ?? "").trim();

const dedupeSpecEntries = (entries: Array<[string, string]>): Array<[string, string]> => {
  const seen = new Set<string>();

  return entries.filter(([key, value]) => {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey || !String(value).trim() || seen.has(normalizedKey)) {
      return false;
    }

    seen.add(normalizedKey);
    return true;
  });
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { customer } = useCustomerAuth();
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"description" | "reviews">("description");

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [canReviewStatus, setCanReviewStatus] = useState<"loading" | "allowed" | "not_purchased" | "not_delivered" | "already_reviewed" | "unauthenticated">("loading");

  const allImages = product ? [product.image, ...(product.gallery || [])].filter(Boolean) : [];
  const variantOptions = Array.from(
    new Set(
      ((product?.variants || []) as Array<Record<string, any>>)
        .map((variant) => String(variant?.option ?? "").trim())
        .filter(Boolean),
    ),
  );
  const availableStock = product ? getAvailableStock({ ...product, selected_variants: selectedVariants }) : null;
  const selectedUnitPrice = product ? resolveSelectedVariantUnitPrice(product.price, selectedVariants) : null;
  const isOutOfStock = availableStock !== null && availableStock <= 0;
  const stockLabel = availableStock === null
    ? "Stock: Available"
    : isOutOfStock
      ? "Stock: Out of stock"
      : `Stock: ${availableStock}`;

  const getProductStockLabel = (item: any): string => {
    if (!item?.track_stock) return "Stock: Available";

    const quantity = Number(item.stock_quantity ?? 0);
    return quantity > 0 ? `Stock: ${quantity}` : "Stock: Out of stock";
  };
  const fallbackShareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareUrl = product?.share_url || fallbackShareUrl;
  const shareText = encodeURIComponent(`${product?.name || "Product"} | Midia M Metal`);
  const description = (product?.description || "").trim();
  const descriptionHasHtml = /<\/?[a-z][\s\S]*>/i.test(description);
  const selectedVariantProfile = variantOptions.length > 0
    ? Object.values(selectedVariants)[0] ?? null
    : null;
  const activeShippingWeight = Number(selectedVariantProfile?.shipping_weight_kg ?? product?.shipping_weight_kg ?? 0);
  const activeLengthCm = Number(selectedVariantProfile?.shipping_length_cm ?? product?.shipping_length_cm ?? 0);
  const activeWidthCm = Number(selectedVariantProfile?.shipping_width_cm ?? product?.shipping_width_cm ?? 0);
  const activeHeightCm = Number(selectedVariantProfile?.shipping_height_cm ?? product?.shipping_height_cm ?? 0);
  const activeShippingClass = String(selectedVariantProfile?.shipping_class ?? product?.shipping_class ?? "").trim();
  const activeShipsSeparately = Boolean(selectedVariantProfile?.ships_separately ?? product?.ships_separately);
  const selectedVariantSpecEntries: Array<[string, string]> = variantOptions.map((option) => {
    const selectedValue = selectedVariants[option]?.value;
    const label = variantOptions.length === 1 ? "Size" : option;

    return [label, formatSpecValue(selectedValue || "Not selected")];
  });
  const generatedSpecificationEntries: Array<[string, string]> = [
    ...selectedVariantSpecEntries,
    ...(activeShippingWeight > 0 ? [["Shipping Weight", `${formatNumber(activeShippingWeight)} kg`]] as Array<[string, string]> : []),
    ...(activeLengthCm > 0 ? [["Length", `${formatNumber(activeLengthCm)} cm (${cmToInches(activeLengthCm)} in)`]] as Array<[string, string]> : []),
    ...(activeWidthCm > 0 ? [["Width", `${formatNumber(activeWidthCm)} cm (${cmToInches(activeWidthCm)} in)`]] as Array<[string, string]> : []),
    ...(activeHeightCm > 0 ? [["Height", `${formatNumber(activeHeightCm)} cm (${cmToInches(activeHeightCm)} in)`]] as Array<[string, string]> : []),
    ...(activeShippingClass ? [["Shipping Class", activeShippingClass.charAt(0).toUpperCase() + activeShippingClass.slice(1)]] as Array<[string, string]> : []),
    ["Ships Separately", activeShipsSeparately ? "Yes" : "No"],
  ];
  const specificationEntries: Array<[string, string]> = dedupeSpecEntries(generatedSpecificationEntries);
  const shareLinks = {
    facebook: product?.share_links?.facebook || `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: product?.share_links?.twitter || `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${shareText}`,
    whatsapp: product?.share_links?.whatsapp || `https://wa.me/?text=${encodeURIComponent(`${product?.name || "Product"} | Midia M Metal ${shareUrl}`)}`,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, relRes] = await Promise.all([
          apiFetch(`/v1/products/${id}`),
          apiFetch(`/v1/products/${id}/related`)
        ]);
        setProduct(prodRes);
        setRelated(relRes.slice(0, 3));
      } catch (err) {
        console.error("Failed to load product", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchReviewStatus = async () => {
      if (!customer || !id) {
        setCanReviewStatus("unauthenticated");
        return;
      }
      try {
        const data = await apiFetch(`/v1/customer/products/${id}/can-review`);
        if (data.can_review) {
          setCanReviewStatus("allowed");
        } else {
          setCanReviewStatus(data.reason || "not_purchased");
        }
      } catch (err) {
        setCanReviewStatus("unauthenticated");
      }
    };

    if (id) {
      setMainImageIndex(0);
      fetchData();
      fetchReviewStatus();
    }
  }, [id, customer]);

  useEffect(() => {
    if (availableStock !== null && availableStock > 0 && qty > availableStock) {
      setQty(availableStock);
    }
  }, [availableStock, qty]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      toast.error("Please login to submit a review.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const data = await apiFetch(`/v1/customer/products/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
      });

      toast.success("Review submitted successfully!");
      setProduct({ ...product, reviews: [data, ...(product.reviews || [])] });
      setReviewComment("");
      setReviewRating(5);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handlePurchaseAction = (mode: "add_to_basket" | "buy_now") => {
    const missingOptions = variantOptions.filter((option) => !selectedVariants[option]?.value);
    if (missingOptions.length > 0) {
      toast.error(`Please select ${missingOptions.join(", ")}.`);
      return;
    }

    if (isOutOfStock) {
      toast.error("This product is out of stock.");
      return;
    }

    if (availableStock !== null && qty > availableStock) {
      toast.error(`Only ${availableStock} unit(s) are in stock.`);
      setQty(availableStock);
      return;
    }

    const cartProduct = {
      ...product,
      price: formatMoneyValue(selectedUnitPrice ?? product.price),
      selected_variants: selectedVariants,
      available_stock: availableStock,
    };

    addToCart(cartProduct, qty);

    if (mode === "buy_now") {
      toast.success("Added to basket. Proceeding to checkout.");
      navigate("/checkout");
      return;
    }

    toast.success("Added to basket!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20 text-center">
          <p className="text-[#6e7a92]">Loading...</p>
        </section>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#eaf0f3]">
        <Header />
        <section className="container mx-auto px-4 lg:px-8 py-20 text-center">
          <h1 className="text-3xl font-bold">Product not found.</h1>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf0f3]">
      <Seo
        title={product.name}
        description={truncateText(stripHtml(description || product.category?.description || `${product.name} from Midia M Metal.`))}
        image={allImages[0]}
        canonicalPath={`/shop/${product.slug || product.id}`}
        type="product"
        structuredData={[
          buildBreadcrumbJsonLd([
            { name: "Home", url: absoluteUrl("/") },
            { name: "Shop", url: absoluteUrl("/shop") },
            ...(product.category?.slug ? [{ name: product.category.name, url: absoluteUrl(`/shop/category/${product.category.slug}`) }] : []),
            { name: product.name, url: absoluteUrl(`/shop/${product.slug || product.id}`) },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: allImages.map((img: string) => absoluteUrl(img)),
            description: truncateText(stripHtml(description || product.category?.description || product.name), 500),
            sku: String(product.id),
            category: product.category?.name,
            brand: {
              "@type": "Brand",
              name: "Midia M Metal",
            },
            offers: {
              "@type": "Offer",
              url: absoluteUrl(`/shop/${product.slug || product.id}`),
              priceCurrency: "GBP",
              price: priceToNumber(product.price) ?? undefined,
              availability: !product.track_stock || Number(product.stock_quantity ?? 0) > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
            ...(product.reviews?.length
              ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: (
                    product.reviews.reduce((sum: number, review: any) => sum + Number(review.rating || 0), 0) /
                    product.reviews.length
                  ).toFixed(1),
                  reviewCount: product.reviews.length,
                },
              }
              : {}),
          },
        ]}
      />
      <Header />

      <section className="container mx-auto px-4 lg:px-8 pt-12 md:pt-14 pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-[45%_55%] gap-10 xl:gap-12 items-start">
          <div className="flex flex-col gap-4 max-w-[550px]">
            <div className="relative group bg-white border border-[#e1e5eb] p-8 flex items-center justify-center">
              <img src={allImages[mainImageIndex]} alt={product.name} className="w-full aspect-square object-contain" />
              <button
                onClick={() => {
                  setLightboxIndex(mainImageIndex);
                  setIsLightboxOpen(true);
                }}
                className="absolute top-4 right-4 w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-primary transition-colors hover:bg-orange hover:text-white"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {allImages.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setMainImageIndex(idx)}
                    className={`border-2 transition-colors overflow-hidden bg-white ${idx === mainImageIndex ? 'border-orange' : 'border-[#e1e5eb] hover:border-[#cad4e4]'}`}
                  >
                    <img src={img} alt={`Thumbnail ${idx}`} className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <h1 className="font-sans text-[30px] md:text-[40px] leading-[1] font-semibold text-[#10275c]">{product.name}</h1>
            <div className="flex items-baseline gap-3 mt-3 mb-7">
              <p className="text-orange text-[28px] md:text-[34px] leading-none font-medium">
                {formatMoneyValue(selectedUnitPrice ?? product.price)}
              </p>
              {product.old_price && (
                <p className="text-[#9aa6bc] text-[20px] md:text-[24px] line-through font-normal">
                  {product.old_price}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap mb-3">
              <div>
                <div className="w-[118px] h-[50px] border border-[#cad4e4] flex items-center px-5 bg-[#eaf0f3]">
                  <span className="text-base text-primary">{qty}</span>
                  <div className="ml-auto flex flex-col">
                    <button
                      onClick={() => setQty(availableStock === null ? qty + 1 : Math.min(qty + 1, availableStock))}
                      disabled={isOutOfStock || (availableStock !== null && qty >= availableStock)}
                      className="text-[#7f8ca5] hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="text-[#7f8ca5] hover:text-primary">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handlePurchaseAction("add_to_basket")}
                disabled={isOutOfStock}
                className="h-[50px] px-8 border border-[#d1dbe8] bg-white text-primary text-sm font-semibold inline-flex items-center gap-2 hover:border-orange hover:text-orange transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to basket
              </button>

              <button
                onClick={() => handlePurchaseAction("buy_now")}
                disabled={isOutOfStock}
                className="h-[50px] px-10 bg-orange text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-orange-hover transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy now
              </button>

              <button
                onClick={() => {
                  if (isInWishlist(product.id)) {
                    removeFromWishlist(product.id);
                    toast.success("Removed from wishlist");
                  } else {
                    addToWishlist({ id: product.id, name: product.name, price: product.price, image: product.image });
                    toast.success("Added to wishlist!");
                  }
                }}
                className={`w-[50px] h-[50px] rounded-full border transition-colors grid place-items-center ${isInWishlist(product.id) ? 'bg-red-50 border-orange text-orange' : 'border-[#d1dbe8] text-[#7f8ca5] hover:text-orange hover:border-orange'}`}
                title={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-orange' : ''}`} />
              </button>
            </div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6e7a92] mb-8">
              {stockLabel}
            </p>

            <div className="space-y-2 text-[12px] md:text-[14px]">
              <p>
                <span className="font-semibold text-primary">Category:</span>{" "}
                <span className="text-[#6e7a92]">{product.category?.name || "Uncategorized"}</span>
              </p>
              <p>
                <span className="font-semibold text-primary">Tags:</span>{" "}
                <span className="text-[#6e7a92]">{(product.tags || []).join(", ") || "None"}</span>
              </p>
              <p>
                <span className="font-semibold text-primary">Product ID:</span>{" "}
                <span className="text-[#6e7a92]">{product.id}</span>
              </p>

              {/* Variants Selection */}
              {product.variants && product.variants.length > 0 && (() => {
                // Group variants by option type (e.g. "Color", "Size")
                const options = Array.from(new Set(product.variants.map((v: any) => v.option)));
                return options.map((opt: any) => (
                  <div key={opt} className="mt-4">
                    <span className="font-semibold text-primary block mb-2 uppercase text-[11px] tracking-wider">{opt}:</span>
                    <select
                      value={selectedVariants[opt]?.value || ""}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setSelectedVariants((prev) => {
                          const updated = { ...prev };
                          if (!nextValue) {
                            delete updated[opt];
                            return updated;
                          }

                          const selectedVariant = product.variants.find(
                            (variant: any) => variant.option === opt && variant.value === nextValue,
                          );

                          if (selectedVariant) {
                            updated[opt] = selectedVariant;
                          }

                          return updated;
                        });
                      }}
                      className="w-full h-12 border border-[#cad4e4] bg-white px-4 text-sm font-medium text-primary outline-none transition-colors focus:border-primary"
                    >
                      <option value="">Select {opt}</option>
                      {product.variants
                        .filter((v: any) => v.option === opt)
                        .map((v: any, idx: number) => (
                          <option key={idx} value={v.value}>
                            {v.value}
                          </option>
                        ))}
                    </select>
                  </div>
                ));
              })()}

              <div className="pt-2">
                <span className="font-semibold text-primary">Share:</span>
                <div className="mt-2 flex items-center gap-2">
                  {[
                    { key: "facebook", href: shareLinks.facebook, Icon: Facebook, label: "Share on Facebook" },
                    { key: "twitter", href: shareLinks.twitter, Icon: Twitter, label: "Share on Twitter" },
                    { key: "whatsapp", href: shareLinks.whatsapp, Icon: MessageCircle, label: "Share on WhatsApp" },
                  ].map(({ key, href, Icon, label }) => (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="w-9 h-9 rounded-full border border-[#d1dbe8] bg-white text-[#6e7a92] grid place-items-center transition-colors hover:border-orange hover:text-orange"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section >

      <section className="container mx-auto px-4 lg:px-8 pb-14">
        <div className={`grid grid-cols-1 ${specificationEntries.length > 0 ? "xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]" : ""} gap-10 xl:gap-12 items-start`}>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-0 mb-10">
              <button
                onClick={() => setTab("description")}
                className={`w-[170px] md:w-[220px] h-[48px] md:h-[52px] text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${tab === "description"
                  ? "bg-[#f4f5f7] text-primary border-t-2 border-primary"
                  : "bg-[#f4f5f7] text-primary/70 hover:text-primary"
                  }`}
              >
                Description
              </button>
              <button
                onClick={() => setTab("reviews")}
                className={`w-[170px] md:w-[220px] h-[48px] md:h-[52px] text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${tab === "reviews"
                  ? "bg-[#f4f5f7] text-primary border-t-2 border-primary"
                  : "bg-[#f4f5f7] text-primary/70 hover:text-primary"
                  }`}
              >
                Reviews ({product.reviews?.length || 0})
              </button>
            </div>

            {tab === "description" ? (
              <div className="w-full">
                {description ? (
                  descriptionHasHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-[#6e7a92] leading-7 prose-p:my-3 prose-headings:text-primary prose-strong:text-primary prose-a:text-orange prose-a:no-underline hover:prose-a:underline prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-blockquote:border-orange prose-blockquote:text-[#5f6f8d] prose-ul:list-disc prose-ol:list-decimal"
                      dangerouslySetInnerHTML={{ __html: description }}
                    />
                  ) : (
                    <p className="text-[13px] md:text-[14px] text-[#6e7a92] leading-7 whitespace-pre-wrap">
                      {description}
                    </p>
                  )
                ) : (
                  <p className="text-[13px] md:text-[14px] text-[#6e7a92] leading-7">No description provided.</p>
                )}
              </div>
            ) : (
              <div className="w-full">
                <div className="mb-12">
                  <h3 className="text-xl font-semibold text-primary mb-6">Write a review</h3>
                  {canReviewStatus === "loading" ? (
                    <p className="text-[#6e7a92] bg-[#f4f5f7] p-4 text-sm animate-pulse">Checking eligibility...</p>
                  ) : canReviewStatus === "unauthenticated" ? (
                    <p className="text-[#6e7a92] bg-[#f4f5f7] p-4 text-sm">
                      You must be <Link to="/login" className="text-orange underline">logged in</Link> and have purchased this product to write a review.
                    </p>
                  ) : canReviewStatus === "not_purchased" ? (
                    <p className="text-[#6e7a92] bg-[#f4f5f7] p-4 text-sm">
                      You can only write a review for this product if you have purchased it.
                    </p>
                  ) : canReviewStatus === "not_delivered" ? (
                    <p className="text-[#6e7a92] bg-[#f4f5f7] p-4 text-sm">
                      You can write a review once your order has been delivered.
                    </p>
                  ) : canReviewStatus === "already_reviewed" ? (
                    <p className="text-[#6e7a92] bg-[#eaf0f3] p-4 text-sm font-medium">
                      You have already reviewed this product. Thank you for your feedback!
                    </p>
                  ) : (
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm text-[#6e7a92] mb-2 font-medium">Your Rating</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className={`hover:scale-110 transition-transform ${star <= reviewRating ? 'text-orange' : 'text-gray-300'}`}
                            >
                              <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-orange' : ''}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-[#6e7a92] mb-2 font-medium">Your Review (Optional)</label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full h-32 border border-[#d1dbe8] bg-[#f8fafc] p-4 text-sm focus:outline-none focus:border-orange resize-none"
                          placeholder="Share your thoughts about this product..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="h-12 px-8 bg-primary text-white font-semibold flex items-center justify-center hover:bg-orange transition-colors disabled:opacity-50"
                      >
                        {isSubmittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                    </form>
                  )}
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-primary mb-6">Customer Reviews</h3>
                  {(!product.reviews || product.reviews.length === 0) ? (
                    <p className="text-[15px] text-[#6e7a92]">No reviews yet. Be the first to review this product!</p>
                  ) : (
                    product.reviews.map((review: any) => (
                      <div key={review.id} className="border-b border-[#efefef] pb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-primary text-[15px]">
                            {review.customer?.name}
                          </span>
                          <span className="text-xs text-[#9aa6bc]">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${star <= review.rating ? 'fill-orange text-orange' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        {review.comment && (
                          <p className="text-[14px] text-[#6e7a92] leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {specificationEntries.length > 0 && (
            <aside className="min-w-0">
              <div className="overflow-hidden rounded border border-[#d5deea] bg-white">
                <div className="border-b border-[#d5deea] px-8 py-6">
                  <h3 className="font-sans text-[24px] md:text-[28px] font-semibold text-primary">Specs</h3>
                </div>
                <div>
                  {specificationEntries.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[42%_58%] border-b border-[#d5deea] last:border-b-0">
                      <div className="bg-[#f7f8fa] px-8 py-5 text-[16px] md:text-[18px] font-semibold text-primary">
                        {key}
                      </div>
                      <div className="px-8 py-5 text-[16px] md:text-[18px] text-[#4b5565]">
                        {String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-24">
        <h2 className="font-sans text-[34px] md:text-[46px] leading-none font-semibold text-[#10275c] mb-10">Related products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {related.map((p) => (
            <Link
              to={`/shop/${p.slug || p.id}`}
              key={p.id}
              className="group"
            >
              <div className="mb-5 bg-[#f7f8fa] border border-[#d5deea]">
                <img src={p.image} alt={p.name} className="w-full aspect-[1.02] object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              </div>
              <h3 className="font-sans text-[18px] md:text-[20px] leading-tight font-semibold text-orange">
                {p.name}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-baseline gap-2">
                  <p className="text-[18px] md:text-[20px] leading-none font-semibold text-[#1f2f52]">{p.price}</p>
                  {p.old_price && (
                    <p className="text-[14px] md:text-[16px] text-[#9aa6bc] line-through font-normal">
                      {p.old_price}
                    </p>
                  )}
                </div>
                <p className="text-[13px] md:text-[15px] font-medium text-[#5e6e8c]">
                  {getProductStockLabel(p)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Lightbox Modal */}
      {
        isLightboxOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 cursor-pointer"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-50 p-2 cursor-pointer"
            >
              <X className="w-10 h-10" />
            </button>

            <div
              className="relative w-full max-w-[1400px] h-full flex flex-col items-center justify-center cursor-default bg-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              {allImages.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1)); }}
                  className="absolute left-2 md:left-0 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-[60] cursor-pointer backdrop-blur-sm"
                >
                  <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
                </button>
              )}

              <img
                src={allImages[lightboxIndex]}
                alt={product.name}
                className="max-w-full max-h-[92vh] object-contain select-none shadow-2xl"
              />

              {allImages.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0)); }}
                  className="absolute right-2 md:right-0 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-[60] cursor-pointer backdrop-blur-sm"
                >
                  <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
                </button>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm tracking-widest">
                {lightboxIndex + 1} / {allImages.length}
              </div>
            )}
          </div>
        )
      }

      <Footer />
      <FloatingSidebar />
    </div >
  );
};

export default ProductDetailPage;
