export const API_URL = import.meta.env.VITE_API_URL || "/api";

const clearLegacyTokens = () => {
    if (typeof window === "undefined") {
        return;
    }

    localStorage.removeItem("admin_token");
    localStorage.removeItem("customer_token");
};

export const getAuthToken = () => {
    clearLegacyTokens();
    return null;
};

export const setAuthToken = (_token: string) => {
    clearLegacyTokens();
};

export const removeAuthToken = () => {
    clearLegacyTokens();
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.headers as Record<string, string>),
    };

    // If body is NOT FormData, default to application/json
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers,
    });

    if (!response.ok) {
        if (response.status === 401 && endpoint.startsWith("/admin")) {
            removeAuthToken();
            if (!window.location.pathname.startsWith("/admin/login")) {
                window.location.href = "/admin/login";
            }
        }
        const errorData = await response.json().catch(() => ({ message: "An error occurred" }));
        throw new Error(errorData.message || "An error occurred");
    }

    return response.json();
};
