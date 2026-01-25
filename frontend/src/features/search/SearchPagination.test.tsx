import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import SearchPagination from './SearchPagination';

describe('SearchPagination Component', () => {
  const mockOnPageChange = vi.fn();

  const defaultProps = {
    page: 0,
    limit: 20,
    total: 100,
    hasMore: true,
    onPageChange: mockOnPageChange,
  };

  const renderComponent = (props = defaultProps) => {
    return render(<SearchPagination {...props} />);
  };

  it('renders pagination controls', () => {
    renderComponent();

    expect(screen.getByText(/page/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous|prev/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('displays current page information', () => {
    renderComponent({
      ...defaultProps,
      page: 2,
    });

    expect(screen.getByText(/page 3/i)).toBeInTheDocument(); // 0-indexed becomes 1-indexed
  });

  it('displays total results count', () => {
    renderComponent({
      ...defaultProps,
      total: 150,
    });

    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    renderComponent({
      ...defaultProps,
      page: 0,
    });

    const prevButton = screen.getByRole('button', { name: /previous|prev/i });
    expect(prevButton).toBeDisabled();
  });

  it('enables previous button when not on first page', () => {
    renderComponent({
      ...defaultProps,
      page: 1,
    });

    const prevButton = screen.getByRole('button', { name: /previous|prev/i });
    expect(prevButton).not.toBeDisabled();
  });

  it('disables next button when hasMore is false', () => {
    renderComponent({
      ...defaultProps,
      page: 4,
      hasMore: false,
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('enables next button when hasMore is true', () => {
    renderComponent({
      ...defaultProps,
      page: 0,
      hasMore: true,
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).not.toBeDisabled();
  });

  it('calls onPageChange with previous page number', async () => {
    const user = userEvent.setup();
    renderComponent({
      ...defaultProps,
      page: 2,
    });

    const prevButton = screen.getByRole('button', { name: /previous|prev/i });
    await user.click(prevButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with next page number', async () => {
    const user = userEvent.setup();
    renderComponent({
      ...defaultProps,
      page: 0,
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('displays results per page info', () => {
    renderComponent({
      ...defaultProps,
      limit: 20,
    });

    expect(screen.getByText(/20 per page/i)).toBeInTheDocument();
  });

  it('calculates correct total pages', () => {
    renderComponent({
      ...defaultProps,
      limit: 20,
      total: 100,
    });

    expect(screen.getByText(/of 5/i)).toBeInTheDocument(); // 100 / 20 = 5 pages
  });

  it('shows results range on current page', () => {
    renderComponent({
      ...defaultProps,
      page: 1,
      limit: 20,
      total: 100,
    });

    expect(screen.getByText(/21.*40/)).toBeInTheDocument(); // Results 21-40
  });

  it('handles partial last page correctly', () => {
    renderComponent({
      ...defaultProps,
      page: 2,
      limit: 20,
      total: 45,
    });

    expect(screen.getByText(/41.*45/)).toBeInTheDocument(); // Results 41-45
  });

  it('renders page size selector', () => {
    renderComponent();

    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });

  it('handles sequential page navigation', async () => {
    const user = userEvent.setup();
    renderComponent({
      ...defaultProps,
      page: 0,
    });

    const nextButton = screen.getByRole('button', { name: /next/i });

    await user.click(nextButton);
    expect(mockOnPageChange).toHaveBeenLastCalledWith(1);

    await user.click(nextButton);
    expect(mockOnPageChange).toHaveBeenLastCalledWith(2);
  });

  it('shows loading state for pagination buttons', () => {
    renderComponent({
      ...defaultProps,
      hasMore: true,
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toHaveAttribute('aria-busy', 'false');
  });

  it('disables pagination when total is 0', () => {
    renderComponent({
      ...defaultProps,
      total: 0,
    });

    const prevButton = screen.getByRole('button', { name: /previous|prev/i });
    const nextButton = screen.getByRole('button', { name: /next/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('handles edge case of single page', () => {
    renderComponent({
      ...defaultProps,
      total: 15,
      limit: 20,
      hasMore: false,
    });

    const prevButton = screen.getByRole('button', { name: /previous|prev/i });
    const nextButton = screen.getByRole('button', { name: /next/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });
});
