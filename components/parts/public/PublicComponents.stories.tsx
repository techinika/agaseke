import type { Meta, StoryObj } from '@storybook/react';
import { SupportPerks } from './SupportPerks';
import { ShareModal } from './ShareModal';
import { useState } from 'react';

const meta: Meta = {
  title: 'Components/Public',
  tags: ['autodocs'],
};

export default meta;

export const SupportPerksStory: StoryObj<typeof SupportPerks> = {
  render: () => <SupportPerks name="John Doe" />,
};

export const ShareModalStory: StoryObj<typeof ShareModal> = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <div>
        <button onClick={() => setIsOpen(true)}>Open Modal</button>
        {isOpen && (
          <ShareModal
            setIsShareModalOpen={setIsOpen}
            name="John Doe"
            username="johndoe"
          />
        )}
      </div>
    );
  },
};
