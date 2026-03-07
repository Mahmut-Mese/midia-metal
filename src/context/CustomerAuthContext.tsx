import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiFetch, API_URL } from "@/lib/api";

interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    postcode: string | null;
    country: string;
    is_business: boolean;
    company_name: string | null;
    company_vat_number: string | null;
}

interface CustomerAuthContextType {
    customer: Customer | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, customerData: Customer) => void;
    logout: () => void;
    updateCustomer: (customerData: Customer) => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("customer_token"));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchCustomer() {
            if (!token) {
                setIsLoading(false);
                return;
            }
            try {
                // Create custom request since apiFetch might use admin token logic
                const response = await fetch(`${API_URL}/v1/customer/me`, {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCustomer(data);
                } else {
                    setToken(null);
                    localStorage.removeItem("customer_token");
                }
            } catch (error) {
                console.error("Failed to fetch customer profile", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchCustomer();
    }, [token]);

    const login = (newToken: string, customerData: Customer) => {
        localStorage.setItem("customer_token", newToken);
        setToken(newToken);
        setCustomer(customerData);
    };

    const logout = () => {
        localStorage.removeItem("customer_token");
        setToken(null);
        setCustomer(null);
    };

    const updateCustomer = (customerData: Customer) => {
        setCustomer(customerData);
    };

    return (
        <CustomerAuthContext.Provider value={{ customer, token, isLoading, login, logout, updateCustomer }}>
            {children}
        </CustomerAuthContext.Provider>
    );
}

export function useCustomerAuth() {
    const context = useContext(CustomerAuthContext);
    if (context === undefined) {
        throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
    }
    return context;
}
