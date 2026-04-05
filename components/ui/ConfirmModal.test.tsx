import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Test Title',
    message: 'Test message content',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('displays custom confirm and cancel text', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmText="Yes, proceed"
        cancelText="No, go back"
      />
    );
    expect(screen.getByText('Yes, proceed')).toBeInTheDocument();
    expect(screen.getByText('No, go back')).toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    render(<ConfirmModal {...defaultProps} loading />);
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton.parentElement).toHaveClass('opacity-50');
  });

  it('disables buttons when loading is true', () => {
    render(<ConfirmModal {...defaultProps} loading />);
    const cancelButton = screen.getByText('Cancel');
    const confirmButton = screen.getByText('Confirm');
    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it('renders danger variant by default', () => {
    render(<ConfirmModal {...defaultProps} />);
    const iconContainer = screen.getByRole('button', { name: '' }).parentElement;
    expect(iconContainer?.firstChild).toHaveClass('bg-red-50');
  });

  it('renders warning variant correctly', () => {
    render(<ConfirmModal {...defaultProps} variant="warning" />);
    const iconContainer = screen.getByRole('button', { name: '' }).parentElement;
    expect(iconContainer?.firstChild).toHaveClass('bg-orange-50');
  });

  it('renders info variant correctly', () => {
    render(<ConfirmModal {...defaultProps} variant="info" />);
    const iconContainer = screen.getByRole('button', { name: '' }).parentElement;
    expect(iconContainer?.firstChild).toHaveClass('bg-blue-50');
  });

  it('calls onClose when X button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
