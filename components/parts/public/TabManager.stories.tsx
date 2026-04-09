import type { Meta, StoryObj } from '@storybook/react';
import { TabManager } from './TabManager';
import { useState } from 'react';

const meta: Meta<typeof TabManager> = {
  title: 'Components/TabManager',
  component: TabManager,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TabManager>;

export const Default: Story = {
  args: {
    name: 'John Doe',
    setActiveTab: () => {},
    activeTab: 'community',
  },
};

export const WithStore: Story = {
  args: {
    name: 'John Doe',
    setActiveTab: () => {},
    activeTab: 'community',
    storeEnabled: true,
  },
};

export const WithAllFeatures: Story = {
  args: {
    name: 'John Doe',
    setActiveTab: () => {},
    activeTab: 'community',
    messagingEnabled: true,
    storeEnabled: true,
    giveawayEnabled: true,
    gatheringsEnabled: true,
  },
};

export const Interactive: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('community');
    return (
      <TabManager
        name="John Doe"
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        messagingEnabled
        storeEnabled
        giveawayEnabled
        gatheringsEnabled
      />
    );
  },
};
