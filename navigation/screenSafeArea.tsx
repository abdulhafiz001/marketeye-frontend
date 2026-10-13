import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
});

/** Tab / headerless stacks: top + sides; bottom handled by tab bar insets. */
export const TAB_STACK_SAFE_EDGES: Edge[] = ['top', 'left', 'right'];

/** Auth, onboarding, full-bleed flows. */
export const FULL_SCREEN_SAFE_EDGES: Edge[] = ['top', 'left', 'right', 'bottom'];

/** Screens under a stack header (header covers status bar). */
export const HEADER_STACK_SAFE_EDGES: Edge[] = ['left', 'right', 'bottom'];

type ScreenLayoutProps = {
  children: React.ReactNode;
};

export function ScreenSafeArea({
  children,
  edges,
  style,
}: {
  children: React.ReactNode;
  edges: Edge[];
  style?: object;
}) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

export function createStackScreenLayout(edges: Edge[]) {
  return function StackScreenLayout({ children }: ScreenLayoutProps) {
    return <ScreenSafeArea edges={edges}>{children}</ScreenSafeArea>;
  };
}

export const tabStackScreenLayout = createStackScreenLayout(TAB_STACK_SAFE_EDGES);
export const fullScreenStackLayout = createStackScreenLayout(FULL_SCREEN_SAFE_EDGES);
export const headerStackScreenLayout = createStackScreenLayout(HEADER_STACK_SAFE_EDGES);

/** Pass-through layout (screen supplies its own safe area, e.g. modals). */
export function passthroughScreenLayout({ children }: ScreenLayoutProps) {
  return <View style={styles.root}>{children}</View>;
}

export function withScreenSafeArea<P extends object>(
  Component: React.ComponentType<P>,
  edges: Edge[] = TAB_STACK_SAFE_EDGES,
) {
  function Wrapped(props: P) {
    return (
      <ScreenSafeArea edges={edges}>
        <Component {...props} />
      </ScreenSafeArea>
    );
  }
  Wrapped.displayName = `WithScreenSafeArea(${Component.displayName || Component.name || 'Screen'})`;
  return Wrapped;
}
