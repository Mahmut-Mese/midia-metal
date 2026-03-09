import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Mail, CheckCircle, Trash2, X, Eye } from "lucide-react";

export default function AdminMessages() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); // all, read, unread

    useEffect(() => {
        loadMessages();
    }, []);

    const loadMessages = async () => {
        try {
            const res = await apiFetch("/admin/messages");
            // API returns paginated object with .data array
            const data = res.data || res;
            setMessages(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Failed to load messages");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await apiFetch(`/admin/messages/${id}/read`, { method: "PUT" });
            toast.success("Message marked as read");
            loadMessages();
            if (selectedMessage?.id === id) {
                setSelectedMessage({ ...selectedMessage, read: true });
            }
        } catch (e) {
            toast.error("Failed to update message status");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            await apiFetch(`/admin/messages/${id}`, { method: "DELETE" });
            toast.success("Message deleted");
            loadMessages();
            setSelectedMessage(null);
        } catch (e) {
            toast.error("Failed to delete message");
        }
    };

    const filteredMessages = messages
        .filter((msg) => {
            const matchesSearch =
                msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (msg.subject || "").toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                filterStatus === "all" ? true :
                    filterStatus === "read" ? msg.read : !msg.read;

            return matchesSearch && matchesStatus;
        })
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-sans text-[#10275c]">Contact Messages</h1>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-80 text-sm"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-10 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                >
                    <option value="all">All Messages</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow overflow-hidden border border-[#e1e5eb]">
                    <ul className="divide-y divide-[#e1e5eb]">
                        {filteredMessages.length === 0 ? (
                            <li className="p-8 text-center text-gray-500">No messages found.</li>
                        ) : (
                            filteredMessages.map((msg) => (
                                <li
                                    key={msg.id}
                                    onClick={() => {
                                        setSelectedMessage(msg);
                                        if (!msg.read) handleMarkAsRead(msg.id);
                                    }}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between group ${selectedMessage?.id === msg.id ? "bg-blue-50/50" : ""
                                        }`}
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            {!msg.read && <span className="w-2 h-2 rounded-full bg-orange"></span>}
                                            <p className={`text-sm ${!msg.read ? "font-bold text-[#10275c]" : "text-gray-600"}`}>
                                                {msg.name}
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{msg.subject || msg.email}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {new Date(msg.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden border border-[#e1e5eb] min-h-[400px]">
                    {selectedMessage ? (
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold font-sans text-[#10275c]">{selectedMessage.name}</h2>
                                    <p className="text-sm text-gray-500">{selectedMessage.email}</p>
                                    {selectedMessage.phone && <p className="text-sm text-gray-500">{selectedMessage.phone}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">{new Date(selectedMessage.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-[#f0f2f5]">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Subject</label>
                                    <p className="text-sm font-semibold text-[#10275c]">{selectedMessage.subject || "No Subject"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Message</label>
                                    <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-[#4b5563] leading-relaxed whitespace-pre-wrap min-h-[150px]">
                                        {selectedMessage.message}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[#f0f2f5] flex gap-3">
                                <button
                                    onClick={() => handleDelete(selectedMessage.id)}
                                    className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" /> Delete Message
                                </button>
                                {!selectedMessage.read && (
                                    <button
                                        onClick={() => handleMarkAsRead(selectedMessage.id)}
                                        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 flex items-center gap-2"
                                    >
                                        <CheckCircle className="h-4 w-4" /> Mark Read
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <Mail className="h-12 w-12 mb-4 opacity-10" />
                            <p className="font-semibold">Select a message to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
