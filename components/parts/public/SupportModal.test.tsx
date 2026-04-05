import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupportModal } from './SupportModal';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user' },
  }),
}));

vi.mock('@/db/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  onSnapshot: vi.fn(() => vi.fn()),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('SupportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<SupportModal isOpen={true} onClose={vi.fn()} creatorName="John Doe" creatorId="123" uid="uid-123" includeReferral={false} />);
    expect(screen.getByText(/Send gift to John/)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<SupportModal isOpen={false} onClose={vi.fn()} creatorName="John Doe" creatorId="123" uid="uid-123" includeReferral={false} />);
    expect(screen.queryByText(/Send gift to John/)).not.toBeInTheDocument();
  });

  it('has amount input field', () => {
    render(<SupportModal isOpen={true} onClose={vi.fn()} creatorName="John Doe" creatorId="123" uid="uid-123" includeReferral={false} />);
    expect(screen.getByPlaceholderText('1000')).toBeInTheDocument();
  });

  it('has MoMo and Card payment options', () => {
    render(<SupportModal isOpen={true} onClose={vi.fn()} creatorName="John Doe" creatorId="123" uid="uid-123" includeReferral={false} />);
    expect(screen.getByText('MoMo')).toBeInTheDocument();
    expect(screen.getByText('Bank Cards')).toBeInTheDocument();
  });

  it('has phone input when MoMo is selected', () => {
    render(<SupportModal isOpen={true} onClose={vi.fn()} creatorName="John Doe" creatorId="123" uid="uid-123" includeReferral={false} />);
    expect(screen.getByPlaceholderText('078 000 0000')).toBeInTheDocument();
  });

  it('has message textarea', () => {
    render(<SupportModal isOpen={true} onClose={vi.fn()} creatorName="John Doe" creatorId="123" uid="uid-123" includeReferral={false} />);
    expect(screen.getByPlaceholderText(/Write a nice note/)).toBeInTheDocument();
  });

  it('has submit button', () => {
    render(<SupportModal isOpen={true} onClose={vi.fn()} creatorName="John Doe" creatorId="123" uid="uid-123" includeReferral={false} />);
    expect(screen.getByText('Gift with MoMo')).toBeInTheDocument();
  });

  it('switches to card payment when card option is clicked', async () => {
    render(<SupportModal isOpen={true} onClose={vi.fn()} creatorName="John Doe" creatorId="123" uid="uid-123" includeReferral={false} />);
    await userEvent.click(screen.getByText('Bank Cards'));
    expect(screen.getByText('Gift with Card')).toBeInTheDocument();
  });

  it('closes when X button is clicked', () => {
    const mockOnClose = vi.fn();
    render(<SupportModal isOpen={true} onClose={mockOnClose} creatorName="John Doe" creatorId="123" uid="uid-123" includeReferral={false} />);
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
