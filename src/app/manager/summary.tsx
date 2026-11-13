import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { InfoCard, Screen, ScreenHeader, StatusPill } from '../../components/ui';
import { FarmRecord, loadDailyFarmReport, loadRecentFarmRecords, loadStockBalances, StockBalance } from '../../lib/farmReports';
import { DAY_STATUSES } from '../../lib/farmEnums';
import { supabase } from '../../lib/supabase';
import { colors, radius } from '../../theme';

type Report = Awaited<ReturnType<typeof loadDailyFarmReport>>;
const money = (value: number | null | undefined) => `MWK ${Math.round(Number(value ?? 0)).toLocaleString('en-MW')}`;

export default function Summary() {
  const [report, setReport] = useState<Report | null>(null);
  const [stocks, setStocks] = useState<StockBalance[]>([]);
  const [records, setRecords] = useState<FarmRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closeoutNote, setCloseoutNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const day = await loadDailyFarmReport();
      const [balances, recent] = await Promise.all([loadStockBalances(day.date), loadRecentFarmRecords(20)]);
      setReport(day); setStocks(balances); setRecords(recent); setCloseoutNote(day.dayNote);
    }
    catch { setError('Could not load today’s records. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitDay = async () => {
    if (!report) return;
    setSubmitting(true); setError('');
    const submittedAt = new Date().toISOString();
    const { error: submitError } = await supabase.rpc('submit_farm_day', { p_entry_date: report.date, p_note: closeoutNote.trim() || null });
    if (submitError) setError(`Could not submit today’s closeout: ${submitError.message}`);
    else setReport({ ...report, dayStatus: DAY_STATUSES.submitted, submittedAt, dayNote: closeoutNote.trim() });
    setSubmitting(false);
  };

  return (
    <Screen>
      <ScreenHeader title="Daily summary" subtitle={report?.date ?? 'Today at a glance'} />
      <View style={s.statusLine}><View><Text style={s.statusLabel}>Day status</Text><Text style={s.statusHint}>{report?.submittedAt ? 'Submitted for owner review' : 'Record the day as you go'}</Text></View><StatusPill label={report?.dayStatus ?? '…'} tone={report?.submittedAt ? 'green' : 'neutral'} /></View>
      {loading ? <View style={s.loading}><ActivityIndicator color={colors.forest} /><Text style={s.muted}>Updating your totals…</Text></View> : null}
      {error ? <InfoCard><Text style={s.error}>{error}</Text><Text onPress={load} style={s.retry}>Try again</Text></InfoCard> : null}
      {report ? <>
        <Text style={s.sectionTitle}>Money today</Text>
        <View style={s.stats}>
          <Stat label="Sales" value={money(report.salesTotal)} icon="trending-up" />
          <Stat label="Received at sale" value={money(report.receivedOnSales)} icon="cash-check" />
          <Stat label="Payments collected" value={money(report.paymentTotal)} icon="cash-plus" />
          <Stat label="Expenses" value={money(report.expenseTotal)} icon="receipt-text-outline" />
        </View>
        <Text style={s.sectionTitle}>Farm activity</Text>
        <InfoCard>
          <DataLine label="Sales recorded" value={String(report.salesCount)} />
          <DataLine label="Stock movements" value={String(report.movementCount)} />
          <DataLine label="Activities logged" value={String(report.activityCount)} last />
        </InfoCard>
        <Text style={s.sectionTitle}>Recent farm records</Text>
        {records.length ? <InfoCard>
          {records.slice(0, 12).map((record, index) => <View key={record.id} style={[s.recordLine, index === Math.min(records.length, 12) - 1 && { borderBottomWidth: 0 }]}>
            <View style={s.recordType}><Text style={s.recordTypeText}>{record.kind.slice(0, 1)}</Text></View>
            <View style={{ flex: 1 }}><Text style={s.recordTitle} numberOfLines={1}>{record.title}</Text><Text style={s.recordDetail} numberOfLines={1}>{record.kind} · {record.detail}</Text><Text style={s.recordDate}>{new Date(record.created_at).toLocaleString()}</Text></View>
            {record.amount !== undefined ? <Text style={s.recordAmount}>{money(record.amount)}</Text> : record.quantity !== undefined ? <Text style={s.recordAmount}>{record.quantity.toLocaleString('en-MW')}</Text> : null}
          </View>)}
        </InfoCard> : <InfoCard><Text style={s.muted}>No farm records have been saved yet.</Text></InfoCard>}
        <Text style={s.sectionTitle}>Opening and closing stock</Text>
        {stocks.length ? <InfoCard>
          <View style={s.stockHeader}><Text style={s.stockHeadName}>Product</Text><Text style={s.stockHead}>Opening</Text><Text style={s.stockHead}>Closing</Text></View>
          {stocks.map((item, index) => <View key={item.id} style={[s.stockLine, index === stocks.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}><Text style={s.dataLabel} numberOfLines={1}>{item.name}</Text><Text style={s.unit}>{item.unit?.name ?? ''}</Text></View>
            <Text style={s.stockValue}>{item.opening === null ? '—' : item.opening.toLocaleString('en-MW')}</Text>
            <Text style={s.stockValue}>{item.closing === null ? '—' : item.closing.toLocaleString('en-MW')}</Text>
          </View>)}
        </InfoCard> : <InfoCard><Text style={s.muted}>No active products are set up yet.</Text></InfoCard>}
        <Text style={s.sectionTitle}>Close out the day</Text>
        <InfoCard>
          <Text style={s.muted}>Review the totals and stock above, add any handover note, then submit today’s record to the owner.</Text>
          <TextInput value={closeoutNote} onChangeText={setCloseoutNote} placeholder="Handover note (optional)" placeholderTextColor={colors.muted} style={s.noteInput} multiline />
          <Pressable onPress={submitDay} disabled={submitting || !!report.submittedAt} style={[s.submitButton, (submitting || !!report.submittedAt) && { opacity: 0.6 }]} accessibilityRole="button">
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={s.submitText}>{report.submittedAt ? 'Submitted to owner' : 'Submit daily closeout'}</Text>}
          </Pressable>
        </InfoCard>
        <View style={s.note}><MaterialCommunityIcons name="information-outline" size={17} color={colors.muted} /><Text style={s.muted}>Cash collected at sale and later customer payments are shown separately to avoid counting the same money twice.</Text></View>
      </> : null}
      <Pressable onPress={load} style={s.refresh} accessibilityRole="button"><MaterialCommunityIcons name="refresh" size={17} color={colors.forest} /><Text style={s.refreshText}>Refresh today’s totals</Text></Pressable>
    </Screen>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  return <View style={s.stat}><View style={s.statIcon}><MaterialCommunityIcons name={icon} size={18} color={colors.forest} /></View><Text style={s.statLabel}>{label}</Text><Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text></View>;
}
function DataLine({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <View style={[s.dataLine, last && { borderBottomWidth: 0 }]}><Text style={s.dataLabel}>{label}</Text><Text style={s.dataValue}>{value}</Text></View>;
}

const s = StyleSheet.create({
  statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, padding: 14, backgroundColor: colors.cream },
  statusLabel: { color: colors.charcoal, fontWeight: '700', fontSize: 14 },
  statusHint: { color: colors.muted, fontSize: 12, marginTop: 3 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 15 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18, flex: 1 },
  error: { color: colors.alert, fontSize: 14 },
  retry: { color: colors.forest, fontWeight: '700', paddingTop: 6 },
  sectionTitle: { color: colors.charcoal, fontSize: 17, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', minHeight: 106, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 13, gap: 5, backgroundColor: colors.white },
  statIcon: { height: 30, width: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGreen },
  statLabel: { color: colors.muted, fontSize: 11 },
  statValue: { color: colors.charcoal, fontSize: 16, fontWeight: '700' },
  dataLine: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.line },
  dataLabel: { color: colors.muted, fontSize: 13 },
  dataValue: { color: colors.charcoal, fontWeight: '700', fontSize: 14 },
  stockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 7, borderBottomWidth: 1, borderColor: colors.line },
  stockHeadName: { color: colors.muted, fontSize: 10, fontWeight: '700', flex: 1 },
  stockHead: { color: colors.muted, fontSize: 10, fontWeight: '700', width: 66, textAlign: 'right' },
  stockLine: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.line },
  stockValue: { color: colors.charcoal, fontSize: 12, width: 66, textAlign: 'right', fontWeight: '700' },
  unit: { color: colors.muted, fontSize: 10, marginTop: 2 },
  recordLine: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 58, borderBottomWidth: 1, borderColor: colors.line },
  recordType: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  recordTypeText: { color: colors.forest, fontWeight: '800', fontSize: 13 },
  recordTitle: { color: colors.charcoal, fontWeight: '700', fontSize: 12 },
  recordDetail: { color: colors.muted, fontSize: 10, marginTop: 2, textTransform: 'capitalize' },
  recordDate: { color: colors.muted, fontSize: 9, marginTop: 2 },
  recordAmount: { color: colors.charcoal, fontSize: 10, fontWeight: '700', maxWidth: 84, textAlign: 'right' },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 2 },
  refresh: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.softGreen, borderRadius: 13 },
  refreshText: { color: colors.forest, fontSize: 13, fontWeight: '700' },
  noteInput: { minHeight: 74, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.charcoal, fontSize: 13, textAlignVertical: 'top' },
  submitButton: { minHeight: 46, backgroundColor: colors.forest, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: colors.white, fontSize: 13, fontWeight: '700' },
});
