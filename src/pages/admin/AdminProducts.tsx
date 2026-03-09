import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";

export default function AdminProducts() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);

    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<any>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, []);

    const loadProducts = async () => {
        try {
            const res = await apiFetch("/admin/products");
            setProducts(res.data);
        } catch (e) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const res = await apiFetch("/admin/product-category-list");
            setCategories(res);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
            toast.success("Product deleted successfully");
            loadProducts();
        } catch (e) {
            toast.error("Failed to delete product");
        }
    };

    const openEdit = (product: any = null) => {
        const prod = product ? {
            ...product,
            specifications: product.specifications || {},
            variants: product.variants || []
        } : null;
        setCurrentProduct(
            prod || {
                name: "",
                price: "",
                old_price: "",
                image: "",
                gallery: [],
                description: "",
                product_category_id: "",
                tags: [],
                badge: "",
                active: true,
                featured: false,
                track_stock: false,
                stock_quantity: "",
                order: 0,
                specifications: {},
                variants: [],
            }
        );
        setIsEditing(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Check if there's a pending specification to add
            const keyEl = document.getElementById('new_spec_key') as HTMLInputElement;
            const valEl = document.getElementById('new_spec_value') as HTMLInputElement;
            let finalProduct = { ...currentProduct };

            if (keyEl && valEl) {
                const key = keyEl.value.trim();
                const val = valEl.value.trim();
                if (key && val) {
                    finalProduct.specifications = {
                        ...(finalProduct.specifications || {}),
                        [key]: val
                    };
                    keyEl.value = "";
                    valEl.value = "";
                }
            }

            // Auto-add variant if inputs have data
            const varOptEl = document.getElementById('var_opt') as HTMLInputElement;
            const varValEl = document.getElementById('var_val') as HTMLInputElement;
            const varPriceEl = document.getElementById('var_price') as HTMLInputElement;
            const varStockEl = document.getElementById('var_stock') as HTMLInputElement;
            if (varOptEl && varValEl && varOptEl.value && varValEl.value) {
                finalProduct.variants = [
                    ...(finalProduct.variants || []),
                    {
                        option: varOptEl.value,
                        value: varValEl.value,
                        price: varPriceEl.value,
                        stock: varStockEl.value ? parseInt(varStockEl.value) : null
                    }
                ];
                varOptEl.value = ""; varValEl.value = ""; varPriceEl.value = ""; varStockEl.value = "";
            }

            if (finalProduct.id) {
                await apiFetch(`/admin/products/${finalProduct.id}`, {
                    method: "PUT",
                    body: JSON.stringify(finalProduct),
                });
                toast.success("Product updated");
            } else {
                await apiFetch("/admin/products", {
                    method: "POST",
                    body: JSON.stringify(finalProduct),
                });
                toast.success("Product created");
            }
            setIsEditing(false);
            loadProducts();
        } catch (err: any) {
            toast.error(err.message || "Failed to save product");
        }
    };

    const filteredProducts = products
        .filter((p) => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === "all" || p.product_category_id?.toString() === categoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            if (sortBy === "price") {
                valA = parseFloat(valA.toString().replace(/[£,]/g, "")) || 0;
                valB = parseFloat(valB.toString().replace(/[£,]/g, "")) || 0;
            } else {
                valA = valA?.toString().toLowerCase();
                valB = valB?.toString().toLowerCase();
            }

            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-sans text-[#10275c]">Products</h1>
                <button
                    onClick={() => openEdit()}
                    className="flex items-center gap-2 rounded bg-[#eb5c10] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#d4500b]"
                >
                    <Plus className="h-4 w-4" /> Add Product
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-80 text-sm"
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                >
                    <option value="all">All Categories</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                    >
                        <option value="name">Name</option>
                        <option value="price">Price</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        className="h-10 px-3 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    >
                        {sortOrder === "asc" ? "↑" : "↓"}
                    </button>
                </div>
            </div>

            <div className="rounded-lg bg-white shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No products found.</td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => (
                                <tr key={product.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0">
                                                <img className="h-10 w-10 rounded-full object-cover" src={product.image} alt="" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                {product.featured && <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Featured</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {product.category?.name || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {product.price}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {product.active ? "Active" : "Inactive"}
                                        </span>
                                        {product.track_stock && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Stock: {product.stock_quantity ?? 0}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openEdit(product)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Editing Modal */}
            {
                isEditing && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mt-20 md:mt-0 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                                <h2 className="text-xl font-bold font-sans text-[#10275c]">{currentProduct.id ? "Edit Product" : "New Product"}</h2>
                                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-500">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={currentProduct.name}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Price</label>
                                        <input
                                            type="text"
                                            required
                                            value={currentProduct.price}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, price: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Old Price (Optional)</label>
                                        <input
                                            type="text"
                                            value={currentProduct.old_price || ""}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, old_price: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <ImageUpload
                                            label="Product Image"
                                            value={currentProduct.image}
                                            onChange={(url) => setCurrentProduct({ ...currentProduct, image: url })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Gallery Images</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                                            {(currentProduct.gallery || []).map((url: string, index: number) => (
                                                <div key={index} className="relative group rounded-md border border-gray-200 overflow-hidden aspect-square">
                                                    <img src={url} className="w-full h-full object-cover" alt={`Gallery ${index}`} />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newGallery = [...(currentProduct.gallery || [])];
                                                            newGallery.splice(index, 1);
                                                            setCurrentProduct({ ...currentProduct, gallery: newGallery });
                                                        }}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="col-span-2 sm:col-span-1 border-2 border-dashed border-gray-300 rounded-md p-2 flex flex-col items-center justify-center">
                                                <ImageUpload
                                                    label=""
                                                    hidePreview={true}
                                                    value=""
                                                    onChange={(url) => setCurrentProduct({ ...currentProduct, gallery: [...(currentProduct.gallery || []), url] })}
                                                />
                                                <span className="text-xs text-gray-500 text-center block w-full mt-1">Add Image</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700">Category</label>
                                        <select
                                            value={currentProduct.product_category_id || ""}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, product_category_id: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                        >
                                            <option value="">Select a category</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700">Badge (Optional)</label>
                                        <input
                                            type="text"
                                            value={currentProduct.badge || ""}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, badge: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                            placeholder="e.g. -11% or New"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Tags (Comma separated)</label>
                                        <input
                                            type="text"
                                            value={(currentProduct.tags || []).join(", ")}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, tags: e.target.value.split(",").map(f => f.trim()).filter(Boolean) })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                            placeholder="Tag 1, Tag 2"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
                                        <div className="space-y-3">
                                            {Object.entries(currentProduct.specifications || {}).map(([key, value]: [string, any], index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <div className="flex-1 text-sm bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md font-medium">{key}</div>
                                                    <div className="flex-1 text-sm bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md">{value}</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newSpecs = { ...currentProduct.specifications };
                                                            delete newSpecs[key];
                                                            setCurrentProduct({ ...currentProduct, specifications: newSpecs });
                                                        }}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Color"
                                                    id="new_spec_key"
                                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Silver"
                                                    id="new_spec_value"
                                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const keyEl = document.getElementById('new_spec_key') as HTMLInputElement;
                                                        const valEl = document.getElementById('new_spec_value') as HTMLInputElement;
                                                        const key = keyEl.value.trim();
                                                        const val = valEl.value.trim();
                                                        if (key && val) {
                                                            setCurrentProduct({
                                                                ...currentProduct,
                                                                specifications: {
                                                                    ...(currentProduct.specifications || {}),
                                                                    [key]: val
                                                                }
                                                            });
                                                            keyEl.value = "";
                                                            valEl.value = "";
                                                        }
                                                    }}
                                                    className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Description</label>
                                        <textarea
                                            rows={4}
                                            value={currentProduct.description || ""}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                    <div className="col-span-2 flex gap-6">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={currentProduct.active}
                                                onChange={(e) => setCurrentProduct({ ...currentProduct, active: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-600">Active</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={currentProduct.featured}
                                                onChange={(e) => setCurrentProduct({ ...currentProduct, featured: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-600">Featured</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={currentProduct.track_stock}
                                                onChange={(e) => setCurrentProduct({ ...currentProduct, track_stock: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-600">Track Stock</span>
                                        </label>
                                    </div>
                                    {currentProduct.track_stock && (
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                                            <input
                                                type="number"
                                                value={currentProduct.stock_quantity === null || currentProduct.stock_quantity === undefined ? "" : currentProduct.stock_quantity}
                                                onChange={(e) => setCurrentProduct({ ...currentProduct, stock_quantity: e.target.value ? parseInt(e.target.value, 10) : "" })}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                            />
                                        </div>
                                    )}

                                    <div className="col-span-2 border-t pt-6 bg-gray-50/50 p-6 rounded-lg">
                                        <label className="block text-sm font-bold text-[#10275c] mb-1 uppercase tracking-wider">Product Variants</label>
                                        <p className="text-xs text-gray-500 mb-4">Manage different versions of this product (e.g., Color Red, Blue or Size S, M, L)</p>

                                        <div className="space-y-4">
                                            {/* Variant List Table */}
                                            {(currentProduct.variants || []).length > 0 && (
                                                <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm bg-white">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Option</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Value</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Price</th>
                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Stock</th>
                                                                <th className="px-3 py-2 text-right"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {currentProduct.variants.map((v: any, idx: number) => (
                                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{v.option}</td>
                                                                    <td className="px-3 py-2 text-sm text-gray-600">{v.value}</td>
                                                                    <td className="px-3 py-2 text-sm text-gray-600">{v.price || '--'}</td>
                                                                    <td className="px-3 py-2 text-sm text-gray-600">{v.stock ?? '--'}</td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newVariants = [...currentProduct.variants];
                                                                                newVariants.splice(idx, 1);
                                                                                setCurrentProduct({ ...currentProduct, variants: newVariants });
                                                                            }}
                                                                            className="text-red-400 hover:text-red-600 p-1"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* New Variant Inputs */}
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end p-4 border rounded-md bg-white shadow-sm">
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Option</label>
                                                    <input id="var_opt" type="text" placeholder="Size" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Value</label>
                                                    <input id="var_val" type="text" placeholder="Large" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Price</label>
                                                    <input id="var_price" type="text" placeholder="850.00" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Stock</label>
                                                    <input id="var_stock" type="number" placeholder="10" className="w-full text-xs p-2 border rounded shadow-sm focus:ring-1 focus:ring-[#eb5c10] border-gray-300" />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const optEl = document.getElementById('var_opt') as HTMLInputElement;
                                                        const valEl = document.getElementById('var_val') as HTMLInputElement;
                                                        const priceEl = document.getElementById('var_price') as HTMLInputElement;
                                                        const stockEl = document.getElementById('var_stock') as HTMLInputElement;

                                                        if (optEl.value && valEl.value) {
                                                            setCurrentProduct({
                                                                ...currentProduct,
                                                                variants: [
                                                                    ...(currentProduct.variants || []),
                                                                    {
                                                                        option: optEl.value,
                                                                        value: valEl.value,
                                                                        price: priceEl.value || null,
                                                                        stock: stockEl.value ? parseInt(stockEl.value) : null
                                                                    }
                                                                ]
                                                            });
                                                            optEl.value = ""; valEl.value = ""; priceEl.value = ""; stockEl.value = "";
                                                        } else {
                                                            toast.error("Option (e.g. Size) and Value (e.g. XL) are required");
                                                        }
                                                    }}
                                                    className="bg-[#eb5c10] text-white py-2 px-3 rounded text-sm font-bold hover:bg-[#d4500b] transition-colors shadow-sm"
                                                >
                                                    Add Variant
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] pb-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-md bg-[#eb5c10] px-4 py-2 text-sm font-medium text-white shadow-sm hover:focus:outline-none"
                                    >
                                        Save Product
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
