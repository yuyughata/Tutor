import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tap } from '../../src/components/Tap';
import { colors, fonts, radius, shadow } from '../../src/theme';

// expo-router doesn't export the tab bar prop type, so derive it from <Tabs tabBar>.
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type Icon = keyof typeof Ionicons.glyphMap;
const ICONS: Record<string, { on: Icon; off: Icon; label: string }> = {
  index: { on: 'home', off: 'home-outline', label: 'Home' },
  library: { on: 'book', off: 'book-outline', label: 'My books' },
  grownups: { on: 'shield-checkmark', off: 'shield-checkmark-outline', label: 'Grown-ups' },
};

/** Floating pill bar: icon-only when idle, icon + label on the active tab. */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.outer, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View style={[styles.bar, shadow.lift]} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const meta = ICONS[route.name];
          if (!meta) return null;
          const focused = state.index === i;
          return (
            <Tap
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={meta.label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
              }}
              style={[styles.item, focused && styles.itemOn]}
            >
              <Ionicons name={focused ? meta.on : meta.off} size={22} color={focused ? colors.onPurple : colors.lock} />
              {focused && <Text style={styles.label}>{meta.label}</Text>}
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="library" options={{ title: 'My books' }} />
      <Tabs.Screen name="grownups" options={{ title: 'Grown-ups' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: radius.pill, backgroundColor: colors.surface },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, minWidth: 56, paddingHorizontal: 16, borderRadius: radius.pill },
  itemOn: { backgroundColor: colors.purple, paddingHorizontal: 20 },
  label: { fontFamily: fonts.black, fontSize: 15, color: colors.onPurple },
});
