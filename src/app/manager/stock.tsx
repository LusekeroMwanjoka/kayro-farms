import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { InfoCard, Screen, ScreenHeader, SectionHeading } from '../../components/ui';
import { loadLivestockBatches, loadStockBalances, LivestockBatch, StockBalance } from '../../lib/farmReports';
import { isConfigured } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { colors, radius } from '../../theme';

export default function Stock() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<StockBalance[]>([]);
  const [batches, setBatches] = useState<LivestockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StockBalance | null>(null);
  const [draftPrice, setDraftPrice] = useState('');
  const [draftThreshold, setDraftThreshold] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [creating, setCreating] = useState(false);
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newUnitId, setNewUnitId] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newPrice, setNewPrice] = useState('0');
  const [newThreshold, setNewThreshold] = useState('0');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const isOwner = profile?.role === 'admin';

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!isConfigured) {
      setError('Connect the app to Supabase to view your farm products.');
      setLoading(false);
      return;
    }
    try {
      const [balances, liveBatches, unitResult] = await Promise.all([loadStockBalances(), loadLivestockBatches(), supabase.from('units').select('id,name').eq('active', true).order('name')]);
      if (unitResult.error) throw unitResult.error;
      setProducts(balances); setBatches(liveBatches); setUnits(unitResult.data ?? []);
    }
    catch { setError('Could not load stock. Check your connection and try again.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const openPriceEditor = (item: StockBalance) => {
    setEditing(item); setDraftPrice(String(item.price)); setDraftThreshold(String(item.low_stock_threshold)); setPriceError('');
  };
  const createProduct = async () => {
    const price = Number(newPrice);
    const threshold = Number(newThreshold);
    if (!newName.trim() || !newCategory.trim() || (!newUnitId && !newUnitName.trim()) || !Number.isFinite(price) || price < 0 || !Number.isFinite(threshold) || threshold < 0) { setPriceError('Enter a product name, database category, unit, valid price and threshold.'); return; }
    setCreatingProduct(true); setPriceError('');
    let unitId = newUnitId;
    if (!unitId && newUnitName.trim()) {
      const unitResult = await supabase.from('units').upsert({ name: newUnitName.trim() }, { onConflict: 'name' }).select('id').single();
      if (unitResult.error) { setPriceError(`Could not save this unit: ${unitResult.error.message}`); setCreatingProduct(false); return; }
      unitId = unitResult.data.id;
    }
    const { error: createError } = await supabase.from('products').insert({ name: newName.trim(), category: newCategory.trim(), unit_id: unitId, price, low_stock_threshold: threshold });
    if (createError) setPriceError(`Could not add this product: ${createError.message}`);
    else {
      setCreating(false); setNewName(''); setNewPrice('0'); setNewThreshold('0'); setNewCategory(''); setNewUnitId(''); setNewUnitName('');
      await loadProducts();
    }
    setCreatingProduct(false);
  };
  const categories = [...new Set(products.map((item) => item.category))].sort();
  const saveProductSettings = async () => {
    if (!editing) return;
    const nextPrice = Number(draftPrice);
    const threshold = Number(draftThreshold || 0);
    if (!Number.isFinite(nextPrice) || nextPrice < 0 || !Number.isFinite(threshold) || threshold < 0) { setPriceError('Enter a valid price and low-stock threshold.'); return; }
    setSavingPrice(true); setPriceError('');
    const { error: saveError } = await supabase.from('products').update({ price: nextPrice, low_stock_threshold: threshold }).eq('id', editing.id);
    if (saveError) setPriceError(`Could not save product settings: ${saveError.message}`);
    else {
      setProducts((items) => items.map((item) => item.id === editing.id ? { ...item, price: nextPrice, low_stock_threshold: threshold } : item));
      setEditing(null);
    }
    setSavingPrice(false);
  };

  return (
    <Screen>
      <ScreenHeader title="Stock" subtitle="Products recorded for your farm" />
      <View style={s.summary}>
        <View style={s.summaryIcon}><MaterialCommunityIcons name="archive-outline" size={22} color={colors.forest} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.summaryLabel}>Active products</Text>
          <Text style={s.summaryValue}>{loading ? 'Loading…' : products.length}</Text>
        </View>
        <Text style={s.summaryHint}>Current balance</Text>
      </View>
      <SectionHeading title="Farm products" />
      {isOwner ? <Pressable onPress={() => { setPriceError(''); setNewName(''); setNewCategory(''); setNewUnitId(''); setNewUnitName(''); setNewPrice('0'); setNewThreshold('0'); setCreating(true); }} style={s.createButton} accessibilityRole="button"><MaterialCommunityIcons name="plus" size={18} color={colors.white} /><Text style={s.createText}>Add a product</Text></Pressable> : null}
      {loading ? <View style={s.center}><ActivityIndicator color={colors.forest} /><Text style={s.muted}>Loading products…</Text></View> : null}
      {!loading && error ? (
        <InfoCard>
          <View style={s.messageRow}><MaterialCommunityIcons name="wifi-alert" size={22} color={colors.alert} /><Text style={s.error}>{error}</Text></View>
          <Text onPress={loadProducts} style={s.retry}>Try again</Text>
        </InfoCard>
      ) : null}
      {!loading && !error && products.length === 0 ? (
        <InfoCard>
          <View style={s.emptyIcon}><MaterialCommunityIcons name="package-variant" size={24} color={colors.forest} /></View>
          <Text style={s.emptyTitle}>No active products yet</Text>
          <Text style={s.muted}>Once your farm products are set up, they’ll appear here.</Text>
        </InfoCard>
      ) : null}
      {!loading && !error && products.map((product) => (
        <View key={product.id} style={s.product}>
          <View style={s.productIcon}><MaterialCommunityIcons name={product.category.toLowerCase().includes('live') || product.category.toLowerCase().includes('poultry') ? 'egg-outline' : 'leaf'} size={21} color={colors.forest} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.productName}>{product.name}</Text>
            <Text style={s.productMeta}>{product.category.replaceAll('_', ' ')}{product.unit?.name ? ` · per ${product.unit.name}` : ''}</Text>
            <Text style={s.savedPrice}>Price: MWK {product.price.toLocaleString('en-MW')}{product.unit?.name ? ` / ${product.unit.name}` : ''}</Text>
          </View>
          <View style={s.balanceWrap}>
            <Text style={s.balance}>{product.closing === null ? '—' : `${product.closing.toLocaleString('en-MW')} ${product.unit?.name ?? ''}`}</Text>
            {product.closing !== null && product.low_stock_threshold > 0 && product.closing <= product.low_stock_threshold ? <Text style={s.low}>Low stock</Text> : null}
            {product.closing === null ? <Text style={s.low}>Check movements</Text> : null}
            {isOwner ? <Pressable onPress={() => openPriceEditor(product)} style={s.editPrice} accessibilityRole="button"><MaterialCommunityIcons name="pencil-outline" size={13} color={colors.forest} /><Text style={s.editPriceText}>Edit</Text></Pressable> : null}
          </View>
        </View>
      ))}
      <SectionHeading title="Poultry and livestock batches" />
      {!loading && !error && !batches.length ? <InfoCard><Text style={s.muted}>No active livestock batches have been recorded.</Text></InfoCard> : null}
      {!loading && !error && batches.map((batch) => (
        <View key={batch.id} style={s.batch}>
          <View style={s.batchIcon}><MaterialCommunityIcons name="egg-outline" size={20} color={colors.forest} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.productName}>{batch.name}</Text>
            <Text style={s.productMeta}>{batch.product} · {batch.breed}</Text>
            <Text style={s.productMeta}>{batch.stage.replaceAll('_', ' ')} · arrived {batch.arrival_date}</Text>
          </View>
          <View style={s.balanceWrap}><Text style={s.balance}>{batch.current_count === null ? '—' : batch.current_count.toLocaleString('en-MW')}</Text><Text style={s.batchCount}>birds</Text></View>
        </View>
      ))}
      <View style={s.footnote}>
        <MaterialCommunityIcons name="information-outline" size={16} color={colors.muted} />
        <Text style={s.muted}>Quantities are calculated from opening, incoming, and outgoing stock movements.</Text>
      </View>
      <Modal visible={!!editing || creating} transparent animationType="slide" onRequestClose={() => { setEditing(null); setCreating(false); }}>
        <View style={s.modalShade}><Pressable style={StyleSheet.absoluteFill} onPress={() => { setEditing(null); setCreating(false); }} accessibilityLabel="Close product settings" /><ScrollView style={s.modal} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={s.modalTitle}>{creating ? 'Add a product' : 'Product settings'}</Text><Text style={s.modalSubtitle}>{creating ? 'Set up a product for farm records' : editing?.name}</Text>
          {creating ? <>
            <Text style={s.inputLabel}>Product name</Text><TextInput style={s.input} value={newName} onChangeText={setNewName} placeholder="e.g. Maize grain" placeholderTextColor={colors.muted} />
            <Text style={s.inputLabel}>Category value</Text><TextInput style={s.input} value={newCategory} onChangeText={setNewCategory} placeholder="Use a value from the product category enum" placeholderTextColor={colors.muted} autoCapitalize="none" />
            {categories.length ? <View style={s.choices}>{categories.map((value) => <Pressable key={value} onPress={() => setNewCategory(value)} style={[s.choice, newCategory === value && s.choiceSelected]}><Text style={[s.choiceText, newCategory === value && s.choiceTextSelected]}>{value.replaceAll('_', ' ')}</Text></Pressable>)}</View> : null}
            <Text style={s.modalSubtitle}>The category must exactly match a value in your product category enum.</Text>
            <Text style={s.inputLabel}>Unit</Text><View style={s.choices}>{units.map((unit) => <Pressable key={unit.id} onPress={() => { setNewUnitId(unit.id); setNewUnitName(''); }} style={[s.choice, newUnitId === unit.id && !newUnitName && s.choiceSelected]}><Text style={[s.choiceText, newUnitId === unit.id && !newUnitName && s.choiceTextSelected]}>{unit.name}</Text></Pressable>)}</View>
            <TextInput style={s.input} value={newUnitName} onChangeText={(value) => { setNewUnitName(value); setNewUnitId(''); }} placeholder="Or add a unit, e.g. kg, bag, bird" placeholderTextColor={colors.muted} />
          </> : null}
          <Text style={s.inputLabel}>{creating ? 'Selling price (MWK)' : 'Selling price (MWK)'}</Text><TextInput style={s.input} value={creating ? newPrice : draftPrice} onChangeText={creating ? setNewPrice : setDraftPrice} keyboardType="decimal-pad" />
          <Text style={s.inputLabel}>Low-stock alert at</Text><TextInput style={s.input} value={creating ? newThreshold : draftThreshold} onChangeText={creating ? setNewThreshold : setDraftThreshold} keyboardType="decimal-pad" />
          {priceError ? <Text style={s.modalError}>{priceError}</Text> : null}
          <Pressable onPress={creating ? createProduct : saveProductSettings} disabled={savingPrice || creatingProduct} style={s.saveButton} accessibilityRole="button">{savingPrice || creatingProduct ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveText}>{creating ? 'Add product' : 'Save settings'}</Text>}</Pressable>
          <Pressable onPress={() => { setEditing(null); setCreating(false); }} style={s.cancelButton} accessibilityRole="button"><Text style={s.cancelText}>Cancel</Text></Pressable>
        </ScrollView></View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 16, backgroundColor: colors.softGreen },
  summaryIcon: { height: 42, width: 42, borderRadius: 14, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { color: colors.muted, fontSize: 12 },
  summaryValue: { color: colors.charcoal, fontSize: 22, fontWeight: '700', marginTop: 2 },
  summaryHint: { color: colors.forest, fontSize: 12, fontWeight: '600' },
  center: { alignItems: 'center', padding: 26, gap: 10 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  messageRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  error: { color: colors.alert, flex: 1, fontSize: 14 },
  retry: { color: colors.forest, fontWeight: '700', paddingTop: 8 },
  emptyIcon: { backgroundColor: colors.softGreen, width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.charcoal, fontWeight: '700', fontSize: 16 },
  product: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white },
  productIcon: { backgroundColor: colors.softGreen, width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  batch: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white },
  batchIcon: { backgroundColor: colors.softAmber, width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  batchCount: { color: colors.muted, fontSize: 10, textAlign: 'right', marginTop: 2 },
  productName: { fontSize: 14, fontWeight: '700', color: colors.charcoal, textTransform: 'capitalize' },
  productMeta: { fontSize: 12, color: colors.muted, marginTop: 4, textTransform: 'capitalize' },
  savedPrice: { fontSize: 10, color: colors.muted, marginTop: 3 },
  balanceWrap: { alignItems: 'flex-end', maxWidth: '34%' },
  balance: { fontSize: 12, color: colors.charcoal, fontWeight: '700', textAlign: 'right' },
  low: { fontSize: 10, color: colors.alert, fontWeight: '700', marginTop: 3 },
  editPrice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 4 },
  editPriceText: { color: colors.forest, fontSize: 10, fontWeight: '700' },
  modalShade: { flex: 1, backgroundColor: 'rgba(23,35,28,0.32)', justifyContent: 'flex-end' },
  modal: { maxHeight: '88%', backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: 20, gap: 10, paddingBottom: 32 },
  modalTitle: { color: colors.charcoal, fontSize: 20, fontWeight: '700' },
  modalSubtitle: { color: colors.muted, fontSize: 13, marginBottom: 5 },
  inputLabel: { color: colors.charcoal, fontSize: 13, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 13, color: colors.charcoal, fontSize: 15 },
  modalError: { color: colors.alert, fontSize: 12, lineHeight: 17 },
  saveButton: { minHeight: 48, borderRadius: 13, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  cancelButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  createButton: { minHeight: 45, borderRadius: 13, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  createText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7 },
  choiceSelected: { backgroundColor: colors.softGreen, borderColor: colors.forest },
  choiceText: { color: colors.muted, fontSize: 11, textTransform: 'capitalize' },
  choiceTextSelected: { color: colors.forest, fontWeight: '700' },
  footnote: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 2 },
});
