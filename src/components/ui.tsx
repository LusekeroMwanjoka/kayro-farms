import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from '../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
export function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

export function SyncChip({ status = 'Synced' }: { status?: 'Synced' | 'Pending' | 'Failed' }) {
  const bg = status === 'Synced' ? colors.leaf : status === 'Pending' ? colors.gold : colors.alert;
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={s.chipText}>{status}</Text>
    </View>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={s.h1}>{title}</Text>
        {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
      </View>
      <SyncChip />
    </View>
  );
}

export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
    </View>
  );
}

export function KpiRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={s.row}>
      {items.map((i) => (
        <KpiCard key={i.label} {...i} />
      ))}
    </View>
  );
}

export function InfoCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      {title ? <Text style={s.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <Screen>
      <ScreenHeader title={title} />
      <InfoCard>
        <Body>{note}</Body>
      </InfoCard>
    </Screen>
  );
}

export function ActionTile({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [s.tile, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button">
      <MaterialCommunityIcons name={icon} size={30} color={colors.forest} />
      <Text style={s.tileLabel}>{label}</Text>
    </Pressable>
  );
}

export function ActionGrid({ items }: { items: { icon: IconName; label: string; onPress?: () => void }[] }) {
  return (
    <View style={s.grid}>
      {items.map((i) => (
        <ActionTile key={i.label} {...i} />
      ))}
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        primary ? { backgroundColor: colors.forest } : { borderWidth: 1.5, borderColor: colors.forest },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? colors.white : colors.forest} />
      ) : (
        <Text style={[s.btnText, { color: primary ? colors.white : colors.forest }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  content: { padding: space.md, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  h1: { fontSize: 26, fontWeight: '700', color: colors.forest },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { color: colors.white, fontWeight: '600', fontSize: 12 },
  row: { flexDirection: 'row', gap: space.sm },
  kpi: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.line },
  kpiLabel: { fontSize: 12, color: colors.muted },
  kpiValue: { fontSize: 18, fontWeight: '700', color: colors.charcoal, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.line },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.charcoal },
  body: { fontSize: 15, color: colors.charcoal, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    width: '48%',
    minHeight: 96,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: space.md,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
  },
  tileLabel: { fontSize: 15, fontWeight: '600', color: colors.charcoal },
  btn: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  btnText: { fontSize: 16, fontWeight: '700' },
});
