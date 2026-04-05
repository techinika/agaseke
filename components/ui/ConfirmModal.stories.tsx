import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmModal } from './ConfirmModal';

const meta: Meta<typeof ConfirmModal> = {
  title: 'UI/ConfirmModal',
  component: ConfirmModal,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['danger', 'warning', 'info'],
    },
    isOpen: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmModal>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed with this action? This cannot be undone.',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm'),
  },
};

export const Warning: Story = {
  args: {
    isOpen: true,
    title: 'Warning',
    message: 'This action will modify your settings.',
    confirmText: 'Continue',
    cancelText: 'Go Back',
    variant: 'warning',
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm'),
  },
};

export const Info: Story = {
  args: {
    isOpen: true,
    title: 'Information',
    message: 'Would you like to enable notifications?',
    confirmText: 'Enable',
    cancelText: 'Not Now',
    variant: 'info',
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm'),
  },
};

export const Loading: Story = {
  args: {
    isOpen: true,
    title: 'Processing',
    message: 'Please wait while we process your request.',
    confirmText: 'Processing...',
    cancelText: 'Cancel',
    variant: 'danger',
    loading: true,
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm'),
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    title: 'Confirm Action',
    message: 'This should not be visible.',
    onClose: () => console.log('Close'),
    onConfirm: () => console.log('Confirm'),
  },
};
