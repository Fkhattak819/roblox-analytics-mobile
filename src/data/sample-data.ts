import type { ImageSourcePropType } from 'react-native';

export type Experience = {
  id: string;
  name: string;
  creator: string;
  image: ImageSourcePropType;
  ccu: number;
  revenue: number;
  plays: number;
  status: 'Live' | 'Private';
  health: 'Healthy' | 'Watch';
  accent: string;
};

export const experiences: Experience[] = [
  {
    id: 'most-words-win',
    name: 'Most Words Win',
    creator: 'BrainNourish Studios',
    image: require('../../assets/experiences/most_words_win.png'),
    ccu: 884,
    revenue: 2840,
    plays: 12840,
    status: 'Live',
    health: 'Healthy',
    accent: '#6283FF',
  },
  {
    id: 'fling-squishies',
    name: 'Fling Squishies',
    creator: 'Squishy Works',
    image: require('../../assets/experiences/fling_squishies.png'),
    ccu: 400,
    revenue: 1960,
    plays: 8740,
    status: 'Live',
    health: 'Healthy',
    accent: '#F29D63',
  },
  {
    id: 'wiggles-park',
    name: "Wiggle's Park",
    creator: 'BrainNourish Studios',
    image: require('../../assets/experiences/wiggles_park.png'),
    ccu: 263,
    revenue: 940,
    plays: 5290,
    status: 'Live',
    health: 'Watch',
    accent: '#4FD18A',
  },
  {
    id: 'ragdoll-arena',
    name: 'Ragdoll Arena',
    creator: 'BrainNourish Studios',
    image: require('../../assets/experiences/ragdoll_arena.png'),
    ccu: 172,
    revenue: 510,
    plays: 3120,
    status: 'Live',
    health: 'Healthy',
    accent: '#A98BFF',
  },
  {
    id: 'squishy-collectors',
    name: 'Squishy Collectors',
    creator: 'Squishy Works',
    image: require('../../assets/experiences/squishy_collectors.png'),
    ccu: 96,
    revenue: 290,
    plays: 1940,
    status: 'Live',
    health: 'Healthy',
    accent: '#65C7D9',
  },
];

export const groups = [
  {
    id: 'brainnourish',
    name: 'BrainNourish Studios',
    members: '12 members',
    image: require('../../assets/experiences/brainnourish_studios.png'),
  },
  {
    id: 'squishy-works',
    name: 'Squishy Works',
    members: '6 members',
    image: require('../../assets/experiences/squishy_works.png'),
  },
];

export const portfolioTrend = [820, 790, 910, 870, 940, 985, 970, 1090, 1040, 1160, 1210, 1284];
export const revenueTrend = [34, 41, 39, 48, 44, 55, 61, 58, 72, 69, 78, 84];
export const playersTrend = [7800, 8200, 7900, 9100, 9400, 10100, 9900, 11000, 11300, 11900, 12100, 12840];

export const analyticsSections = [
  { id: 'engagement', title: 'Engagement', subtitle: 'Sessions, playtime, stickiness', icon: 'pulse-outline', value: '18.4m', change: '+8.2%', color: '#6283FF' },
  { id: 'retention', title: 'Retention', subtitle: 'Day 1, Day 7, Day 30', icon: 'repeat-outline', value: '24.8%', change: '+1.9%', color: '#A98BFF' },
  { id: 'acquisition', title: 'Acquisition', subtitle: 'Sources and conversion', icon: 'funnel-outline', value: '42.1K', change: '+12.4%', color: '#65C7D9' },
  { id: 'monetization', title: 'Monetization', subtitle: 'Revenue and payers', icon: 'diamond-outline', value: 'R$ 4.8K', change: '+6.7%', color: '#4FD18A' },
  { id: 'audience', title: 'Audience', subtitle: 'Regions and devices', icon: 'people-outline', value: '63.2K', change: '+5.1%', color: '#F3C65B' },
  { id: 'performance', title: 'Performance', subtitle: 'Crashes and server health', icon: 'speedometer-outline', value: '99.7%', change: 'Healthy', color: '#F29D63' },
] as const;

export type Product = {
  id: string;
  name: string;
  type: 'Game pass' | 'Developer product';
  price: number;
  sales: number;
  revenue: number;
};

export const products: Product[] = [
  { id: 'vip-pass', name: 'VIP Pass', type: 'Game pass', price: 499, sales: 48, revenue: 23952 },
  { id: 'double-coins', name: 'Double Coins', type: 'Game pass', price: 299, sales: 65, revenue: 19435 },
  { id: 'coin-pack-xl', name: 'Coin Pack XL', type: 'Developer product', price: 799, sales: 21, revenue: 16779 },
  { id: 'revive', name: 'Instant Revive', type: 'Developer product', price: 49, sales: 186, revenue: 9114 },
];

export type Sale = {
  id: string;
  product: string;
  experience: string;
  price: number;
  time: string;
  status: 'Official' | 'Preliminary';
};

export const liveSales: Sale[] = [
  { id: 'sale-1048', product: 'VIP Pass', experience: 'Most Words Win', price: 499, time: 'Now', status: 'Preliminary' },
  { id: 'sale-1047', product: 'Double Coins', experience: 'Most Words Win', price: 299, time: '1m ago', status: 'Preliminary' },
  { id: 'sale-1046', product: 'Instant Revive', experience: 'Fling Squishies', price: 49, time: '3m ago', status: 'Official' },
  { id: 'sale-1045', product: 'Coin Pack XL', experience: 'Most Words Win', price: 799, time: '6m ago', status: 'Official' },
  { id: 'sale-1044', product: 'VIP Pass', experience: 'Fling Squishies', price: 499, time: '9m ago', status: 'Official' },
];

export const notificationMilestones = [100, 500, 1000, 5000];
