import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { InfoCard, Screen, ScreenHeader, StatusPill } from '../../components/ui';
import { CORRECTION_STATUSES } from '../../lib/farmEnums';
import { supabase } from '../../lib/supabase';
import { colors, radius } from '../../theme';

type Correction = { id: string; table_name: string; record_id: string | null; message: string; status: string; created_at: string; requested_by: string };
type Day = { entry_date: string; status: string; note: string | null; submitted_at: string | null; submitted_by: string | null };

export default function Approvals() {
  const { profile } = useAuth();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [correctionResult, dayResult] = await Promise.all([
      supabase.from('corrections').select('id,table_name,record_id,message,status,created_at,requested_by').eq('status', CORRECTION_STATUSES.pending).order('created_at', { ascending: false }),
      supabase.from('days').select('entry_date,status,note,submitted_at,submitted_by').order('entry_date', { ascending: false }).limit(14),
    ]);
    if (correctionResult.error || dayResult.error) setError('Could not load approvals. Check your access and connection.');
    setCorrections((correctionResult.data ?? []) as Correction[]);
    setDays((dayResult.data ?? []) as Day[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const resolve = async (item: Correction, approved: boolean) => {
    if (!profile) return;
    setSavingId(item.id); setError('');
    const status = approved ? CORRECTION_STATUSES.approved : CORRECTION_STATUSES.rejected;
    const { error: updateError } = await supabase.from('corrections').update({ status, resolved_by: profile.id, resolved_at: new Date().toISOString(), admin_note: noteById[item.id]?.trim() || null }).eq('id', item.id);
    if (updateError) setError(`Could not update this correction: ${updateError.message}`);
    else setCorrections((items) => items.filter((x) => x.id !== item.id));
    setSavingId(null);
  };

  return (
    <Screen>
      <ScreenHeader title="Approvals" subtitle="Review manager records and corrections" />
      {loading ? <View style={s.loading}><ActivityIndicator color={colors.forest} /><Text style={s.muted}>Loading review queue…</Text></View> : null}
      {error ? <InfoCard><Text style={s.error}>{error}</Text><Text onPress={load} style={s.retry}>Try again</Text></InfoCard> : null}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Correction requests</Text><StatusPill label={`${corrections.length} pending`} tone={corrections.length ? 'amber' : 'green'} /></View>
      {!loading && !corrections.length ? <InfoCard><Text style={s.muted}>No correction requests need your attention.</Text></InfoCard> : null}
      {corrections.map((item) => (
        <InfoCard key={item.id}>
          <View style={s.rowTop}><View style={s.icon}><MaterialCommunityIcons name="file-edit-outline" size={19} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={s.itemTitle}>{item.table_name.replaceAll('_', ' ')}</Text><Text style={s.date}>{new Date(item.created_at).toLocaleDateString()}</Text></View><StatusPill label="Pending" tone="amber" /></View>
          <Text style={s.message}>{item.message}</Text>
          <TextInput value={noteById[item.id] ?? ''} onChangeText={(value) => setNoteById((notes) => ({ ...notes, [item.id]: value }))} placeholder="Owner note (optional)" placeholderTextColor={colors.muted} style={s.input} />
          <View style={s.buttonRow}>
            <Pressable onPress={() => resolve(item, false)} disabled={savingId === item.id} style={[s.secondaryButton, savingId === item.id && { opacity: 0.55 }]} accessibilityRole="button"><Text style={s.secondaryText}>Decline</Text></Pressable>
            <Pressable onPress={() => resolve(item, true)} disabled={savingId === item.id} style={[s.primaryButton, savingId === item.id && { opacity: 0.55 }]} accessibilityRole="button">{savingId === item.id ? <ActivityIndicator color={colors.white} /> : <Text style={s.primaryText}>Approve</Text>}</Pressable>
          </View>
        </InfoCard>
      ))}

      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Recent daily records</Text><Text onPress={load} style={s.retry}>Refresh</Text></View>
      {!loading && !days.length ? <InfoCard><Text style={s.muted}>Daily submissions will appear here.</Text></InfoCard> : null}
      {days.map((day) => (
        <View key={day.entry_date} style={s.dayCard}>
          <View style={s.dayIcon}><MaterialCommunityIcons name="calendar-check-outline" size={20} color={colors.forest} /></View>
          <View style={{ flex: 1 }}><Text style={s.itemTitle}>{new Date(`${day.entry_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text><Text style={s.date}>{day.note || (day.submitted_at ? 'Submitted by the farm team' : 'Daily record started')}</Text></View>
          <StatusPill label={day.status} tone={day.status === 'open' ? 'neutral' : 'green'} />
        </View>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 15 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.alert, fontSize: 13, lineHeight: 18 },
  retry: { color: colors.forest, fontSize: 12, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.charcoal, fontSize: 17, fontWeight: '700' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: colors.charcoal, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  date: { color: colors.muted, fontSize: 11, marginTop: 3 },
  message: { color: colors.charcoal, fontSize: 14, lineHeight: 20 },
  input: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.charcoal, fontSize: 13 },
  buttonRow: { flexDirection: 'row', gap: 9 },
  primaryButton: { flex: 1, minHeight: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest },
  primaryText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  secondaryButton: { flex: 1, minHeight: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.alert, fontSize: 13, fontWeight: '700' },
  dayCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  dayIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
});
