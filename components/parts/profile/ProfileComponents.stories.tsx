import type { Meta, StoryObj } from '@storybook/react';
import { SocialPill } from './SocialPill';
import { PerkRow } from './PerkRow';
import { StatCard } from '../dashboard/StatCard';
import { RankRow } from '../dashboard/RankRow';
import { Twitter, Instagram, Youtube, Globe } from 'lucide-react';

const meta: Meta = {
  title: 'Components/Profile',
  tags: ['autodocs'],
};

export default meta;

export const SocialPillStories: StoryObj<typeof SocialPill> = {
  render: () => (
    <div className="flex flex-wrap gap-4 p-8">
      <SocialPill icon={<Twitter size={14} />} label="Twitter" link="https://twitter.com" />
      <SocialPill icon={<Instagram size={14} />} label="Instagram" link="https://instagram.com" />
      <SocialPill icon={<Youtube size={14} />} label="YouTube" link="https://youtube.com" />
      <SocialPill icon={<Globe size={14} />} label="Website" link="https://example.com" />
    </div>
  ),
};

export const PerkRowStories: StoryObj<typeof PerkRow> = {
  render: () => (
    <div className="p-8 max-w-lg space-y-4">
      <PerkRow icon={<Twitter size={20} />} title="Private Content" desc="Access daily life updates and exclusive behind-the-scenes footage." />
      <PerkRow icon={<Instagram size={20} />} title="Early Access" desc="Be the first to see new content before it hits the public feed." />
      <PerkRow icon={<Youtube size={20} />} title="Private Gatherings" desc="Get exclusive invites to intimate meetups and private events." />
    </div>
  ),
};

export const StatCardStories: StoryObj<typeof StatCard> = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 p-8">
      <StatCard label="Total Supporters" value="1,234" icon={<Twitter size={24} />} color="bg-orange-500" />
      <StatCard label="Total Earnings" value="₦ 50,000" icon={<Youtube size={24} />} color="bg-green-500" />
      <StatCard label="Active Giveaways" value="5" icon={<Globe size={24} />} color="bg-purple-500" />
      <StatCard label="Total Views" value="12.5K" icon={<Instagram size={24} />} color="bg-blue-500" />
    </div>
  ),
};

export const RankRowStories: StoryObj<typeof RankRow> = {
  render: () => (
    <div className="p-8 max-w-md space-y-4">
      <RankRow rank={1} name="Jane Doe" subText="500 points" />
      <RankRow rank={2} name="John Smith" subText="400 points" />
      <RankRow rank={3} name="Alice Johnson" subText="300 points" />
    </div>
  ),
};
