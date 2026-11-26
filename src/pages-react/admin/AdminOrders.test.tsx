import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import AdminOrders from './AdminOrders';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn(), API_URL: '/api' }));
const fetchMock = vi.mocked(apiFetch);
const order = (id: number, name: string) => ({ id, order_number: `ORDER-${id}`, customer_name: name, customer_email: 'qa@example.com', created_at: '2026-10-22', total: '10.00', status: 'pending', payment_status: 'pending' });

describe('admin order access beyond the first page', () => {
  beforeEach(() => fetchMock.mockReset());
  afterEach(cleanup);

  it('loads the next page and searches all orders from page one', async () => {
    fetchMock.mockResolvedValueOnce({ data: [order(16, 'Recent buyer')], total: 16, last_page: 2 })
      .mockResolvedValueOnce({ data: [order(1, 'Older buyer')], total: 16, last_page: 2 })
      .mockResolvedValueOnce({ data: [order(1, 'Older buyer')], total: 1, last_page: 1 });
    render(<AdminOrders />);
    await screen.findByText('Recent buyer');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Older buyer');
    expect(fetchMock).toHaveBeenLastCalledWith('/admin/orders?page=2');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search orders' }), { target: { value: 'Older' } });
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/admin/orders?page=1&search=Older'));
    await screen.findByText('Page 1 of 1 · 1 orders');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('sends the status with the search and allows retry after a failure', async () => {
    fetchMock.mockResolvedValueOnce({ data: [], total: 0, last_page: 1 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: [], total: 0, last_page: 1 });
    render(<AdminOrders />);
    await screen.findByText('No orders found.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search orders' }), { target: { value: 'buyer' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Order status' }), { target: { value: 'shipped' } });
    await screen.findByRole('alert');
    expect(fetchMock).toHaveBeenLastCalledWith('/admin/orders?page=1&search=buyer&status=shipped');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('No orders found.');
  });

  it('shows saved order details without actions for the retired shipping provider', async () => {
    const saved = {
      ...order(1, 'Previous buyer'), shipping_provider: 'easypost', tracking_number: 'old-tracking',
      shipping_label_url: 'https://old-provider.example/label.pdf', shipping: '6.50',
      items: [{ product_name: 'Existing product', product_price: '£10.00', quantity: 1 }],
    };
    fetchMock.mockResolvedValueOnce({ data: [saved], total: 1, last_page: 1 }).mockResolvedValueOnce(saved);
    render(<AdminOrders />);
    fireEvent.click(await screen.findByRole('button', { name: 'View ORDER-1' }));
    await screen.findByDisplayValue('old-tracking');
    expect(screen.getByText('1x Existing product')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Refresh tracking|Create Label|Regenerate Label|Cancel Label|Book collection/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download Label/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/EasyPost test tracking codes/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('offers booking and tracking for Interparcel orders', async () => {
    const saved = { ...order(1, 'New buyer'), shipping_provider: 'interparcel', shipping: '12.00', payment_status: 'paid' };
    fetchMock.mockResolvedValueOnce({ data: [saved], total: 1, last_page: 1 }).mockResolvedValueOnce(saved);
    render(<AdminOrders />);
    fireEvent.click(await screen.findByRole('button', { name: 'View ORDER-1' }));
    expect(await screen.findByRole('button', { name: 'Book collection / recover booking' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Refresh tracking' })).toBeEnabled();
    expect(screen.getByPlaceholderText('Assigned by Interparcel')).toHaveAttribute('readonly');
  });
});
