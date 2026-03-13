export const API_URL = import.meta.env.VITE_API_URL || "/api";

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
let csrfBootstrapPromise: Promise<void> | null = null;

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

const getApiOrigin = () => {
    if (typeof window === "undefined") {
        return "";
    }

    if (API_URL.startsWith("http://") || API_URL.startsWith("https://")) {
        try {
            return new URL(API_URL).origin;
        } catch {
            return window.location.origin;
        }
    }

    return window.location.origin;
};

const getCookie = (name: string) => {
    if (typeof document === "undefined") {
        return null;
    }

    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
};

const isMutatingMethod = (method?: string) => {
    const normalized = (method || "GET").toUpperCase();
    return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(normalized);
};

const ensureCsrfCookie = async (force = false) => {
    if (typeof window === "undefined") {
        return;
    }

    if (!force && getCookie(CSRF_COOKIE_NAME)) {
        return;
    }

    if (csrfBootstrapPromise && !force) {
        return csrfBootstrapPromise;
    }

    const apiOrigin = getApiOrigin();
    csrfBootstrapPromise = fetch(`${apiOrigin}/sanctum/csrf-cookie`, {
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    })
        .then(() => undefined)
        .finally(() => {
            csrfBootstrapPromise = null;
        });

    return csrfBootstrapPromise;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const shouldSendCsrf = isMutatingMethod(method);

    if (shouldSendCsrf) {
        await ensureCsrfCookie();
    }

    const xsrfToken = shouldSendCsrf ? getCookie(CSRF_COOKIE_NAME) : null;
    const headers: Record<string, string> = {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(xsrfToken ? { "X-XSRF-TOKEN": xsrfToken } : {}),
        ...(options.headers as Record<string, string>),
    };

    // If body is NOT FormData, default to application/json
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    let response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        method,
        credentials: "include",
        headers,
    });

    if (response.status === 419 && shouldSendCsrf) {
        await ensureCsrfCookie(true);
        const retryXsrfToken = getCookie(CSRF_COOKIE_NAME);
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            method,
            credentials: "include",
            headers: {
                ...headers,
                ...(retryXsrfToken ? { "X-XSRF-TOKEN": retryXsrfToken } : {}),
            },
        });
    }

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
