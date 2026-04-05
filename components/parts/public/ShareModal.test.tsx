import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareModal } from './ShareModal';

describe('ShareModal', () => {
  const defaultProps = {
    setIsShareModalOpen: vi.fn(),
    name: 'John Doe',
    username: 'johndoe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders share modal when open', () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText('Share Profile')).toBeInTheDocument();
  });

  it('renders the profile URL', () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText('https://agaseke.me/johndoe')).toBeInTheDocument();
  });

  it('renders copy button', () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Copy/ })).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Close/ })).toBeInTheDocument();
  });

  it('calls setIsShareModalOpen when close button is clicked', () => {
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Close/ }));
    expect(defaultProps.setIsShareModalOpen).toHaveBeenCalledWith(false);
  });

  it('shows success state after copying', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/ }));
    expect(await screen.findByText(/Copied/)).toBeInTheDocument();
  });
});
