// ---------------------------------------------------------------------------
// API response types — generic wrappers for Laravel API responses
// ---------------------------------------------------------------------------

/** Standard Laravel pagination envelope. */
export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;

  /** Laravel sometimes includes link objects. */
  links?: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
}

/** Standard Laravel validation error response (422). */
export interface ValidationErrorResponse {
  message: string;
  errors: Record<string, string[]>;
}

/** Generic error response shape. */
export interface ErrorResponse {
  message: string;
}

/** Generic success message response. */
export interface MessageResponse {
  message: string;
}
