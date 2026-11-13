import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { Screen, ScreenHeader } from '../../components/ui';
import { MOVEMENT_TYPES, PAYMENT_METHODS, PAYMENT_TYPES, SOURCE_TYPES } from '../../lib/farmEnums';
import { supabase } from '../../lib/supabase';
import { colors, radius } from '../../theme';

type Kind = 'opening' | 'receive' | 'sale' | 'payment' | 'activity' | 'expense' | 'loss' | 'livestock';
type Option = { id: string; name: string; price?: number; stage?: string; product_id?: string };
type SaleLine = { product_id: string; name: string; quantity: number; unit_price: number; batch_id: string | null; batch_name?: string };
type RefData = { products: Option[]; customers: Option[]; workers: Option[]; suppliers: Option[]; categories: Option[]; activities: Option[]; locations: Option[]; breeds: Option[]; reasons: Option[]; batches: Option[] };
type Config = { title: string; hint: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; tint: string };

const config: Record<Kind, Config> = {
  opening: { title: 'Set opening stock', hint: 'Enter the stock you already have on hand', icon: 'archive-plus-outline', tint: colors.softGreen },
  receive: { title: 'Receive stock', hint: 'Add new stock to the farm', icon: 'package-variant-plus', tint: colors.softGreen },
  sale: { title: 'Record a sale', hint: 'Record products sold to a customer', icon: 'cash-register', tint: colors.softGreen },
  payment: { title: 'Collect payment', hint: 'Record money received from a customer', icon: 'cash-plus', tint: colors.softAmber },
  activity: { title: 'Log farm work', hint: 'Record an activity completed today', icon: 'sprout', tint: colors.softGreen },
  expense: { title: 'Add expense', hint: 'Record money spent for the farm', icon: 'receipt-text-outline', tint: colors.softAmber },
  loss: { title: 'Record stock loss', hint: 'Record damaged, missing or lost stock', icon: 'alert-circle-outline', tint: colors.softRed },
  livestock: { title: 'Add a livestock batch', hint: 'Start a traceable poultry or livestock group', icon: 'egg-outline', tint: colors.softGreen },
};

const emptyRefs: RefData = { products: [], customers: [], workers: [], suppliers: [], categories: [], activities: [], locations: [], breeds: [], reasons: [], batches: [] };

