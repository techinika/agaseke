import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommunityTab } from './CommunityTab';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    creator: null,
    profile: { handle: 'testuser' },
  }),
}));

vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

describe('CommunityTab', () => {
  const mockCreator = {
    uid: 'creator-123',
    name: 'John Doe',
    handle: 'johndoe',
    bio: 'Test bio',
    supporters: [],
    events: [],
    perks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders community tab', () => {
    render(<CommunityTab creator={mockCreator as any} isSupporter={false} />);
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it('renders supporter count', () => {
    const creatorWithSupporters = {
      ...mockCreator,
      supporters: [{ id: '1' }, { id: '2' }],
    };
    render(<CommunityTab creator={creatorWithSupporters as any} isSupporter={false} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows bio when available', () => {
    render(<CommunityTab creator={mockCreator as any} isSupporter={false} />);
    expect(screen.getByText('Test bio')).toBeInTheDocument();
  });
});
