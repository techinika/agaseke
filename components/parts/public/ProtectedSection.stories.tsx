import type { Meta, StoryObj } from '@storybook/react';
import { ProtectedSection } from './ProtectedSection';
import { useState } from 'react';

const meta: Meta<typeof ProtectedSection> = {
  title: 'Components/ProtectedSection',
  component: ProtectedSection,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProtectedSection>;

export const LoginRequired: Story = {
  args: {
    isLoggedIn: false,
    hasGifted: false,
    type: 'login',
    setIsModalOpen: () => {},
  },
};

export const GiftRequired: Story = {
  args: {
    isLoggedIn: true,
    hasGifted: false,
    type: 'gift',
    setIsModalOpen: () => console.log('Open modal'),
  },
};

export const Unlocked: Story = {
  args: {
    isLoggedIn: true,
    hasGifted: true,
    type: 'gift',
    setIsModalOpen: () => {},
  },
};

export const Interactive: Story = {
  render: () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    return (
      <div>
        <button onClick={() => setIsModalOpen(true)}>Open Gift Modal</button>
        <ProtectedSection
          isLoggedIn={true}
          hasGifted={false}
          type="gift"
          setIsModalOpen={setIsModalOpen}
        />
      </div>
    );
  },
};
