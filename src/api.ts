const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'The request could not be completed');
  return body as T;
}

export type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  capacityMl: number;
  description: string;
  imageUrl?: string;
  packingOptions?: number[];
  price?: number | null;
  priceType?: 'quote' | 'per_pack';
  availability?: 'available' | 'unavailable';
  active?: boolean;
};

export function getProducts() { return request<ApiProduct[]>('/products'); }
export function createOrder(payload: unknown) { return request<{ id: string; orderNumber: string; status: string }>('/orders', { method: 'POST', body: JSON.stringify(payload) }); }
export function createEnquiry(payload: unknown) { return request<{ id: string; status: string }>('/enquiries', { method: 'POST', body: JSON.stringify(payload) }); }
