import { Tabs } from 'expo-router';
import React from 'react';
import { ColorValue, Platform } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { HapticTab } from '@/components/haptic-tab';
import { colors, fonts } from '@/src/theme/tokens';

const tabs = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'experiences', title: 'Experiences', icon: 'experiences' },
  { name: 'analytics', title: 'Analytics', icon: 'analytics' },
  { name: 'sales', title: 'Sales', icon: 'sales' },
  { name: 'more', title: 'More', icon: 'more' },
] as const;

type StudioTabIconName = (typeof tabs)[number]['icon'];

function StudioTabIcon({ name, color }: { name: StudioTabIconName; color: ColorValue }) {
  if (name === 'home') {
    return (
      <Svg height={21} viewBox="0 0 24 24" width={21}>
        <Path
          d="M3.5 10.2 12 2.9l8.5 7.3v9.1c0 1-.8 1.8-1.8 1.8h-4.3v-6.4H9.6v6.4H5.3c-1 0-1.8-.8-1.8-1.8v-9.1Z"
          fill="none"
          stroke={color}
          strokeLinejoin="round"
          strokeWidth={2.25}
        />
      </Svg>
    );
  }

  if (name === 'experiences') {
    return (
      <Svg height={21} viewBox="0 0 24 24" width={21}>
        <Rect fill="none" height={18} rx={2.6} stroke={color} strokeWidth={2.25} width={20} x={2} y={3} />
        <Path
          d="m4.8 17 4.1-4.1 3.2 3.1 4.1-5.1 3 3.1"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.25}
        />
      </Svg>
    );
  }

  if (name === 'analytics') {
    return (
      <Svg height={21} viewBox="0 0 24 24" width={21}>
        <Line stroke={color} strokeLinecap="round" strokeWidth={2.6} x1={5.2} x2={5.2} y1={10.4} y2={20} />
        <Line stroke={color} strokeLinecap="round" strokeWidth={2.6} x1={12} x2={12} y1={3.7} y2={20} />
        <Line stroke={color} strokeLinecap="round" strokeWidth={2.6} x1={18.8} x2={18.8} y1={7.2} y2={20} />
      </Svg>
    );
  }

  if (name === 'sales') {
    return (
      <Svg height={21} viewBox="0 0 24 24" width={21}>
        <Path
          d="M5.1 8.3h13.8l-1 12.4H6.1L5.1 8.3Z"
          fill="none"
          stroke={color}
          strokeLinejoin="round"
          strokeWidth={2.25}
        />
        <Path
          d="M8.6 8.3V6.5a3.4 3.4 0 0 1 6.8 0v1.8"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={2.25}
        />
      </Svg>
    );
  }

  return (
    <Svg height={21} viewBox="0 0 24 24" width={21}>
      <Circle cx={5} cy={12} fill={color} r={1.65} />
      <Circle cx={12} cy={12} fill={color} r={1.65} />
      <Circle cx={19} cy={12} fill={color} r={1.65} />
    </Svg>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: Platform.OS === 'android' ? 64 : 78,
          paddingTop: 7,
          paddingBottom: Platform.OS === 'android' ? 7 : 17,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
        },
        tabBarIconStyle: { width: 21, height: 21 },
        tabBarItemStyle: { paddingTop: 0 },
        tabBarLabelStyle: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 12, marginTop: 2 },
      }}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <StudioTabIcon color={color} name={tab.icon} />,
          }}
        />
      ))}
    </Tabs>
  );
}
