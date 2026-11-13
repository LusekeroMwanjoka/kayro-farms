-- Kayro Farms: atomic ledger writes and RLS-safe balance summaries.
-- Apply after reviewing against the live schema. Existing enum/helper functions are reused.

-- Seed legacy batch counts into the ledger once so the new ledger-based batch totals
-- include existing flocks. A batch with a recorded opening/receipt is left untouched.
insert into public.stock_movements(entry_date,product_id,batch_id,movement_type,quantity,source,note,created_by)
select b.arrival_date,b.product_id,b.id,'opening',b.initial_count,'own_harvest',
       'Initial batch balance migrated from batches.initial_count',b.created_by
from public.batches b
where coalesce(b.initial_count,0)>0
  and not exists (
    select 1 from public.stock_movements m
    where m.batch_id=b.id and m.movement_type in ('opening','received')
  );

create or replace function public.create_farm_sale(
  p_entry_date date,
  p_customer_id uuid,
  p_items jsonb,
  p_amount_received numeric,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = public
as $function$
declare
  v_sale_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product_id uuid;
  v_batch_id uuid;
  v_qty numeric;
  v_price numeric;
  v_total numeric := 0;
  v_type public.payment_type;
begin
  if auth.uid() is null or not is_staff() or not can_write_date(p_entry_date) then
    raise exception 'Not allowed to write this farm date' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale must contain at least one item';
  end if;
  perform p.id from products p
  where p.id in (select (value->>'product_id')::uuid from jsonb_array_elements(p_items))
  order by p.id for update;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_batch_id := nullif(v_item->>'batch_id', '')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'Sale quantity must be greater than zero'; end if;
    select price into v_price from products where id = v_product_id and active;
    if not found then raise exception 'Product is unavailable'; end if;
    if v_batch_id is not null and not exists(select 1 from batches where id=v_batch_id and product_id=v_product_id and status='active') then
      raise exception 'Selected batch does not belong to this product';
    end if;
    v_total := v_total + round(v_qty * coalesce(v_price,0), 2);
  end loop;
  if p_amount_received is null or p_amount_received < 0 or p_amount_received > v_total then
    raise exception 'Amount received must be between zero and the sale total';
  end if;
  if v_total > 0 and p_amount_received = 0 then v_type := 'credit';
  elsif p_amount_received = v_total then v_type := 'cash';
  else v_type := 'part_paid'; end if;
  if v_type <> 'cash' and p_customer_id is null then raise exception 'Customer is required for credit sales'; end if;

  insert into sales(id,entry_date,customer_id,payment_type,deposit_amount,note,created_by)
  values(v_sale_id,p_entry_date,p_customer_id,v_type,p_amount_received,nullif(btrim(p_note),''),auth.uid());
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_batch_id := nullif(v_item->>'batch_id', '')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    select price into v_price from products where id=v_product_id;
    insert into sale_items(sale_id,product_id,batch_id,quantity,unit_price)
    values(v_sale_id,v_product_id,v_batch_id,v_qty,coalesce(v_price,0));
  end loop;
  return v_sale_id;
end $function$;

create or replace function public.create_farm_activity(
  p_entry_date date,
  p_activity_type_id uuid,
  p_location_id uuid,
  p_description text,
  p_worker_ids uuid[] default '{}',
  p_inputs jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $function$
declare
  v_id uuid := gen_random_uuid(); v_item jsonb;
begin
  if auth.uid() is null or not is_staff() or not can_write_date(p_entry_date) then
    raise exception 'Not allowed to write this farm date' using errcode = '42501';
  end if;
  if not exists(select 1 from activity_types where id=p_activity_type_id and active) then raise exception 'Activity type is unavailable'; end if;
  if jsonb_typeof(coalesce(p_inputs,'[]'::jsonb)) <> 'array' then raise exception 'Activity inputs must be a list'; end if;
  perform p.id from products p
  where p.id in (select (value->>'product_id')::uuid from jsonb_array_elements(coalesce(p_inputs,'[]'::jsonb)))
  order by p.id for update;
  insert into activities(id,entry_date,activity_type_id,location_id,description,created_by)
  values(v_id,p_entry_date,p_activity_type_id,p_location_id,nullif(btrim(p_description),''),auth.uid());
  insert into activity_workers(activity_id,worker_id)
  select v_id, worker_id from unnest(coalesce(p_worker_ids,'{}'::uuid[])) as worker_id
  on conflict do nothing;
  for v_item in select value from jsonb_array_elements(coalesce(p_inputs,'[]'::jsonb)) loop
    if (v_item->>'quantity')::numeric <= 0 then raise exception 'Input quantity must be greater than zero'; end if;
    insert into activity_inputs(activity_id,product_id,quantity,note)
    values(v_id,(v_item->>'product_id')::uuid,(v_item->>'quantity')::numeric,nullif(v_item->>'note',''));
  end loop;
  return v_id;
end $function$;

create or replace function public.create_stock_loss(
  p_entry_date date,p_product_id uuid,p_batch_id uuid,p_quantity numeric,p_loss_reason_id uuid,p_note text default null
) returns uuid
language plpgsql security definer set search_path = public
as $function$
declare v_id uuid := gen_random_uuid();
begin
  if auth.uid() is null or not is_staff() or not can_write_date(p_entry_date) then
    raise exception 'Not allowed to write this farm date' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Loss quantity must be greater than zero'; end if;
  perform 1 from products where id=p_product_id for update;
  if not found then raise exception 'Product is unavailable'; end if;
  if p_batch_id is not null and not exists(select 1 from batches where id=p_batch_id and product_id=p_product_id and status='active') then raise exception 'Batch does not belong to this product'; end if;
  if not exists(select 1 from loss_reasons where id=p_loss_reason_id and active) then raise exception 'Loss reason is unavailable'; end if;
  insert into stock_movements(id,entry_date,product_id,batch_id,movement_type,quantity,loss_reason_id,note,created_by)
  values(v_id,p_entry_date,p_product_id,p_batch_id,'lost',p_quantity,p_loss_reason_id,nullif(btrim(p_note),''),auth.uid());
  return v_id;
end $function$;

create or replace function public.create_stock_receipt(
  p_entry_date date,p_product_id uuid,p_batch_id uuid,p_quantity numeric,
  p_source public.source_type,p_supplier_id uuid,p_unit_cost numeric,p_note text
) returns uuid
language plpgsql security definer set search_path = public
as $function$
declare v_id uuid := gen_random_uuid();
begin
  if auth.uid() is null or not is_staff() or not can_write_date(p_entry_date) then
    raise exception 'Not allowed to write this farm date' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Receipt quantity must be greater than zero'; end if;
  if not exists(select 1 from products where id=p_product_id and active) then raise exception 'Product is unavailable'; end if;
  if p_batch_id is not null and not exists(select 1 from batches where id=p_batch_id and product_id=p_product_id and status='active') then raise exception 'Batch does not belong to this product'; end if;
  if p_source='purchase' and coalesce(p_unit_cost,0)>0 and not exists(select 1 from expense_categories where code='stock_purchase' and active) then
    raise exception 'Add an active stock_purchase expense category before recording a purchase';
  end if;
  insert into stock_movements(id,entry_date,product_id,batch_id,movement_type,quantity,source,supplier_id,unit_cost,note,created_by)
  values(v_id,p_entry_date,p_product_id,p_batch_id,'received',p_quantity,p_source,p_supplier_id,p_unit_cost,nullif(btrim(p_note),''),auth.uid());
  return v_id;
end $function$;

create or replace function public.create_livestock_batch(
  p_product_id uuid,p_name text,p_stage text,p_breed_id uuid,p_supplier_id uuid,
  p_initial_count integer,p_arrival_date date,p_source public.source_type,p_unit_cost numeric,p_note text
) returns uuid
language plpgsql security definer set search_path = public
as $function$
declare v_batch_id uuid := gen_random_uuid();
begin
  if auth.uid() is null or not is_staff() or not can_write_date(p_arrival_date) then
    raise exception 'Not allowed to write this farm date' using errcode = '42501';
  end if;
  if p_initial_count is null or p_initial_count <= 0 then raise exception 'Starting count must be greater than zero'; end if;
  if p_stage not in ('chicks','growers','layers','broilers','old_stock') then raise exception 'Invalid livestock stage'; end if;
  if not exists(select 1 from products where id=p_product_id and active) then raise exception 'Product is unavailable'; end if;
  if p_source='purchase' and coalesce(p_unit_cost,0)>0 and not exists(select 1 from expense_categories where code='stock_purchase' and active) then
    raise exception 'Add an active stock_purchase expense category before recording a purchase';
  end if;
  insert into batches(id,product_id,name,stage,breed_id,supplier_id,initial_count,arrival_date,created_by)
  values(v_batch_id,p_product_id,btrim(p_name),p_stage,p_breed_id,p_supplier_id,p_initial_count,p_arrival_date,auth.uid());
  insert into stock_movements(entry_date,product_id,batch_id,movement_type,quantity,source,supplier_id,unit_cost,note,created_by)
  values(p_arrival_date,p_product_id,v_batch_id,'received',p_initial_count,p_source,p_supplier_id,p_unit_cost,nullif(btrim(p_note),''),auth.uid());
  return v_batch_id;
end $function$;

create or replace function public.submit_farm_day(p_entry_date date,p_note text default null)
returns void language plpgsql security definer set search_path = public
as $function$
begin
  if auth.uid() is null or not is_staff() or not can_write_date(p_entry_date) or p_entry_date > farm_today() then
    raise exception 'Not allowed to submit this farm date' using errcode = '42501';
  end if;
  insert into days(entry_date,status,submitted_by,submitted_at,note)
  values(p_entry_date,'submitted',auth.uid(),now(),nullif(btrim(p_note),''))
  on conflict(entry_date) do update set status='submitted',submitted_by=auth.uid(),submitted_at=now(),note=excluded.note,updated_at=now();
end $function$;

create or replace function public.farm_stock_balances(p_as_of_date date default farm_today())
returns table(product_id uuid,product_name text,category public.item_category,unit_name text,price numeric,low_stock_threshold numeric,opening numeric,closing numeric)
language plpgsql stable security definer set search_path = public
as $function$
begin
  if auth.uid() is null or not is_staff() then raise exception 'Authentication required' using errcode='42501'; end if;
  return query
  select p.id,p.name,p.category,u.name,p.price,p.low_stock_threshold,
    coalesce(sum(case when m.entry_date < p_as_of_date or (m.entry_date=p_as_of_date and m.movement_type='opening') then signed_qty(m.movement_type,m.quantity) else 0 end),0),
    coalesce(sum(signed_qty(m.movement_type,m.quantity)),0)
  from products p join units u on u.id=p.unit_id
  left join stock_movements m on m.product_id=p.id and m.entry_date<=p_as_of_date
  where p.active group by p.id,u.name order by p.name;
end $function$;

create or replace function public.farm_livestock_batch_balances(p_as_of_date date default farm_today())
returns table(batch_id uuid,product_id uuid,batch_name text,stage text,initial_count integer,arrival_date date,product_name text,breed_name text,current_count numeric)
language plpgsql stable security definer set search_path = public
as $function$
begin
  if auth.uid() is null or not is_staff() then raise exception 'Authentication required' using errcode='42501'; end if;
  return query
  select b.id,b.product_id,b.name,b.stage,b.initial_count,b.arrival_date,p.name,br.name,
    coalesce(sum(signed_qty(m.movement_type,m.quantity)),0)
  from batches b join products p on p.id=b.product_id left join breeds br on br.id=b.breed_id
  left join stock_movements m on m.batch_id=b.id and m.entry_date<=p_as_of_date
  where b.status='active' and b.arrival_date<=p_as_of_date
  group by b.id,p.name,br.name order by b.arrival_date desc;
end $function$;

revoke all on function public.create_farm_sale(date,uuid,jsonb,numeric,text) from public;
revoke all on function public.create_farm_activity(date,uuid,uuid,text,uuid[],jsonb) from public;
revoke all on function public.create_stock_loss(date,uuid,uuid,numeric,uuid,text) from public;
revoke all on function public.create_stock_receipt(date,uuid,uuid,numeric,public.source_type,uuid,numeric,text) from public;
revoke all on function public.create_livestock_batch(uuid,text,text,uuid,uuid,integer,date,public.source_type,numeric,text) from public;
revoke all on function public.submit_farm_day(date,text) from public;
revoke all on function public.farm_stock_balances(date) from public;
revoke all on function public.farm_livestock_batch_balances(date) from public;
grant execute on function public.create_farm_sale(date,uuid,jsonb,numeric,text) to authenticated;
grant execute on function public.create_farm_activity(date,uuid,uuid,text,uuid[],jsonb) to authenticated;
grant execute on function public.create_stock_loss(date,uuid,uuid,numeric,uuid,text) to authenticated;
grant execute on function public.create_stock_receipt(date,uuid,uuid,numeric,public.source_type,uuid,numeric,text) to authenticated;
grant execute on function public.create_livestock_batch(uuid,text,text,uuid,uuid,integer,date,public.source_type,numeric,text) to authenticated;
grant execute on function public.submit_farm_day(date,text) to authenticated;
grant execute on function public.farm_stock_balances(date) to authenticated;
grant execute on function public.farm_livestock_batch_balances(date) to authenticated;
