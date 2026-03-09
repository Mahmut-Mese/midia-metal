import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import RichTextEditor from "@/components/admin/RichTextEditor";

type SettingRecord = {
    id: number;
    key: string;
    value: string;
    type: string;
    group?: string | null;
};

type HeroSlideRecord = {
    id: number | string;
    image: string;
    alt?: string | null;
    order: number;
    active: boolean;
    isNew?: boolean;
};

const GROUP_ORDER = ["general", "shipping-tax", "home", "about", "contact", "services", "portfolio", "blog", "legal", "faq", "seo", "hero-slides"];

export default function AdminSettings() {
    const [settings, setSettings] = useState<SettingRecord[]>([]);
    const [heroSlides, setHeroSlides] = useState<HeroSlideRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("general");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [settingsRes, slidesRes] = await Promise.all([
                    apiFetch("/admin/settings"),
                    apiFetch("/admin/hero-slides"),
                ]);
                setSettings(settingsRes);
                setHeroSlides(slidesRes);
            } catch {
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const tabs = useMemo(() => {
        const seen = new Set(settings.map((setting) => setting.group || "general"));
        const dynamicGroups = Array.from(seen);
        const ordered = dynamicGroups.sort((a, b) => {
            const indexA = GROUP_ORDER.indexOf(a);
            const indexB = GROUP_ORDER.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        return [...ordered, "hero-slides"];
    }, [settings]);

    const filteredSettings = settings.filter((setting) => (setting.group || "general") === activeTab);

    const updateSetting = (key: string, value: string) => {
        setSettings((prev) => prev.map((setting) => (
            setting.key === key ? { ...setting, value } : setting
        )));
    };

    const updateSlide = (id: number | string, field: keyof HeroSlideRecord, value: string | number | boolean) => {
        setHeroSlides((prev) => prev.map((slide) => (
            slide.id === id ? { ...slide, [field]: value } : slide
        )));
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const updates = settings.reduce<Record<string, string>>((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});

        try {
            await apiFetch("/admin/settings", {
                method: "PUT",
                body: JSON.stringify({ settings: updates }),
            });
            toast.success("Settings saved successfully");
        } catch {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleAddSlide = () => {
        setHeroSlides((prev) => [
            ...prev,
            {
                id: `new-${Date.now()}`,
                image: "",
                alt: "",
                order: prev.length + 1,
                active: true,
                isNew: true,
            },
        ]);
    };

    const handleSaveSlide = async (slide: HeroSlideRecord) => {
        if (!slide.image) {
            toast.error("Hero slides need an image.");
            return;
        }

        const payload = {
            image: slide.image,
            alt: slide.alt || "",
            order: Number(slide.order) || 0,
            active: Boolean(slide.active),
        };

        try {
            const response = slide.isNew
                ? await apiFetch("/admin/hero-slides", {
                    method: "POST",
                    body: JSON.stringify(payload),
                })
                : await apiFetch(`/admin/hero-slides/${slide.id}`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });

            setHeroSlides((prev) => prev.map((item) => (
                item.id === slide.id ? response : item
            )));
            toast.success(slide.isNew ? "Hero slide created" : "Hero slide updated");
        } catch {
            toast.error("Failed to save hero slide");
        }
    };

    const handleDeleteSlide = async (slide: HeroSlideRecord) => {
        if (slide.isNew) {
            setHeroSlides((prev) => prev.filter((item) => item.id !== slide.id));
            return;
        }

        if (!confirm("Delete this hero slide?")) return;

        try {
            await apiFetch(`/admin/hero-slides/${slide.id}`, { method: "DELETE" });
            setHeroSlides((prev) => prev.filter((item) => item.id !== slide.id));
            toast.success("Hero slide deleted");
        } catch {
            toast.error("Failed to delete hero slide");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-sans text-[#10275c]">Site Management</h1>
                {activeTab === "hero-slides" && (
                    <button
                        type="button"
                        onClick={handleAddSlide}
                        className="inline-flex items-center gap-2 rounded-md bg-[#eb5c10] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d4500b]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Hero Slide
                    </button>
                )}
            </div>

            <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 px-2 text-sm font-semibold capitalize transition-colors relative whitespace-nowrap ${activeTab === tab ? "text-[#eb5c10]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        {tab.replace(/-/g, " ")}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#eb5c10]" />
                        )}
                    </button>
                ))}
            </div>

            {activeTab === "hero-slides" ? (
                <div className="space-y-4">
                    {heroSlides.length === 0 ? (
                        <div className="rounded-lg bg-white shadow p-8 text-sm text-gray-500">No hero slides yet.</div>
                    ) : (
                        heroSlides
                            .slice()
                            .sort((a, b) => Number(a.order) - Number(b.order))
                            .map((slide) => (
                                <div key={slide.id} className="rounded-lg bg-white shadow p-6 space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-semibold text-[#10275c]">Hero Slide</h2>
                                            <p className="text-sm text-gray-500">Manage homepage slider content and ordering.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSlide(slide)}
                                            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>
                                    </div>

                                    <ImageUpload
                                        label="Slide Image"
                                        value={slide.image}
                                        onChange={(url) => updateSlide(slide.id, "image", url)}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-[#10275c] mb-2">Alt Text</label>
                                            <input
                                                type="text"
                                                value={slide.alt || ""}
                                                onChange={(e) => updateSlide(slide.id, "alt", e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#eb5c10] focus:ring-[#eb5c10] sm:text-sm p-3 border"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-[#10275c] mb-2">Order</label>
                                            <input
                                                type="number"
                                                value={slide.order}
                                                onChange={(e) => updateSlide(slide.id, "order", Number(e.target.value))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#eb5c10] focus:ring-[#eb5c10] sm:text-sm p-3 border"
                                            />
                                        </div>
                                    </div>

                                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#10275c]">
                                        <input
                                            type="checkbox"
                                            checked={slide.active}
                                            onChange={(e) => updateSlide(slide.id, "active", e.target.checked)}
                                            className="accent-[#eb5c10]"
                                        />
                                        Active
                                    </label>

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleSaveSlide(slide)}
                                            className="rounded-md bg-[#eb5c10] px-6 py-3 text-sm font-bold text-white hover:bg-[#d4500b]"
                                        >
                                            {slide.isNew ? "Create Slide" : "Save Slide"}
                                        </button>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            ) : (
                <div className="rounded-lg bg-white shadow p-8">
                    <form onSubmit={handleSaveSettings} className="space-y-8">
                        <div className="grid grid-cols-1 gap-8">
                            {filteredSettings.length === 0 ? (
                                <div className="text-sm text-gray-500">No settings in this section.</div>
                            ) : (
                                filteredSettings.map((setting) => (
                                    <div key={setting.id} className="space-y-2">
                                        <label className="block text-sm font-bold text-[#10275c] capitalize">
                                            {setting.key.replace(/_/g, " ").replace(activeTab, "").trim() || setting.key}
                                        </label>
                                        {setting.type === "richtext" ? (
                                            <RichTextEditor
                                                label=""
                                                value={setting.value || ""}
                                                onChange={(value) => updateSetting(setting.key, value)}
                                            />
                                        ) : setting.type === "textarea" ? (
                                            <textarea
                                                rows={6}
                                                value={setting.value || ""}
                                                onChange={(e) => updateSetting(setting.key, e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#eb5c10] focus:ring-[#eb5c10] sm:text-sm p-3 border"
                                            />
                                        ) : setting.type === "image" ? (
                                            <ImageUpload
                                                value={setting.value}
                                                onChange={(url) => updateSetting(setting.key, url)}
                                            />
                                        ) : (
                                            <input
                                                type={setting.type === "url" ? "url" : "text"}
                                                value={setting.value || ""}
                                                onChange={(e) => updateSetting(setting.key, e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#eb5c10] focus:ring-[#eb5c10] sm:text-sm p-3 border"
                                            />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-8 border-t flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-md bg-[#eb5c10] px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#d4500b] disabled:opacity-50"
                            >
                                {saving ? "Saving..." : `Save ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings`}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
