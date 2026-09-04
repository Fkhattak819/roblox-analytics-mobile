import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = '@roblox-analytics-mobile/onboarding-complete-v1';

export async function hasCompletedOnboarding() {
  return (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) === '1';
}

export async function markOnboardingComplete() {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, '1');
}

export async function resetOnboarding() {
  await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}
