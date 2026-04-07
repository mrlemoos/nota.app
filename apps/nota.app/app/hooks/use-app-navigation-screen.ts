import { useLayoutEffect, useState } from 'react';
import {
  parseAppNavFromLocation,
  subscribeAppNavigation,
  type AppNavScreen,
} from '../lib/app-navigation';

export function useAppNavigationScreen(): AppNavScreen {
  const [screen, setScreen] = useState<AppNavScreen>(() =>
    typeof window === 'undefined'
      ? { kind: 'landing' }
      : parseAppNavFromLocation(),
  );

  useLayoutEffect(() => {
    setScreen(parseAppNavFromLocation());
    return subscribeAppNavigation(setScreen);
  }, []);

  return screen;
}
