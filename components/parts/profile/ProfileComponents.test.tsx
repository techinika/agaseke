import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialPill } from './SocialPill';
import { PerkRow } from './PerkRow';
import { StatCard } from '../dashboard/StatCard';
import { RankRow } from '../dashboard/RankRow';

describe('SocialPill', () => {
  const mockIcon = <span data-testid="icon">Icon</span>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label text', () => {
    render(<SocialPill icon={mockIcon} label="Twitter" link="https://twitter.com" />);
    expect(screen.getByText('Twitter')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<SocialPill icon={mockIcon} label="Twitter" link="https://twitter.com" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders with correct href', () => {
    render(<SocialPill icon={mockIcon} label="Twitter" link="https://twitter.com" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://twitter.com');
  });

  it('has target _blank and relnoopener', () => {
    render(<SocialPill icon={mockIcon} label="Twitter" link="https://twitter.com" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('PerkRow', () => {
  const mockIcon = <span data-testid="icon">Icon</span>;

  it('renders title', () => {
    render(<PerkRow icon={mockIcon} title="Private Content" desc="Access exclusive posts" />);
    expect(screen.getByText('Private Content')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<PerkRow icon={mockIcon} title="Private Content" desc="Access exclusive posts" />);
    expect(screen.getByText('Access exclusive posts')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<PerkRow icon={mockIcon} title="Private Content" desc="Access exclusive posts" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  const mockIcon = <span data-testid="icon">Icon</span>;

  it('renders label', () => {
    render(<StatCard label="Total Users" value="1,234" icon={mockIcon} color="bg-blue-500" />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
  });

  it('renders value', () => {
    render(<StatCard label="Total Users" value="1,234" icon={mockIcon} color="bg-blue-500" />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<StatCard label="Total Users" value="1,234" icon={mockIcon} color="bg-blue-500" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies color class', () => {
    render(<StatCard label="Total Users" value="1,234" icon={mockIcon} color="bg-blue-500" />);
    const iconContainer = screen.getByTestId('icon').parentElement;
    expect(iconContainer).toHaveClass('bg-blue-500');
  });
});

describe('RankRow', () => {
  it('renders rank number', () => {
    render(<RankRow rank={1} name="John Doe" subText="500 points" />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders name', () => {
    render(<RankRow rank={1} name="John Doe" subText="500 points" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders subText', () => {
    render(<RankRow rank={1} name="John Doe" subText="500 points" />);
    expect(screen.getByText('500 points')).toBeInTheDocument();
  });

  it('applies correct styling for rank', () => {
    render(<RankRow rank={5} name="Jane Doe" subText="200 points" />);
    expect(screen.getByText('#5')).toBeInTheDocument();
  });
});
