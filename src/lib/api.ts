export const API_URL = "http://127.0.0.1:8000/api";

export const getAuthToken = () => localStorage.getItem("admin_token");
export const setAuthToken = (token: string) => localStorage.setItem("admin_token", token);
export const removeAuthToken = () => localStorage.removeItem("admin_token");

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.headers as Record<string, string>),
    };

    // If body is NOT FormData, default to application/json
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    // Use passed-in token if available, otherwise fallback to admin token
    if (!headers["Authorization"] && token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
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