function localDateISO() {
  const date = new Date();
  const part = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`;
}

const moneyLabel = (value: number) => `MWK ${Math.round(value).toLocaleString('en-MW')}`;

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, editable = true }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad'; multiline?: boolean; editable?: boolean }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[s.input, multiline && s.multiline]}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'default' ? 'sentences' : 'none'}
        multiline={multiline}
        editable={editable}
        selectTextOnFocus={editable}
      />
    </View>
  );
}

function Picker({ label, value, options, onSelect, emptyLabel }: { label: string; value?: Option; options: Option[]; onSelect: (v: Option) => void; emptyLabel?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>{label}</Text>
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={s.select}>
          <Text style={[s.selectText, !value && s.placeholder]} numberOfLines={1}>{value?.name ?? emptyLabel ?? `Select ${label.toLowerCase()}`}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.muted} />
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.modalShade}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close choices" />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}><Text style={s.modalTitle}>{label}</Text><Pressable onPress={() => setOpen(false)} accessibilityRole="button"><MaterialCommunityIcons name="close" size={23} color={colors.muted} /></Pressable></View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.length ? options.map((o) => (
                <Pressable key={o.id} onPress={() => { onSelect(o); setOpen(false); }} style={s.option} accessibilityRole="button">
                  <Text style={s.optionText}>{o.name}</Text>
                  {value?.id === o.id ? <MaterialCommunityIcons name="check-circle" size={20} color={colors.forest} /> : null}
                </Pressable>
              )) : <Text style={s.noOptions}>No active options found. Ask the owner to add {label.toLowerCase()} first.</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SegmentChoices({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <View style={s.fieldWrap}><Text style={s.fieldLabel}>{label}</Text><View style={s.segmentRow}>{options.map((option) => <Pressable key={option.value} onPress={() => onChange(option.value)} style={[s.segment, value === option.value && s.segmentActive]} accessibilityRole="button"><Text style={[s.segmentText, value === option.value && s.segmentTextActive]}>{option.label}</Text></Pressable>)}</View></View>;
}

export default function Record() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<Kind | null>(null);
  const [refs, setRefs] = useState<RefData>(emptyRefs);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [refsError, setRefsError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const [product, setProduct] = useState<Option>();
  const [customer, setCustomer] = useState<Option>();
  const [worker, setWorker] = useState<Option>();
  const [supplier, setSupplier] = useState<Option>();
  const [category, setCategory] = useState<Option>();
  const [activityType, setActivityType] = useState<Option>();
  const [location, setLocation] = useState<Option>();
  const [breed, setBreed] = useState<Option>();
  const [lossReason, setLossReason] = useState<Option>();
  const [batch, setBatch] = useState<Option>();
  const [activityWorkerIds, setActivityWorkerIds] = useState<string[]>([]);
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [paid, setPaid] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(localDateISO());
  const [paymentType, setPaymentType] = useState<(typeof PAYMENT_TYPES)[keyof typeof PAYMENT_TYPES]>(PAYMENT_TYPES.cash);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]>(PAYMENT_METHODS.cash);
  const [sourceType, setSourceType] = useState<(typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES]>(SOURCE_TYPES.ownHarvest);
  const [batchName, setBatchName] = useState('');
  const [stage, setStage] = useState('chicks');

  const total = useMemo(() => saleLines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0) + (product ? Number(quantity || 0) * Number(price || 0) : 0), [saleLines, product, quantity, price]);

  useEffect(() => {
    let active = true;
    setLoadingRefs(true);
    setRefsError('');
    Promise.all([
      supabase.from('products').select('id,name,price').eq('active', true).order('name'),
      supabase.from('customers').select('id,name').eq('active', true).order('name'),
      supabase.from('workers').select('id,name').eq('active', true).order('name'),
      supabase.from('suppliers').select('id,name').eq('active', true).order('name'),
      supabase.from('expense_categories').select('id,name').eq('active', true).order('name'),
      supabase.from('activity_types').select('id,name').eq('active', true).order('name'),
      supabase.from('locations').select('id,name').eq('active', true).order('name'),
      supabase.from('breeds').select('id,name').eq('active', true).order('name'),
      supabase.from('loss_reasons').select('id,name').eq('active', true).order('name'),
      supabase.from('batches').select('id,name,product_id,stage').eq('status', 'active').order('arrival_date', { ascending: false }),
    ]).then((results) => {
      if (!active) return;
      const errors = results.filter((r) => r.error).map((r) => r.error?.message);
      if (errors.length) setRefsError('Some farm lists could not be loaded. Check your connection or access permissions.');
      setRefs({
        products: (results[0].data ?? []) as Option[], customers: (results[1].data ?? []) as Option[], workers: (results[2].data ?? []) as Option[],
        suppliers: (results[3].data ?? []) as Option[], categories: (results[4].data ?? []) as Option[], activities: (results[5].data ?? []) as Option[],
        locations: (results[6].data ?? []) as Option[], breeds: (results[7].data ?? []) as Option[], reasons: (results[8].data ?? []) as Option[], batches: (results[9].data ?? []) as Option[],
      });
      setLoadingRefs(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const requested = params.kind;
    if (requested && Object.prototype.hasOwnProperty.call(config, requested)) {
      resetForm();
      setKind(requested as Kind);
    }
  }, [params.kind]);

  const resetForm = () => {
    setProduct(undefined); setCustomer(undefined); setWorker(undefined); setSupplier(undefined); setCategory(undefined); setActivityType(undefined); setLocation(undefined); setBreed(undefined); setLossReason(undefined); setBatch(undefined);
    setActivityWorkerIds([]);
    setSaleLines([]);
    setQuantity(''); setPrice(''); setAmount(''); setPaid(''); setDescription(''); setNote(''); setBatchName(''); setStage('chicks');
    setEntryDate(localDateISO()); setPaymentType(PAYMENT_TYPES.cash); setPaymentMethod(PAYMENT_METHODS.cash); setSourceType(SOURCE_TYPES.ownHarvest); setMessage(null);
  };

  const openForm = (next: Kind) => { resetForm(); setKind(next); };
  const back = () => { setKind(null); setMessage(null); };

  const addSaleLine = () => {
    const lineQuantity = Number(quantity);
    const savedPrice = Number(product?.price ?? 0);
    if (!product || !Number.isFinite(lineQuantity) || lineQuantity <= 0 || !Number.isFinite(savedPrice) || savedPrice < 0) {
      setMessage({ text: 'Choose a product with a saved price and enter a valid quantity before adding it.', success: false });
      return;
    }
    setSaleLines((lines) => [...lines, { product_id: product.id, name: product.name, quantity: lineQuantity, unit_price: savedPrice, batch_id: batch?.id ?? null, batch_name: batch?.name }]);
    setProduct(undefined); setBatch(undefined); setQuantity(''); setPrice(''); setPaid(''); setMessage(null);
  };

  const save = async () => {
    if (!kind || !profile) return;
    setSaving(true); setMessage(null);
    const userId = profile.id;
    const qty = Number(quantity);
    const unitPrice = Number(price);
    const money = Number(amount);
    const errorMessage = (error: { message: string } | null) => error?.message ?? 'Could not save this record. Please try again.';
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || Number.isNaN(Date.parse(`${entryDate}T12:00:00`))) throw new Error('Enter a valid date in YYYY-MM-DD format.');
      if (kind === 'receive' || kind === 'opening') {
        if (!product || !Number.isFinite(qty) || qty <= 0) throw new Error('Choose a product and enter a quantity greater than zero.');
        if (price.trim() && (!Number.isFinite(unitPrice) || unitPrice < 0)) throw new Error('Enter a valid unit cost.');
        if (kind === 'opening') {
          if (profile.role !== 'admin') throw new Error('Only an administrator can enter opening stock.');
          const { error } = await supabase.from('stock_movements').insert({ entry_date: entryDate, product_id: product.id, movement_type: MOVEMENT_TYPES.opening, quantity: qty, note: note.trim() || null, created_by: userId });
          if (error) throw new Error(errorMessage(error));
        } else {
          if (sourceType === SOURCE_TYPES.purchase && (!Number.isFinite(unitPrice) || unitPrice <= 0)) throw new Error('Enter the purchase cost per unit so the purchase expense can be recorded.');
          const { error } = await supabase.rpc('create_stock_receipt', { p_entry_date: entryDate, p_product_id: product.id, p_batch_id: batch?.id ?? null, p_quantity: qty, p_source: sourceType, p_supplier_id: supplier?.id ?? null, p_unit_cost: price.trim() ? unitPrice : null, p_note: note.trim() || null });
          if (error) throw new Error(errorMessage(error));
        }
      } else if (kind === 'sale') {
        const lines = [...saleLines];
        const selectedPrice = Number(product?.price ?? 0);
        if (product && (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(selectedPrice) || selectedPrice < 0)) throw new Error('Finish the current product quantity, or remove it before saving.');
        if (product && Number.isFinite(qty) && qty > 0 && Number.isFinite(selectedPrice) && selectedPrice >= 0) lines.push({ product_id: product.id, name: product.name, quantity: qty, unit_price: selectedPrice, batch_id: batch?.id ?? null, batch_name: batch?.name });
        if (!lines.length) throw new Error('Add at least one product and quantity to the sale.');
        if (paymentType !== PAYMENT_TYPES.cash && !customer) throw new Error('Choose the customer for a credit sale so the balance is recorded correctly.');
        const saleTotal = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
        const amountReceived = paymentType === PAYMENT_TYPES.cash ? saleTotal : paymentType === PAYMENT_TYPES.credit ? 0 : Number(paid);
        if (!Number.isFinite(amountReceived) || amountReceived < 0 || amountReceived > saleTotal) throw new Error('Amount received must be between zero and the sale total.');
        if (paymentType === PAYMENT_TYPES.cash && amountReceived !== saleTotal) throw new Error('For a cash sale, record the full sale total.');
        if (paymentType === PAYMENT_TYPES.credit && amountReceived !== 0) throw new Error('For a credit sale, set the amount received to zero or choose part paid.');
        if (paymentType === PAYMENT_TYPES.partPaid && (amountReceived <= 0 || amountReceived >= saleTotal)) throw new Error('For part paid, enter an amount greater than zero and less than the sale total.');
        const { error } = await supabase.rpc('create_farm_sale', { p_entry_date: entryDate, p_customer_id: customer?.id ?? null, p_items: lines.map(({ product_id, batch_id, quantity }) => ({ product_id, batch_id, quantity })), p_amount_received: amountReceived, p_note: note.trim() || null });
        if (error) throw new Error(errorMessage(error));
      } else if (kind === 'payment') {
        if (!customer || !worker || !Number.isFinite(money) || money <= 0) throw new Error('Choose a customer and the person who received the money, then enter a valid amount.');
        const { error } = await supabase.from('payments').insert({ entry_date: entryDate, customer_id: customer.id, amount: money, method: paymentMethod, received_by_worker_id: worker.id, note: note.trim() || null, created_by: userId });
        if (error) throw new Error(errorMessage(error));
      } else if (kind === 'expense') {
        if (!category || !description.trim() || !Number.isFinite(money) || money <= 0) throw new Error('Choose a category, describe the expense and enter an amount greater than zero.');
        const { error } = await supabase.from('expenses').insert({ entry_date: entryDate, category_id: category.id, description: description.trim(), amount: money, method: paymentMethod, supplier_id: supplier?.id ?? null, created_by: userId });
        if (error) throw new Error(errorMessage(error));
      } else if (kind === 'activity') {
        if (!activityType) throw new Error('Choose the type of farm activity.');
        if (product && (!Number.isFinite(qty) || qty <= 0)) throw new Error('Enter a quantity greater than zero for the product used.');
        const inputs = product ? [{ product_id: product.id, quantity: qty, note: note.trim() || null }] : [];
        const { error } = await supabase.rpc('create_farm_activity', { p_entry_date: entryDate, p_activity_type_id: activityType.id, p_location_id: location?.id ?? null, p_description: description.trim() || null, p_worker_ids: activityWorkerIds, p_inputs: inputs });
        if (error) throw new Error(errorMessage(error));
      } else if (kind === 'loss') {
        if (!product || !lossReason || !Number.isFinite(qty) || qty <= 0) throw new Error('Choose a product and loss reason, then enter a quantity greater than zero.');
        const { error } = await supabase.rpc('create_stock_loss', { p_entry_date: entryDate, p_product_id: product.id, p_batch_id: batch?.id ?? null, p_quantity: qty, p_loss_reason_id: lossReason.id, p_note: note.trim() || null });
        if (error) throw new Error(errorMessage(error));
      } else {
        if (!product || !batchName.trim() || !Number.isFinite(qty) || qty <= 0) throw new Error('Choose the product, name the batch and enter the starting count.');
        if (sourceType === SOURCE_TYPES.purchase && (!Number.isFinite(unitPrice) || unitPrice <= 0)) throw new Error('Enter the purchase cost per bird so the purchase expense can be recorded.');
        const { error } = await supabase.rpc('create_livestock_batch', { p_product_id: product.id, p_name: batchName.trim(), p_stage: stage, p_breed_id: breed?.id ?? null, p_supplier_id: supplier?.id ?? null, p_initial_count: Math.floor(qty), p_arrival_date: entryDate, p_source: sourceType, p_unit_cost: price.trim() ? unitPrice : null, p_note: note.trim() || null });
        if (error) throw new Error(errorMessage(error));
      }
      setMessage({ text: 'Saved to the farm record.', success: true });
      setProduct(undefined); setCustomer(undefined); setWorker(undefined); setSupplier(undefined); setCategory(undefined); setActivityType(undefined); setLocation(undefined); setBreed(undefined); setLossReason(undefined);
      setActivityWorkerIds([]);
      setSaleLines([]);
      setQuantity(''); setPrice(''); setAmount(''); setPaid(''); setDescription(''); setNote(''); setBatchName('');
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not save this record. Check your connection and try again.', success: false });
    } finally { setSaving(false); }
  };

  if (!kind) return (
    <Screen>
      <ScreenHeader title="New record" subtitle="Choose what happened on the farm" />
      {message ? <Text style={s.noticeSuccess}>{message.text}</Text> : null}
      {loadingRefs ? <View style={s.loading}><ActivityIndicator color={colors.forest} /><Text style={s.helper}>Loading your farm lists…</Text></View> : null}
      {refsError ? <View style={s.noticeError}><Text style={s.noticeText}>{refsError}</Text></View> : null}
      <View style={s.actionList}>
        {(Object.keys(config) as Kind[]).filter((key) => key !== 'opening' || profile?.role === 'admin').map((key) => (
          <Pressable key={key} onPress={() => openForm(key)} style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.75 }]} accessibilityRole="button">
            <View style={[s.actionIcon, { backgroundColor: config[key].tint }]}><MaterialCommunityIcons name={config[key].icon} size={22} color={colors.forest} /></View>
            <View style={{ flex: 1 }}><Text style={s.actionTitle}>{config[key].title}</Text><Text style={s.actionHint}>{config[key].hint}</Text></View>
            <MaterialCommunityIcons name="chevron-right" size={21} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );

  const form = config[kind];
  const products = refs.products;
  const stageOptions: Option[] = [
    { id: 'chicks', name: 'Chicks' }, { id: 'growers', name: 'Growers' }, { id: 'layers', name: 'Layers' }, { id: 'broilers', name: 'Broilers' }, { id: 'old_stock', name: 'Existing / older stock' },
  ];
  const stages = stageOptions.map((o) => ({ ...o, stage: o.id }));

  return (
    <Screen>
      <Pressable style={s.back} onPress={back} accessibilityRole="button"><MaterialCommunityIcons name="arrow-left" size={20} color={colors.forest} /><Text style={s.backText}>All record types</Text></Pressable>
      <View style={s.formIntro}><View style={[s.actionIcon, { backgroundColor: form.tint }]}><MaterialCommunityIcons name={form.icon} size={22} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={s.formTitle}>{form.title}</Text><Text style={s.actionHint}>{form.hint}</Text></View></View>
      {kind === 'receive' ? <>
        <Picker label="Product" value={product} options={products} onSelect={(v) => { setProduct(v); setBatch(undefined); }} />
        {product && refs.batches.some((item) => item.product_id === product.id) ? <Picker label="Livestock batch (optional)" value={batch} options={refs.batches.filter((item) => item.product_id === product.id)} onSelect={setBatch} /> : null}
        <SegmentChoices label="Receipt source" value={sourceType} options={[{ value: SOURCE_TYPES.ownHarvest, label: 'Own harvest' }, { value: SOURCE_TYPES.supplier, label: 'Supplier' }, { value: SOURCE_TYPES.purchase, label: 'Purchase' }]} onChange={(v) => setSourceType(v as typeof sourceType)} />
        <Field label="Quantity received" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="e.g. 25" />
        {sourceType === SOURCE_TYPES.purchase ? <Field label="Unit cost (MWK)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Required for purchase" /> : null}
        <Picker label="Supplier (optional)" value={supplier} options={refs.suppliers} onSelect={setSupplier} />
        <Field label="Date (YYYY-MM-DD)" value={entryDate} onChangeText={setEntryDate} placeholder="2026-11-13" />
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Delivery or receipt details" multiline />
      </> : null}
      {kind === 'sale' ? <>
        <Picker label="Customer (optional)" value={customer} options={refs.customers} onSelect={setCustomer} emptyLabel="Walk-in customer" />
        <Picker label="Product" value={product} options={products} onSelect={(v) => { setProduct(v); setBatch(undefined); setQuantity(''); setPrice(v.price?.toString() ?? '0'); }} />
        {product && refs.batches.some((item) => item.product_id === product.id) ? <Picker label="Livestock batch (optional)" value={batch} options={refs.batches.filter((item) => item.product_id === product.id)} onSelect={setBatch} /> : null}
        <Field label="Quantity sold" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="e.g. 3" />
        <Field label="Price per unit (MWK)" value={String(product?.price ?? '')} onChangeText={() => undefined} keyboardType="decimal-pad" placeholder="Saved product price" editable={false} />
        <Pressable onPress={addSaleLine} style={s.addItemButton} accessibilityRole="button"><MaterialCommunityIcons name="plus" size={17} color={colors.forest} /><Text style={s.addItemText}>Add product to sale</Text></Pressable>
        {saleLines.map((line, index) => <View key={`${line.product_id}-${index}`} style={s.saleLine}><View style={{ flex: 1 }}><Text style={s.saleLineName}>{line.name}{line.batch_name ? ` · ${line.batch_name}` : ''}</Text><Text style={s.saleLineMeta}>{line.quantity} × {moneyLabel(line.unit_price)}</Text></View><Text style={s.saleLineTotal}>{moneyLabel(line.quantity * line.unit_price)}</Text><Pressable onPress={() => setSaleLines((items) => items.filter((_, itemIndex) => itemIndex !== index))} accessibilityRole="button" accessibilityLabel={`Remove ${line.name}`}><MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.muted} /></Pressable></View>)}
        <View style={s.totalCard}><Text style={s.totalLabel}>Sale total</Text><Text style={s.totalValue}>MWK {total.toLocaleString('en-MW')}</Text></View>
        <Text style={s.fieldLabel}>Payment type</Text>
        <SegmentChoices label="Payment type" value={paymentType} options={[{ value: PAYMENT_TYPES.cash, label: 'Cash' }, { value: PAYMENT_TYPES.credit, label: 'Credit' }, { value: PAYMENT_TYPES.partPaid, label: 'Part paid' }]} onChange={(v) => { setPaymentType(v as typeof paymentType); setPaid(''); }} />
        {paymentType !== PAYMENT_TYPES.cash ? <Field label="Amount received (MWK)" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" placeholder={paymentType === PAYMENT_TYPES.credit ? '0 if unpaid' : 'Amount received'} /> : <Text style={s.actionHint}>Paid in full · {moneyLabel(total)}</Text>}
        <Field label="Date (YYYY-MM-DD)" value={entryDate} onChangeText={setEntryDate} placeholder="2026-11-13" />
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Sale details" multiline />
      </> : null}
      {kind === 'payment' ? <>
        <Picker label="Customer" value={customer} options={refs.customers} onSelect={setCustomer} />
        <Field label="Amount received (MWK)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 15,000" />
        <SegmentChoices label="Payment method" value={paymentMethod} options={[{ value: PAYMENT_METHODS.cash, label: 'Cash' }, { value: PAYMENT_METHODS.mobileMoney, label: 'Mobile money' }, { value: PAYMENT_METHODS.bank, label: 'Bank' }]} onChange={(v) => setPaymentMethod(v as typeof paymentMethod)} />
        <Picker label="Received by" value={worker} options={refs.workers} onSelect={setWorker} />
        <Field label="Date (YYYY-MM-DD)" value={entryDate} onChangeText={setEntryDate} placeholder="2026-11-13" />
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Payment details" multiline />
      </> : null}
      {kind === 'expense' ? <>
        <Picker label="Expense category" value={category} options={refs.categories} onSelect={setCategory} />
        <Field label="What was the expense for?" value={description} onChangeText={setDescription} placeholder="e.g. Transport to market" multiline />
        <Field label="Amount spent (MWK)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 8,500" />
        <SegmentChoices label="Payment method" value={paymentMethod} options={[{ value: PAYMENT_METHODS.cash, label: 'Cash' }, { value: PAYMENT_METHODS.mobileMoney, label: 'Mobile money' }, { value: PAYMENT_METHODS.bank, label: 'Bank' }]} onChange={(v) => setPaymentMethod(v as typeof paymentMethod)} />
        <Picker label="Supplier (optional)" value={supplier} options={refs.suppliers} onSelect={setSupplier} />
        <Field label="Date (YYYY-MM-DD)" value={entryDate} onChangeText={setEntryDate} placeholder="2026-11-13" />
      </> : null}
      {kind === 'activity' ? <>
        <Picker label="Activity type" value={activityType} options={refs.activities} onSelect={setActivityType} />
        <Picker label="Field / location (optional)" value={location} options={refs.locations} onSelect={setLocation} />
        <Field label="What was done?" value={description} onChangeText={setDescription} placeholder="e.g. Weed the north maize field" multiline />
        <View style={s.fieldWrap}><Text style={s.fieldLabel}>Workers involved (optional)</Text><View style={s.segmentRow}>{refs.workers.map((person) => { const selected = activityWorkerIds.includes(person.id); return <Pressable key={person.id} onPress={() => setActivityWorkerIds((current) => selected ? current.filter((id) => id !== person.id) : [...current, person.id])} style={[s.segment, selected && s.segmentActive]} accessibilityRole="button"><Text style={[s.segmentText, selected && s.segmentTextActive]}>{person.name}</Text></Pressable>; })}{!refs.workers.length ? <Text style={s.helper}>No workers set up yet.</Text> : null}</View></View>
        <Picker label="Product used (optional)" value={product} options={products} onSelect={(v) => { setProduct(v); setBatch(undefined); }} />
        {product ? <Field label="Quantity used" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="e.g. 5" /> : null}
        {product ? <Field label="Input note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Applied across north field" multiline /> : null}
        <Field label="Date (YYYY-MM-DD)" value={entryDate} onChangeText={setEntryDate} placeholder="2026-11-13" />
      </> : null}
      {kind === 'loss' ? <>
        <Picker label="Product" value={product} options={products} onSelect={(v) => { setProduct(v); setBatch(undefined); }} />
        {product && refs.batches.some((item) => item.product_id === product.id) ? <Picker label="Livestock batch (optional)" value={batch} options={refs.batches.filter((item) => item.product_id === product.id)} onSelect={setBatch} /> : null}
        <Field label="Quantity lost" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="e.g. 2" />
        <Picker label="Reason" value={lossReason} options={refs.reasons} onSelect={setLossReason} />
        <Field label="Date (YYYY-MM-DD)" value={entryDate} onChangeText={setEntryDate} placeholder="2026-11-13" />
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Add details" multiline />
      </> : null}
      {kind === 'livestock' ? <>
        <Picker label="Livestock product" value={product} options={products} onSelect={setProduct} />
        <Field label="Batch name" value={batchName} onChangeText={setBatchName} placeholder="e.g. November chicks" />
        <Text style={s.fieldLabel}>Growth stage</Text>
        <View style={s.segmentRow}>{stages.map((o) => <Pressable key={o.id} onPress={() => setStage(o.id)} style={[s.segment, stage === o.id && s.segmentActive]} accessibilityRole="button"><Text style={[s.segmentText, stage === o.id && s.segmentTextActive]}>{o.name}</Text></Pressable>)}</View>
        <Picker label="Breed (optional)" value={breed} options={refs.breeds} onSelect={setBreed} />
        <Field label="Starting count" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="Number of animals" />
        <SegmentChoices label="Batch source" value={sourceType} options={[{ value: SOURCE_TYPES.ownHarvest, label: 'Farm bred' }, { value: SOURCE_TYPES.supplier, label: 'Supplier' }, { value: SOURCE_TYPES.purchase, label: 'Purchase' }]} onChange={(v) => setSourceType(v as typeof sourceType)} />
        {sourceType === SOURCE_TYPES.purchase ? <Field label="Cost per animal (MWK)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Required for purchase" /> : null}
        <Picker label="Supplier (optional)" value={supplier} options={refs.suppliers} onSelect={setSupplier} />
        <Field label="Arrival date (YYYY-MM-DD)" value={entryDate} onChangeText={setEntryDate} placeholder="2026-11-13" />
      </> : null}

      {refsError ? <View style={s.noticeError}><Text style={s.noticeText}>{refsError}</Text></View> : null}
      {message ? <View style={message.success ? s.noticeSuccess : s.noticeError}><Text style={message.success ? s.successText : s.noticeText}>{message.text}</Text></View> : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable onPress={save} disabled={saving} accessibilityRole="button" style={({ pressed }) => [s.saveButton, (pressed || saving) && { opacity: 0.75 }]}>
          {saving ? <ActivityIndicator color={colors.white} /> : <><Text style={s.saveText}>Save record</Text><MaterialCommunityIcons name="check" size={18} color={colors.white} /></>}
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  actionList: { gap: 10 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { color: colors.charcoal, fontSize: 14, fontWeight: '700' },
  actionHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  helper: { color: colors.muted, fontSize: 13 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 2 },
  backText: { color: colors.forest, fontSize: 13, fontWeight: '600' },
  formIntro: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5, marginBottom: 2 },
  formTitle: { color: colors.charcoal, fontSize: 19, fontWeight: '700' },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: colors.charcoal, fontSize: 13, fontWeight: '600' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 14, fontSize: 15, color: colors.charcoal, backgroundColor: colors.white },
  multiline: { minHeight: 82, paddingTop: 13, textAlignVertical: 'top' },
  select: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white },
  selectText: { fontSize: 15, color: colors.charcoal, flex: 1 },
  placeholder: { color: colors.muted },
  modalShade: { flex: 1, backgroundColor: 'rgba(23,35,28,0.32)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '75%', backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  modalHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: colors.line, marginBottom: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { color: colors.charcoal, fontSize: 18, fontWeight: '700' },
  option: { minHeight: 50, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionText: { color: colors.charcoal, fontSize: 15 },
  noOptions: { color: colors.muted, fontSize: 14, lineHeight: 20, paddingVertical: 20 },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.softGreen, padding: 15, borderRadius: 14 },
  totalLabel: { color: colors.muted, fontSize: 13 },
  totalValue: { color: colors.forest, fontSize: 19, fontWeight: '800' },
  addItemButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.forest, borderRadius: 12 },
  addItemText: { color: colors.forest, fontSize: 13, fontWeight: '700' },
  saleLine: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 11 },
  saleLineName: { color: colors.charcoal, fontSize: 13, fontWeight: '700' },
  saleLineMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  saleLineTotal: { color: colors.charcoal, fontSize: 12, fontWeight: '700' },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: colors.white },
  segmentActive: { backgroundColor: colors.softGreen, borderColor: colors.forest },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: colors.forest },
  saveButton: { minHeight: 52, borderRadius: 15, backgroundColor: colors.forest, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, marginTop: 5 },
  saveText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  noticeError: { borderRadius: 12, padding: 12, backgroundColor: colors.softRed },
  noticeSuccess: { borderRadius: 12, padding: 12, backgroundColor: colors.softGreen },
  noticeText: { color: colors.alert, fontSize: 13, lineHeight: 19 },
  successText: { color: colors.forest, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
