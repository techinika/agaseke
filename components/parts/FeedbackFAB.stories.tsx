import type { Meta, StoryObj } from '@storybook/react';
import FeedbackFAB from './FeedbackFAB';

const meta: Meta<typeof FeedbackFAB> = {
  title: 'Components/FeedbackFAB',
  component: FeedbackFAB,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof FeedbackFAB>;

export const Default: Story = {
  render: () => <FeedbackFAB />,
};

export const Open: Story = {
  render: () => {
    return <FeedbackFAB />;
  },
};
