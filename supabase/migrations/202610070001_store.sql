-- VN Imports: valores monetários em centavos; catálogo público e operação privada.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from admin_users where user_id=auth.uid()) $$;
create table public.products(id uuid primary key, slug text not null unique, status text not null check(status in ('active','draft','archived')), data jsonb not null, updated_at timestamptz not null default now());
create table public.product_variants(id uuid primary key, product_id uuid not null references public.products(id), sku text not null unique, stock integer not null default 0 check(stock>=0), data jsonb not null);
create index variants_product_idx on public.product_variants(product_id);
create table public.product_images(id text primary key, product_id uuid not null references public.products(id) on delete cascade, position integer not null, data jsonb not null);
create table public.categories(id text primary key, data jsonb not null);
create table public.collections(id text primary key, data jsonb not null);
create table public.looks(id text primary key, data jsonb not null);
create table public.social(id text primary key, data jsonb not null);
create table public.banners(id text primary key, data jsonb not null);
create table public.store_settings(id integer primary key check(id=1), data jsonb not null);
create table public.coupons(id uuid primary key, code text unique not null, data jsonb not null);
create table public.orders(id uuid primary key, number text not null unique, idempotency_key uuid not null unique, request_hash text not null, access_hash text not null, status text not null, inventory_state text not null check(inventory_state in ('reserved','committed','released')), total_cents integer not null check(total_cents>=0), data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index orders_status_date_idx on public.orders(status,created_at desc);
create index orders_payment_id_idx on public.orders((data->>'paymentId'));
create table public.order_items(id bigint generated always as identity primary key, order_id uuid not null references public.orders(id), product_id uuid not null references public.products(id), variant_id uuid not null references public.product_variants(id), quantity integer not null check(quantity>0), unit_cents integer not null check(unit_cents>0), data jsonb not null, unique(order_id,variant_id));
create table public.inventory_movements(id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants(id), product_id uuid not null references public.products(id), delta integer not null, reason text not null, order_id uuid references public.orders(id), actor text not null, created_at timestamptz not null default now());
create index inventory_history_idx on public.inventory_movements(variant_id,created_at desc);
create table public.coupon_usage(order_id uuid primary key references public.orders(id), coupon_id uuid not null references public.coupons(id), customer_email text not null, released boolean not null default false);
create index coupon_customer_idx on public.coupon_usage(coupon_id,customer_email) where not released;
create table public.payments(id bigint generated always as identity primary key, order_id uuid not null references public.orders(id), provider_id text, status text not null, created_at timestamptz not null default now());
create table public.webhook_events(id text primary key, received_at timestamptz not null default now());
create table public.shipping_quotes(id uuid primary key, data jsonb not null, expires_at timestamptz not null);
create index quote_expiry_idx on public.shipping_quotes(expires_at);
create table public.newsletter(id uuid primary key default gen_random_uuid(), email text not null unique, consent_at timestamptz not null, source text not null);
create table public.rate_limits(key text primary key, count integer not null, expires_at timestamptz not null);

-- Edição e imagens em uma única transação; estoque existente só muda pelo livro de movimentos.
create or replace function public.save_product(p jsonb, expected_updated_at text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare old products; v jsonb; old_stock integer; image jsonb; image_position integer:=0; pid uuid:=(p->>'id')::uuid;
begin
 select * into old from products where id=pid for update;
 if found and expected_updated_at is distinct from old.data->>'updatedAt' then raise exception 'CONFLICT: produto alterado. Recarregue o painel.'; end if;
 if exists(select 1 from products where id=pid) then
   if exists(select 1 from product_variants pv where pv.product_id=pid and not exists(select 1 from jsonb_array_elements(p->'variants') x where (x->>'id')::uuid=pv.id)) then raise exception 'VARIANT: desative variações existentes em vez de excluí-las.'; end if;
 end if;
 insert into products(id,slug,status,data) values(pid,p->>'slug',p->>'status',p-'variants'-'images') on conflict(id) do update set slug=excluded.slug,status=excluded.status,data=excluded.data,updated_at=now();
 for v in select * from jsonb_array_elements(p->'variants') loop
   if exists(select 1 from product_variants where id=(v->>'id')::uuid and product_id<>pid) then raise exception 'VARIANT: variação pertence a outro produto.'; end if;
   select stock into old_stock from product_variants where id=(v->>'id')::uuid;
   if not found then old_stock:=(v->>'stock')::integer;
     insert into product_variants(id,product_id,sku,stock,data) values((v->>'id')::uuid,pid,v->>'sku',old_stock,v-'stock');
     if old_stock<>0 then insert into inventory_movements(variant_id,product_id,delta,reason,actor) values((v->>'id')::uuid,pid,old_stock,'Estoque inicial','admin'); end if;
   else update product_variants set sku=v->>'sku',data=v-'stock' where id=(v->>'id')::uuid; end if;
 end loop;
 delete from product_images where product_id=pid;
 for image in select * from jsonb_array_elements(p->'images') loop
   insert into product_images(id,product_id,position,data) values(pid::text||':'||(image->>'id'),pid,image_position,image); image_position:=image_position+1;
 end loop;
 return p;
end $$;

create or replace function public.adjust_inventory(p_variant uuid,p_delta integer,p_reason text,p_actor text) returns void language plpgsql security definer set search_path=public as $$
declare pv product_variants;
begin
 select * into pv from product_variants where id=p_variant for update;
 if not found or p_delta=0 or pv.stock+p_delta<0 or length(trim(p_reason))<3 then raise exception 'STOCK: ajuste inválido ou estoque insuficiente.'; end if;
 update product_variants set stock=stock+p_delta where id=p_variant;
 insert into inventory_movements(variant_id,product_id,delta,reason,actor) values(p_variant,pv.product_id,p_delta,p_reason,p_actor);
end $$;

-- Toda reserva é serializada por variante e cupom. Chave idempotente antes de qualquer baixa.
create or replace function public.reserve_order(p jsonb, p_coupon jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare old orders; item jsonb; pv product_variants; prod products; cp coupons; count_usage integer; pid uuid:=(p->>'id')::uuid; settings jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p->>'idempotencyKey',0));
 select * into old from orders where idempotency_key=(p->>'idempotencyKey')::uuid;
 if found then
   if old.request_hash<>p->>'requestHash' or old.access_hash<>p->>'accessHash' then raise exception 'CONFLICT: chave de compra já utilizada.'; end if;
   return old.data;
 end if;
 select data into settings from store_settings where id=1 for share;
 if coalesce(p->>'couponCode','')<>'' then
   select * into cp from coupons where code=p->>'couponCode' for update;
   if not found or cp.data is distinct from p_coupon or not (cp.data->>'active')::boolean or (nullif(cp.data->>'expiresAt','')::timestamptz<now()) then raise exception 'COUPON: cupom alterado ou expirado.'; end if;
   select count(*) into count_usage from coupon_usage where coupon_id=cp.id and not released;
   if (cp.data->>'usageLimit')::integer>0 and count_usage>=(cp.data->>'usageLimit')::integer then raise exception 'COUPON: limite do cupom atingido.'; end if;
   select count(*) into count_usage from coupon_usage where coupon_id=cp.id and customer_email=lower(p->'customer'->>'email') and not released;
   if (cp.data->>'perCustomerLimit')::integer>0 and count_usage>=(cp.data->>'perCustomerLimit')::integer then raise exception 'COUPON: limite por cliente atingido.'; end if;
 end if;
 -- Mesma ordem de bloqueio usada na edição: produtos antes de variações.
 perform 1 from products where id in (select (value->>'productId')::uuid from jsonb_array_elements(p->'items')) order by id for share;
 for item in select value from jsonb_array_elements(p->'items') order by value->>'variantId' loop
   select * into pv from product_variants where id=(item->>'variantId')::uuid for update;
   select * into prod from products where id=(item->>'productId')::uuid;
   if pv.id is null or prod.id is null or pv.product_id<>prod.id or prod.status<>'active' or not (pv.data->>'active')::boolean or pv.stock<(item->>'quantity')::integer then raise exception 'STOCK: estoque indisponível.'; end if;
   if (item->>'quantity')::integer<1 or (item->>'quantity')::integer>20 then raise exception 'STOCK: quantidade inválida.'; end if;
   if coalesce((pv.data->>'priceCents')::integer,(prod.data->>'priceCents')::integer)<>(item->>'unitCents')::integer or coalesce((prod.data->>'pixPercent')::numeric,(settings->>'pixPercent')::numeric)<>(item->>'pixPercent')::numeric then raise exception 'PRICE: preço alterado. Atualize a sacola.'; end if;
 end loop;
 insert into orders(id,number,idempotency_key,request_hash,access_hash,status,inventory_state,total_cents,data) values(pid,p->>'number',(p->>'idempotencyKey')::uuid,p->>'requestHash',p->>'accessHash','pending_payment','reserved',(p->>'totalCents')::integer,p);
 for item in select * from jsonb_array_elements(p->'items') loop
   update product_variants set stock=stock-(item->>'quantity')::integer where id=(item->>'variantId')::uuid;
   insert into order_items(order_id,product_id,variant_id,quantity,unit_cents,data) values(pid,(item->>'productId')::uuid,(item->>'variantId')::uuid,(item->>'quantity')::integer,(item->>'unitCents')::integer,item);
   insert into inventory_movements(variant_id,product_id,delta,reason,order_id,actor) values((item->>'variantId')::uuid,(item->>'productId')::uuid,-(item->>'quantity')::integer,'Reserva de pedido',pid,'checkout');
 end loop;
 if cp.id is not null then insert into coupon_usage(order_id,coupon_id,customer_email) values(pid,cp.id,lower(p->'customer'->>'email')); end if;
 return p;
end $$;

create or replace function public.apply_order_status(p_id uuid,p_status text,p_message text,p_patch jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders; item order_items; updated jsonb; inv text; allowed boolean;
begin
 select * into o from orders where id=p_id for update;
 if not found then raise exception 'NOT_FOUND: pedido não encontrado.'; end if;
 allowed:=o.status=p_status or (o.status='pending_payment' and p_status in ('paid','cancelled')) or (o.status='paid' and p_status in ('processing','refunded')) or (o.status='processing' and p_status in ('shipped','refunded')) or (o.status='shipped' and p_status in ('delivered','refunded')) or (o.status='delivered' and p_status='refunded');
 if not allowed then return o.data; end if;
 inv:=o.inventory_state;
 if p_status='cancelled' and inv='reserved' then
   for item in select * from order_items where order_id=p_id order by variant_id loop
     update product_variants set stock=stock+item.quantity where id=item.variant_id;
     insert into inventory_movements(variant_id,product_id,delta,reason,order_id,actor) values(item.variant_id,item.product_id,item.quantity,'Reserva liberada',p_id,'payment');
   end loop;
   inv:='released'; update coupon_usage set released=true where order_id=p_id;
 elsif p_status='paid' then inv:='committed'; end if;
 if p_status='refunded' then update coupon_usage set released=true where order_id=p_id; end if;
 updated:=o.data||p_patch||jsonb_build_object('status',p_status,'inventoryState',inv,'updatedAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
 if o.status<>p_status then updated:=jsonb_set(updated,'{history}',coalesce(o.data->'history','[]')||jsonb_build_array(jsonb_build_object('at',now(),'status',p_status,'message',p_message))); end if;
 update orders set status=p_status,inventory_state=inv,data=updated,updated_at=now() where id=p_id;
 if p_patch ? 'paymentStatus' and (o.data->>'paymentStatus') is distinct from p_patch->>'paymentStatus' then insert into payments(order_id,provider_id,status) values(p_id,updated->>'paymentId',updated->>'paymentStatus'); end if;
 return updated;
end $$;

create or replace function public.take_rate_limit(p_key text,p_limit integer,p_window integer) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into rate_limits(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_window)) on conflict(key) do update set count=case when rate_limits.expires_at<now() then 1 else rate_limits.count+1 end,expires_at=case when rate_limits.expires_at<now() then now()+make_interval(secs=>p_window) else rate_limits.expires_at end returning count into n;
 return n<=p_limit;
end $$;

create or replace function public.sales_counts() returns table(product_id uuid,quantity bigint) language sql stable security definer set search_path=public as $$ select oi.product_id,sum(oi.quantity) from order_items oi join orders o on o.id=oi.order_id where o.status in ('paid','processing','shipped','delivered') group by oi.product_id $$;

-- RLS em TODAS as tabelas. As APIs do servidor filtram também os campos internos.
do $$ declare tbl text; begin
 foreach tbl in array array['admin_users','products','product_variants','product_images','categories','collections','looks','social','banners','store_settings','coupons','orders','order_items','inventory_movements','coupon_usage','payments','webhook_events','shipping_quotes','newsletter','rate_limits'] loop
 execute format('alter table public.%I enable row level security',tbl);
 execute format('revoke all on public.%I from anon,authenticated',tbl);
 execute format('grant select on public.%I to authenticated',tbl);
 execute format('grant all on public.%I to service_role',tbl);
 if tbl<>'admin_users' then execute format('create policy admin_read on public.%I for select to authenticated using (public.is_admin())',tbl); end if;
 end loop;
end $$;
create policy own_admin_membership on public.admin_users for select to authenticated using(user_id=auth.uid());
-- Escritas comerciais passam por endpoints server-side. Nenhuma chave pública possui INSERT/UPDATE.
-- Restringe apenas os objetos desta loja, preservando outros projetos no mesmo schema.
do $$ declare fn text; begin
 foreach fn in array array['is_admin()','save_product(jsonb,text)','adjust_inventory(uuid,integer,text,text)','reserve_order(jsonb,jsonb)','apply_order_status(uuid,text,text,jsonb)','take_rate_limit(text,integer,integer)','sales_counts()'] loop
 execute format('revoke all on function public.%s from public,anon,authenticated',fn);
 execute format('grant execute on function public.%s to service_role',fn);
 end loop;
end $$;
grant execute on function public.is_admin() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,8388608,array['image/webp']) on conflict(id) do nothing;
create policy public_product_images on storage.objects for select using(bucket_id='product-images');
create policy admin_product_image_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.is_admin());
create policy admin_product_image_update on storage.objects for update to authenticated using(bucket_id='product-images' and public.is_admin()) with check(bucket_id='product-images' and public.is_admin());
create policy admin_product_image_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and public.is_admin());
