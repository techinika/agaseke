import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navigation from './Navigation';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/db/functions/LogOut', () => ({
  handleLogout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

describe('Navigation', () => {
  const mockAuth = {
    user: null,
    profile: null,
    isLoggedIn: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/auth/AuthContext').useAuth).mockReturnValue(mockAuth);
  });

  it('renders the logo', () => {
    render(<Navigation />);
    expect(screen.getByText(/agaseke/)).toBeInTheDocument();
  });

  it('renders Explore link', () => {
    render(<Navigation />);
    expect(screen.getByText('Explore')).toBeInTheDocument();
  });

  it('renders Help link', () => {
    render(<Navigation />);
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('renders Blog link', () => {
    render(<Navigation />);
    expect(screen.getByText('Blog')).toBeInTheDocument();
  });

  it('renders Sign In button when user is not logged in', () => {
    render(<Navigation />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('does not render user menu when not logged in', () => {
    render(<Navigation />);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renders user avatar when logged in', () => {
    const loggedInAuth = {
      user: { uid: '123' },
      profile: { displayName: 'John Doe', photoURL: null, type: 'creator' },
      isLoggedIn: true,
    };
    vi.mocked(require('@/auth/AuthContext').useAuth).mockReturnValue(loggedInAuth);
    render(<Navigation />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders dropdown menu when logged in user clicks avatar', async () => {
    const loggedInAuth = {
      user: { uid: '123' },
      profile: { displayName: 'John Doe', photoURL: null, type: 'creator' },
      isLoggedIn: true,
    };
    vi.mocked(require('@/auth/AuthContext').useAuth).mockReturnValue(loggedInAuth);
    render(<Navigation />);
    await userEvent.click(screen.getByText('J'));
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
