import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_URL } from "@/lib/api";

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
    login: (customerData: Customer) => void;
    logout: () => void;
    updateCustomer: (customerData: Customer) => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchCustomer() {
            try {
                const response = await fetch(`${API_URL}/v1/customer/me`, {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (!isMounted) {
                        return;
                    }

                    setCustomer(data);
                    setToken("cookie");
                } else {
                    if (!isMounted) {
                        return;
                    }

                    setToken(null);
                    setCustomer(null);
                }
            } catch (error) {
                console.error("Failed to fetch customer profile", error);
                if (isMounted) {
                    setToken(null);
                    setCustomer(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchCustomer();

        return () => {
            isMounted = false;
        };
    }, []);

    const login = (customerData: Customer) => {
        setToken("cookie");
        setCustomer(customerData);
    };

    const logout = () => {
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
