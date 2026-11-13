import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard, Screen, ScreenHeader } from '../../components/ui';
import { loadCustomerCreditBalances, loadDailyFarmReport } from '../../lib/farmReports';
import { colors, radius } from '../../theme';

type Report = Awaited<ReturnType<typeof loadDailyFarmReport>>;
type Credit = Awaited<ReturnType<typeof loadCustomerCreditBalances>>;
const money = (value: number | null | undefined) => `MWK ${Math.round(Number(value ?? 0)).toLocaleString('en-MW')}`;

export default function Money() {
  const [report, setReport] = useState<Report | null>(null);
  const [credits, setCredits] = useState<Credit>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [day, due] = await Promise.all([loadDailyFarmReport(), loadCustomerCreditBalances()]);
      setReport(day); setCredits(due);
    } catch { setError('Could not load farm finances. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const collected = (report?.receivedOnSales ?? 0) + (report?.paymentTotal ?? 0);
  const creditTotal = credits.reduce<number>((total, row) => total + Number(row.amount), 0);

  return (
    <Screen>
      <ScreenHeader title="Farm money" subtitle={report?.date ?? 'Today and customer balances'} />
      {loading ? <View style={s.loading}><ActivityIndicator color={colors.forest} /><Text style={s.muted}>Loading financial records…</Text></View> : null}
      {error ? <InfoCard><Text style={s.error}>{error}</Text><Text onPress={load} style={s.retry}>Try again</Text></InfoCard> : null}
      {report ? <>
        <View style={s.hero}>
          <Text style={s.heroLabel}>Collected today</Text>
          <Text style={s.heroValue}>{money(collected)}</Text>
          <Text style={s.heroNote}>Sale deposits plus later customer payments</Text>
        </View>
        <View style={s.grid}>
          <Metric label="Sales" value={money(report.salesTotal)} icon="trending-up" />
          <Metric label="Expenses" value={money(report.expenseTotal)} icon="receipt-text-outline" />
          <Metric label="Payments" value={money(report.paymentTotal)} icon="cash-plus" />
          <Metric label="Sale deposits" value={money(report.receivedOnSales)} icon="cash-check" />
        </View>
      </> : null}
      <View style={s.creditHeader}><Text style={s.title}>Customer credit</Text><Text style={s.creditTotal}>{money(creditTotal)}</Text></View>
      <InfoCard>
        {loading ? <Text style={s.muted}>Calculating outstanding balances…</Text> : credits.length ? credits.slice(0, 8).map((row, index) => (
          <View key={row.id} style={[s.customerLine, index === Math.min(credits.length, 8) - 1 && { borderBottomWidth: 0 }]}>
            <View style={s.customerIcon}><MaterialCommunityIcons name="account-outline" size={18} color={colors.forest} /></View>
            <Text style={s.customerName} numberOfLines={1}>{row.name}</Text><Text style={s.customerBalance}>{money(row.amount)}</Text>
          </View>
        )) : <Text style={s.muted}>No outstanding customer credit found.</Text>}
      </InfoCard>
      <Pressable onPress={load} style={s.refresh} accessibilityRole="button"><MaterialCommunityIcons name="refresh" size={17} color={colors.forest} /><Text style={s.refreshText}>Refresh financial records</Text></Pressable>
    </Screen>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  return <View style={s.metric}><View style={s.metricIcon}><MaterialCommunityIcons name={icon} size={18} color={colors.forest} /></View><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text></View>;
}

const s = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 15 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.alert, fontSize: 14 },
  retry: { color: colors.forest, fontWeight: '700', paddingTop: 7 },
  hero: { backgroundColor: colors.forest, padding: 19, borderRadius: radius.lg, gap: 5 },
  heroLabel: { color: '#D7E9DB', fontSize: 13 },
  heroValue: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  heroNote: { color: '#D7E9DB', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', minHeight: 99, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, gap: 5 },
  metricIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { color: colors.muted, fontSize: 11 },
  metricValue: { color: colors.charcoal, fontSize: 15, fontWeight: '700' },
  creditHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.charcoal, fontSize: 17, fontWeight: '700' },
  creditTotal: { color: colors.forest, fontSize: 15, fontWeight: '800' },
  customerLine: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 45, borderBottomWidth: 1, borderColor: colors.line },
  customerIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  customerName: { color: colors.charcoal, fontSize: 13, flex: 1 },
  customerBalance: { color: colors.charcoal, fontSize: 13, fontWeight: '700' },
  refresh: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.softGreen, borderRadius: 13 },
  refreshText: { color: colors.forest, fontSize: 13, fontWeight: '700' },
});
