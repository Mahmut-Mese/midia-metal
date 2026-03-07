import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, X, Settings, Home, Info, PhoneCall } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";

export default function AdminSettings() {
    const [settings, setSettings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("general");

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await apiFetch("/admin/settings");
            setSettings(res);
        } catch (e) {
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = (key: string, value: string) => {
        setSettings((prev) =>
            prev.map((s) => (s.key === key ? { ...s, value } : s))
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const updates = settings.reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {});

        try {
            await apiFetch("/admin/settings", {
                method: "PUT",
                body: JSON.stringify({ settings: updates }),
            });
            toast.success("Settings saved successfully");
        } catch (err) {
            toast.error("Failed to save settings");
        }
    };

    if (loading) return <div>Loading...</div>;

    const groups = ["general", "home", "about", "contact", "services"];
    const filteredSettings = settings.filter(s => (s.group || "general") === activeTab);

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-sans text-[#10275c]">Site Management</h1>
            </div>

            <div className="flex gap-4 border-b border-gray-200">
                {groups.map(group => (
                    <button
                        key={group}
                        onClick={() => setActiveTab(group)}
                        className={`pb-4 px-2 text-sm font-semibold capitalize transition-colors relative ${activeTab === group ? "text-[#eb5c10]" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {group}
                        {activeTab === group && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#eb5c10]" />
                        )}
                    </button>
                ))}
            </div>

            <div className="rounded-lg bg-white shadow p-8">
                <form onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 gap-8">
                        {filteredSettings.map((setting) => (
                            <div key={setting.id} className="space-y-2">
                                <label className="block text-sm font-bold text-[#10275c] capitalize">
                                    {setting.key.replace(/_/g, " ").replace(activeTab, "").trim() || setting.key}
                                </label>
                                {setting.type === "textarea" ? (
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
                                        type={setting.type === 'url' ? 'url' : 'text'}
                                        value={setting.value || ""}
                                        onChange={(e) => updateSetting(setting.key, e.target.value)}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#eb5c10] focus:ring-[#eb5c10] sm:text-sm p-3 border"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t flex justify-end">
                        <button
                            type="submit"
                            className="rounded-md bg-[#eb5c10] px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#d4500b] transition-all transform hover:-translate-y-0.5"
                        >
                            Save {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

