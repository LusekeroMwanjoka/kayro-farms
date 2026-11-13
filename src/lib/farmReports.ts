import { supabase } from './supabase';
import { PAYMENT_TYPES } from './farmEnums';

export function localFarmDate() {
  const date = new Date();
  const part = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`;
}

const sum = (values: Array<number | string | null | undefined>) => values.reduce<number>((total, value) => total + Number(value ?? 0), 0);

export async function loadDailyFarmReport(date = localFarmDate()) {
  const [sales, payments, expenses, movements, activities, day] = await Promise.all([
    supabase.from('sales').select('id,payment_type,deposit_amount,sale_items(line_total,quantity,unit_price)').eq('entry_date', date),
    supabase.from('payments').select('amount').eq('entry_date', date),
    supabase.from('expenses').select('amount').eq('entry_date', date),
    supabase.from('stock_movements').select('id,movement_type,quantity').eq('entry_date', date),
    supabase.from('activities').select('id').eq('entry_date', date),
    supabase.from('days').select('status,note,submitted_at').eq('entry_date', date).maybeSingle(),
  ]);

  const firstError = [sales.error, payments.error, expenses.error, movements.error, activities.error, day.error].find(Boolean);
  if (firstError) throw new Error(firstError.message);

  const saleRows = (sales.data ?? []) as Array<{ id: string; payment_type: string; deposit_amount: number | string | null; sale_items: Array<{ line_total: number | string | null; quantity: number | string; unit_price: number | string }> }>;
  const totalSales = saleRows.reduce((grandTotal, sale) => grandTotal + (sale.sale_items ?? []).reduce((lineSum, line) => lineSum + Number(line.line_total ?? Number(line.quantity) * Number(line.unit_price)), 0), 0);
  return {
    date,
    salesCount: saleRows.length,
    salesTotal: totalSales,
    receivedOnSales: sum(saleRows.map((sale) => sale.deposit_amount)),
    paymentTotal: sum((payments.data ?? []).map((payment) => payment.amount)),
    expenseTotal: sum((expenses.data ?? []).map((expense) => expense.amount)),
    movementCount: movements.data?.length ?? 0,
    activityCount: activities.data?.length ?? 0,
    dayStatus: day.data?.status ?? 'open',
    dayNote: day.data?.note ?? '',
    submittedAt: day.data?.submitted_at ?? null,
  };
}

export async function loadCustomerCreditBalances() {
  const pageSize = 500;
  const creditSales: Array<{ customer_id: string | null; deposit_amount: number | string | null; sale_items: Array<{ line_total: number | string | null; quantity: number | string; unit_price: number | string }> }> = [];
  const customerPayments: Array<{ customer_id: string; amount: number | string }> = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('sales').select('customer_id,payment_type,deposit_amount,sale_items(line_total,quantity,unit_price)').in('payment_type', [PAYMENT_TYPES.credit, PAYMENT_TYPES.partPaid]).order('created_at').range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Array<{ customer_id: string | null; payment_type: string; deposit_amount: number | string | null; sale_items: Array<{ line_total: number | string | null; quantity: number | string; unit_price: number | string }> }>;
    creditSales.push(...page);
    if (page.length < pageSize) break;
  }
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('payments').select('customer_id,amount').order('created_at').range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Array<{ customer_id: string; amount: number | string }>;
    customerPayments.push(...page);
    if (page.length < pageSize) break;
  }

  const balances = new Map<string, number>();
  for (const sale of creditSales) {
    if (!sale.customer_id) continue;
    const total = (sale.sale_items ?? []).reduce((sum, item) => sum + Number(item.line_total ?? Number(item.quantity) * Number(item.unit_price)), 0);
    balances.set(sale.customer_id, (balances.get(sale.customer_id) ?? 0) + total - Number(sale.deposit_amount ?? 0));
  }
  for (const payment of customerPayments) {
    if (balances.has(payment.customer_id)) balances.set(payment.customer_id, (balances.get(payment.customer_id) ?? 0) - Number(payment.amount));
  }
  const ids = [...balances.keys()];
  const customers = ids.length ? await supabase.from('customers').select('id,name').in('id', ids) : { data: [], error: null };
  if (customers.error) throw new Error(customers.error.message);
  const names = new Map((customers.data ?? []).map((customer) => [customer.id, customer.name]));
  return [...balances.entries()]
    .map(([id, balance]) => ({ id, name: names.get(id) ?? 'Customer', amount: Math.max(0, balance) }))
    .filter((customer) => customer.amount > 0.005)
    .sort((a, b) => b.amount - a.amount);
}

export type StockBalance = { id: string; name: string; category: string; price: number; low_stock_threshold: number; unit: { name: string } | null; opening: number | null; closing: number | null };
export type LivestockBatch = { id: string; name: string; product: string; stage: string; breed: string; arrival_date: string; current_count: number | null };

export async function loadStockBalances(date = localFarmDate()): Promise<StockBalance[]> {
  const { data, error } = await supabase.rpc('farm_stock_balances', { p_as_of_date: date });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ product_id: string; product_name: string; category: string; unit_name: string; price: number | string; low_stock_threshold: number | string; opening: number | string; closing: number | string }>).map((row) => ({
    id: row.product_id, name: row.product_name, category: row.category, price: Number(row.price), low_stock_threshold: Number(row.low_stock_threshold), unit: { name: row.unit_name }, opening: Number(row.opening), closing: Number(row.closing),
  }));
}

export async function loadLivestockBatches(date = localFarmDate()): Promise<LivestockBatch[]> {
  const { data, error } = await supabase.rpc('farm_livestock_batch_balances', { p_as_of_date: date });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ batch_id: string; batch_name: string; stage: string; arrival_date: string; product_name: string; breed_name: string | null; current_count: number | string }>).map((batch) => ({ id: batch.batch_id, name: batch.batch_name, product: batch.product_name, stage: batch.stage, breed: batch.breed_name ?? 'Breed not set', arrival_date: batch.arrival_date, current_count: Number(batch.current_count) }));
}

export type FarmRecord = { id: string; kind: string; title: string; detail: string; amount?: number; quantity?: number; created_at: string };

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

export async function loadRecentFarmRecords(limit = 20): Promise<FarmRecord[]> {
  const [sales, payments, expenses, activities, movements] = await Promise.all([
    supabase.from('sales').select('id,created_at,payment_type,deposit_amount,customers(name),sale_items(quantity,unit_price,line_total,products(name))').order('created_at', { ascending: false }).limit(limit),
    supabase.from('payments').select('id,created_at,amount,customers(name),workers(name)').order('created_at', { ascending: false }).limit(limit),
    supabase.from('expenses').select('id,created_at,description,amount,expense_categories(name)').order('created_at', { ascending: false }).limit(limit),
    supabase.from('activities').select('id,created_at,description,activity_types(name),locations(name)').order('created_at', { ascending: false }).limit(limit),
    supabase.from('stock_movements').select('id,created_at,movement_type,quantity,products(name)').is('sale_item_id', null).is('activity_input_id', null).order('created_at', { ascending: false }).limit(limit),
  ]);
  const error = [sales.error, payments.error, expenses.error, activities.error, movements.error].find(Boolean);
  if (error) throw new Error(error.message);

  const events: FarmRecord[] = [];
  for (const raw of (sales.data ?? []) as any[]) {
    const customer = one(raw.customers)?.name ?? 'Walk-in customer';
    const items = raw.sale_items ?? [];
    const amount = items.reduce((total: number, item: any) => total + Number(item.line_total ?? Number(item.quantity) * Number(item.unit_price)), 0);
    const name = items.map((item: any) => one(item.products)?.name).filter(Boolean).join(', ') || 'Farm products';
    events.push({ id: `sale-${raw.id}`, kind: 'Sale', title: name, detail: `${customer} · ${raw.payment_type}`, amount, created_at: raw.created_at });
  }
  for (const raw of (payments.data ?? []) as any[]) events.push({ id: `payment-${raw.id}`, kind: 'Payment', title: one(raw.customers)?.name ?? 'Customer payment', detail: `Received by ${one(raw.workers)?.name ?? 'farm worker'}`, amount: Number(raw.amount), created_at: raw.created_at });
  for (const raw of (expenses.data ?? []) as any[]) events.push({ id: `expense-${raw.id}`, kind: 'Expense', title: raw.description, detail: one(raw.expense_categories)?.name ?? 'Farm expense', amount: Number(raw.amount), created_at: raw.created_at });
  for (const raw of (activities.data ?? []) as any[]) events.push({ id: `activity-${raw.id}`, kind: 'Activity', title: one(raw.activity_types)?.name ?? 'Farm activity', detail: [raw.description, one(raw.locations)?.name].filter(Boolean).join(' · ') || 'Activity recorded', created_at: raw.created_at });
  for (const raw of (movements.data ?? []) as any[]) events.push({ id: `movement-${raw.id}`, kind: 'Stock', title: one(raw.products)?.name ?? 'Stock item', detail: String(raw.movement_type).replaceAll('_', ' '), quantity: Number(raw.quantity), created_at: raw.created_at });
  return events.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}
