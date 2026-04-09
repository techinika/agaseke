import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabManager } from './TabManager';

describe('TabManager', () => {
  const mockSetActiveTab = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Community tab by default', () => {
    render(<TabManager name="John Doe" setActiveTab={mockSetActiveTab} activeTab="community" />);
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('renders Message tab', () => {
    render(<TabManager name="John Doe" setActiveTab={mockSetActiveTab} activeTab="community" messagingEnabled />);
    expect(screen.getByText(/Message John/)).toBeInTheDocument();
  });

  it('renders Store tab when enabled', () => {
    render(<TabManager name="John Doe" setActiveTab={mockSetActiveTab} activeTab="community" storeEnabled />);
    expect(screen.getByText('Store')).toBeInTheDocument();
  });

  it('renders Giveaways tab when enabled', () => {
    render(<TabManager name="John Doe" setActiveTab={mockSetActiveTab} activeTab="community" giveawayEnabled />);
    expect(screen.getByText('Giveaways')).toBeInTheDocument();
  });

  it('renders Gatherings/Events tab when enabled', () => {
    render(<TabManager name="John Doe" setActiveTab={mockSetActiveTab} activeTab="community" gatheringsEnabled />);
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('calls setActiveTab when tab is clicked', () => {
    render(<TabManager name="John Doe" setActiveTab={mockSetActiveTab} activeTab="community" storeEnabled />);
    fireEvent.click(screen.getByText('Store'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('store');
  });

  it('does not render Store tab when disabled', () => {
    render(<TabManager name="John Doe" setActiveTab={mockSetActiveTab} activeTab="community" storeEnabled={false} />);
    expect(screen.queryByText('Store')).not.toBeInTheDocument();
  });

  it('does not render Message tab when disabled', () => {
    render(<TabManager name="John Doe" setActiveTab={mockSetActiveTab} activeTab="community" messagingEnabled={false} />);
    expect(screen.queryByText(/Message/)).not.toBeInTheDocument();
  });

  it('applies active styling to active tab', () => {
    render(<TabManager name="John Doe" setActiveTab={mockSetActiveTab} activeTab="community" />);
    const communityTab = screen.getByText('Community');
    expect(communityTab.closest('button')).toHaveClass('border-orange-600');
  });

  it('renders all tabs when all are enabled', () => {
    render(
      <TabManager
        name="John Doe"
        setActiveTab={mockSetActiveTab}
        activeTab="community"
        messagingEnabled
        storeEnabled
        giveawayEnabled
        gatheringsEnabled
      />
    );
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Store')).toBeInTheDocument();
    expect(screen.getByText('Giveaways')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText(/Message John/)).toBeInTheDocument();
  });
});
