import { ShoppingCart, CreditCard, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";

const FloatingSidebar = () => {
    return (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-px bg-primary shadow-lg border-l border-y border-white/10 overflow-hidden rounded-l-md">
            <Link
                to="/cart"
                className="p-3 hover:bg-orange transition-colors group relative border-b border-white/5"
                title="View Cart"
            >
                <ShoppingCart className="w-5 h-5 text-white" />
                <span className="absolute top-1 right-1 bg-orange text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">1</span>
            </Link>
            <Link
                to="/payment"
                className="p-3 hover:bg-orange transition-colors border-b border-white/5"
                title="Payments"
            >
                <CreditCard className="w-5 h-5 text-white" />
            </Link>
            <Link
                to="/shop"
                className="p-3 hover:bg-orange transition-colors"
                title="Browse Products"
            >
                <FolderOpen className="w-5 h-5 text-white" />
            </Link>
        </div>
    );
};

export default FloatingSidebar;
