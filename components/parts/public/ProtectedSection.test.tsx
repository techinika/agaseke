import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProtectedSection } from './ProtectedSection';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ProtectedSection', () => {
  it('renders login required message when not logged in', () => {
    render(
      <ProtectedSection isLoggedIn={false} hasGifted={false} type="login" setIsModalOpen={vi.fn()} />
    );
    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Log In to Agaseke')).toBeInTheDocument();
  });

  it('renders gift required message when logged in but has not gifted', () => {
    render(
      <ProtectedSection isLoggedIn={true} hasGifted={false} type="gift" setIsModalOpen={vi.fn()} />
    );
    expect(screen.getByText('Send a Gift to Unlock')).toBeInTheDocument();
    expect(screen.getByText('Send a Gift')).toBeInTheDocument();
  });

  it('calls setIsModalOpen when gift button is clicked', () => {
    const mockSetIsModalOpen = vi.fn();
    render(
      <ProtectedSection isLoggedIn={true} hasGifted={false} type="gift" setIsModalOpen={mockSetIsModalOpen} />
    );
    fireEvent.click(screen.getByText('Send a Gift'));
    expect(mockSetIsModalOpen).toHaveBeenCalledWith(true);
  });

  it('renders nothing when logged in and has gifted', () => {
    const { container } = render(
      <ProtectedSection isLoggedIn={true} hasGifted={true} type="gift" setIsModalOpen={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when logged in with type login', () => {
    const { container } = render(
      <ProtectedSection isLoggedIn={true} hasGifted={false} type="login" setIsModalOpen={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
