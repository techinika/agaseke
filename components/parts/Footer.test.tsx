import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Footer', () => {
  it('renders footer element', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  it('renders brand name', () => {
    render(<Footer />);
    expect(screen.getByText(/agaseke/i)).toBeInTheDocument();
  });

  it('renders Terms link', () => {
    render(<Footer />);
    expect(screen.getByText('Terms')).toBeInTheDocument();
  });

  it('renders Privacy link', () => {
    render(<Footer />);
    expect(screen.getByText('Privacy')).toBeInTheDocument();
  });

  it('renders Payout Policy link', () => {
    render(<Footer />);
    expect(screen.getByText('Payout Policy')).toBeInTheDocument();
  });

  it('renders copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/copyright/i)).toBeInTheDocument();
  });

  it('renders Help Center link', () => {
    render(<Footer />);
    expect(screen.getByText('Help Center')).toBeInTheDocument();
  });

  it('renders Start a Page link', () => {
    render(<Footer />);
    expect(screen.getByText('Start a Page')).toBeInTheDocument();
  });
});
