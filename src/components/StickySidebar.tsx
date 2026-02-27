import { ShoppingCart, LayoutGrid, FileText } from "lucide-react";

const StickySidebar = () => {
    return (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col bg-primary text-primary-foreground border-l border-white/10">
            <button className="p-4 hover:bg-navy-light border-b border-white/5 transition-colors group">
                <ShoppingCart className="w-5 h-5 group-hover:text-orange transition-colors" />
            </button>
            <button className="p-4 hover:bg-navy-light border-b border-white/5 transition-colors group">
                <LayoutGrid className="w-5 h-5 group-hover:text-orange transition-colors" />
            </button>
            <button className="p-4 hover:bg-navy-light transition-colors group">
                <FileText className="w-5 h-5 group-hover:text-orange transition-colors" />
            </button>
        </div>
    );
};

export default StickySidebar;
