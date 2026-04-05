import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SupportPerks } from './SupportPerks';

describe('SupportPerks', () => {
  it('renders creator name', () => {
    render(<SupportPerks name="John Doe" />);
    expect(screen.getByText(/John/)).toBeInTheDocument();
  });

  it('renders all perk titles', () => {
    render(<SupportPerks name="John Doe" />);
    expect(screen.getByText('Private Contents')).toBeInTheDocument();
    expect(screen.getByText('Early Access')).toBeInTheDocument();
    expect(screen.getByText('Private Gatherings')).toBeInTheDocument();
    expect(screen.getByText('Direct Connection')).toBeInTheDocument();
  });

  it('renders all perk descriptions', () => {
    render(<SupportPerks name="John Doe" />);
    expect(screen.getByText(/Access daily life updates/)).toBeInTheDocument();
    expect(screen.getByText(/Be the first to see new content/)).toBeInTheDocument();
    expect(screen.getByText(/exclusive invites/)).toBeInTheDocument();
    expect(screen.getByText(/Top gifters get direct messaging/)).toBeInTheDocument();
  });

  it('renders section title with star icon', () => {
    render(<SupportPerks name="John Doe" />);
    expect(screen.getByText(/Why Send a Gift to/)).toBeInTheDocument();
  });
});
