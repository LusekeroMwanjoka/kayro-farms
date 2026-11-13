import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { InfoCard, Screen, SectionHeading, StatusPill, greeting, todayLabel } from '../../components/ui';
import { colors, radius } from '../../theme';

const shortcuts = [
  { label: 'Review stock', note: 'Browse farm products', icon: 'warehouse' as const, route: '/owner/stock' as const },
  { label: 'Farm finances', note: 'Sales, payments and expenses', icon: 'cash-multiple' as const, route: '/owner/money' as const },
  { label: 'Daily approvals', note: 'Review manager submissions', icon: 'clipboard-check-outline' as const, route: '/owner/approvals' as const },
];

export default function Overview() {
  const { profile, productCount } = useAuth();
  const router = useRouter();
  const first = profile?.full_name?.trim().split(' ')[0] ?? '';
  return (
    <Screen>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{todayLabel()}</Text>
          <Text style={s.title}>{greeting()}{first ? `, ${first}` : ''}</Text>
          <Text style={s.subtitle}>Your farm overview</Text>
        </View>
        <View style={s.avatar}><MaterialCommunityIcons name="account-cowboy-hat-outline" size={23} color={colors.forest} /></View>
      </View>

      <View style={s.hero}>
        <View style={s.heroTop}><View style={s.heroIcon}><MaterialCommunityIcons name="sprout" size={21} color={colors.forest} /></View><StatusPill label="Owner view" /></View>
        <Text style={s.heroTitle}>A clearer view of your farm</Text>
        <Text style={s.heroCopy}>Review records from the farm team, keep an eye on stock and follow the money.</Text>
        <View style={s.divider} />
        <View style={s.metric}><Text style={s.metricLabel}>Active products</Text><Text style={s.metricValue}>{productCount ?? '—'}</Text></View>
      </View>

      <SectionHeading title="Farm management" />
      {shortcuts.map((item) => (
        <Pressable key={item.label} onPress={() => router.navigate(item.route)} style={({ pressed }) => [s.linkCard, pressed && { opacity: 0.75 }]} accessibilityRole="button">
          <View style={s.linkIcon}><MaterialCommunityIcons name={item.icon} size={21} color={colors.forest} /></View>
          <View style={{ flex: 1 }}><Text style={s.linkTitle}>{item.label}</Text><Text style={s.linkNote}>{item.note}</Text></View>
          <MaterialCommunityIcons name="chevron-right" size={21} color={colors.muted} />
        </Pressable>
      ))}

      <InfoCard>
        <View style={s.infoRow}><MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.forest} /><Text style={s.infoTitle}>Your records stay connected</Text></View>
        <Text style={s.infoCopy}>Sales, stock movements, payments and farm activities are designed to build one shared farm history.</Text>
      </InfoCard>
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  eyebrow: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  title: { color: colors.charcoal, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  avatar: { height: 44, width: 44, borderRadius: 16, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  hero: { borderRadius: radius.lg, backgroundColor: colors.softGreen, padding: 18, gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.charcoal, fontSize: 20, fontWeight: '700', marginTop: 3 },
  heroCopy: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  divider: { height: 1, backgroundColor: '#DCE8D8', marginTop: 5 },
  metric: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { color: colors.muted, fontSize: 13 },
  metricValue: { color: colors.charcoal, fontSize: 19, fontWeight: '700' },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 13 },
  linkIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { color: colors.charcoal, fontSize: 14, fontWeight: '700' },
  linkNote: { color: colors.muted, fontSize: 12, marginTop: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTitle: { color: colors.charcoal, fontSize: 14, fontWeight: '700' },
  infoCopy: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});
