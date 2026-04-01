/**
 * Customer Auth Store (Nanostores)
 * Replaces: src/context/CustomerAuthContext.tsx
 * Works across Astro React islands — no shared React tree needed
 */
import { atom, computed } from 'nanostores';

export interface Customer {
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

// --- Core state ---
export const $customer = atom<Customer | null>(null);
export const $isAuthLoading = atom<boolean>(true);

// --- Derived ---
export const $isAuthenticated = computed($customer, (c) => c !== null);

// --- Actions ---
const API_URL = import.meta.env.PUBLIC_API_URL || '/api';

export function loginCustomer(customerData: Customer) {
  $customer.set(customerData);
}

export function logoutCustomer() {
  $customer.set(null);
}

export function updateCustomer(customerData: Customer) {
  $customer.set(customerData);
}

/**
 * Fetch current customer from API on app load.
 * Call this once from a React island or Astro client script.
 * 
 * Note: 401 responses are expected when user is not logged in.
 * We suppress these errors to keep the console clean.
 */
export async function fetchCurrentCustomer() {
  // Check for auth-specific cookie (not just XSRF-TOKEN which is always present)
  // Laravel typically sets 'laravel_session' for authenticated sessions
  // But we also need to handle cases where user might have stale cookies
  const hasAuthCookie = document.cookie.includes('laravel_session');
  
  if (!hasAuthCookie) {
    // No auth session cookie, user is definitely not logged in
    $customer.set(null);
    $isAuthLoading.set(false);
    return;
  }

  try {
    const response = await fetch(`${API_URL}/v1/customer/me`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      $customer.set(data);
    } else {
      // 401/403 means not authenticated - this is expected, not an error
      $customer.set(null);
    }
  } catch (error) {
    // Network error - silently fail, user is not authenticated
    $customer.set(null);
  } finally {
    $isAuthLoading.set(false);
  }
}
