import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { ActionGrid, InfoCard, Screen, SectionHeading, StatusPill, greeting, todayLabel } from '../../components/ui';
import { colors, radius, space } from '../../theme';

export default function ManagerHome() {
  const { profile, productCount } = useAuth();
  const router = useRouter();
  const first = profile?.full_name?.trim().split(' ')[0] ?? '';
  const toRecord = (kind?: string) => router.navigate({ pathname: '/manager/record', params: kind ? { kind } : {} });

  return (
    <Screen>
      <View style={s.topline}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{todayLabel()}</Text>
          <Text style={s.title}>{greeting()}{first ? `, ${first}` : ''}</Text>
          <Text style={s.subtitle}>Here’s your farm at a glance.</Text>
        </View>
        <View style={s.avatar}><MaterialCommunityIcons name="account-outline" size={23} color={colors.forest} /></View>
      </View>

      <Pressable onPress={() => toRecord()} style={({ pressed }) => [s.hero, pressed && { opacity: 0.92 }]} accessibilityRole="button">
        <View style={s.heroTop}>
          <View style={s.heroIcon}><MaterialCommunityIcons name="notebook-edit-outline" size={19} color={colors.forest} /></View>
          <StatusPill label="Daily record" />
        </View>
        <Text style={s.heroTitle}>Keep today’s farm record up to date</Text>
        <Text style={s.heroCopy}>Log stock, sales, payments, expenses or farm work as it happens.</Text>
        <View style={s.heroButton}><Text style={s.heroButtonText}>Add a record</Text><MaterialCommunityIcons name="arrow-right" size={18} color={colors.white} /></View>
        <View style={s.heroArt}><MaterialCommunityIcons name="sprout" size={86} color="#C5E3A0" /></View>
      </Pressable>

      <View style={s.sectionLine}><SectionHeading title="Quick actions" /></View>
      <ActionGrid items={[
        { icon: 'package-variant-plus', label: 'Receive stock', onPress: () => toRecord('receive') },
        { icon: 'cash-register', label: 'Record a sale', onPress: () => toRecord('sale') },
        { icon: 'cash-plus', label: 'Collect payment', onPress: () => toRecord('payment') },
        { icon: 'clipboard-text-outline', label: 'Log farm work', onPress: () => toRecord('activity') },
      ]} />

      <SectionHeading title="Farm snapshot" />
      <Pressable onPress={() => router.navigate('/manager/stock')} accessibilityRole="button">
        <InfoCard>
          <View style={s.snapshotRow}>
            <View style={s.snapshotIcon}><MaterialCommunityIcons name="warehouse" size={21} color={colors.forest} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.snapshotTitle}>Active products</Text>
              <Text style={s.snapshotCopy}>View your product list and saved prices</Text>
            </View>
            <Text style={s.count}>{productCount ?? '—'}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
          </View>
        </InfoCard>
      </Pressable>

      <View style={s.note}>
        <MaterialCommunityIcons name="information-outline" size={17} color={colors.muted} />
        <Text style={s.noteText}>Record entries on the day they happen so your farm history stays accurate.</Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  topline: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  eyebrow: { color: colors.muted, fontSize: 13, fontWeight: '500', marginBottom: 4 },
  title: { color: colors.charcoal, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  avatar: { height: 44, width: 44, borderRadius: 16, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  hero: { overflow: 'hidden', position: 'relative', backgroundColor: colors.softGreen, borderRadius: radius.lg, padding: 18, gap: 10 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { maxWidth: '82%', fontSize: 20, lineHeight: 26, fontWeight: '700', color: colors.charcoal, marginTop: 4 },
  heroCopy: { maxWidth: '80%', color: colors.muted, fontSize: 13, lineHeight: 19 },
  heroButton: { alignSelf: 'flex-start', backgroundColor: colors.forest, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  heroButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  heroArt: { position: 'absolute', right: 3, bottom: 7, opacity: 0.5, transform: [{ rotate: '-18deg' }] },
  sectionLine: { marginBottom: -4 },
  snapshotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  snapshotIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  snapshotTitle: { color: colors.charcoal, fontSize: 14, fontWeight: '700' },
  snapshotCopy: { color: colors.muted, fontSize: 12, marginTop: 3 },
  count: { fontSize: 20, fontWeight: '700', color: colors.charcoal },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 2 },
  noteText: { color: colors.muted, fontSize: 12, lineHeight: 17, flex: 1 },
});
