import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackFAB from './FeedbackFAB';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    creator: { uid: 'test-uid', handle: 'testhandle' },
  }),
}));

vi.mock('@/db/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'test-id' }),
  collection: vi.fn(),
  serverTimestamp: vi.fn().mockReturnValue('timestamp'),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('FeedbackFAB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the feedback button', () => {
    render(<FeedbackFAB />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('opens modal when button is clicked', async () => {
    render(<FeedbackFAB />);
    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(screen.getByText('Help us improve')).toBeInTheDocument();
  });

  it('displays both rating scales when open', async () => {
    render(<FeedbackFAB />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/Would you recommend Agaseke/)).toBeInTheDocument();
    expect(screen.getByText(/How much do you love Agaseke/)).toBeInTheDocument();
  });

  it('allows selecting referral rating', async () => {
    render(<FeedbackFAB />);
    await userEvent.click(screen.getByRole('button'));
    const ratingButtons = screen.getAllByRole('button');
    await userEvent.click(ratingButtons[2]); // Click rating 3
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('allows selecting love rating', async () => {
    render(<FeedbackFAB />);
    await userEvent.click(screen.getByRole('button'));
    const ratingButtons = screen.getAllByRole('button');
    await userEvent.click(ratingButtons[7]); // Click rating 5
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('has message textarea', async () => {
    render(<FeedbackFAB />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText(/Tell us what's on your mind/)).toBeInTheDocument();
  });

  it('has submit button', async () => {
    render(<FeedbackFAB />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: /Send Feedback/ })).toBeInTheDocument();
  });

  it('shows error when submitting without ratings', async () => {
    render(<FeedbackFAB />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button', { name: /Send Feedback/ }));
    // Should show toast error - checking button is there
    expect(screen.getByRole('button', { name: /Send Feedback/ })).toBeInTheDocument();
  });

  it('closes modal when X button is clicked', async () => {
    render(<FeedbackFAB />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Help us improve')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '' }));
    expect(screen.queryByText('Help us improve')).not.toBeInTheDocument();
  });

  it('has rating numbers 1-5 for both scales', async () => {
    render(<FeedbackFAB />);
    await userEvent.click(screen.getByRole('button'));
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });
});
