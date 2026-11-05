-- Strictly fail closed: permanent deletion only for archived products with zero known references.
-- Deletion and reference verification occur in one transaction while the product row is locked.
create or replace function public.bms_archived_product_delete_guard(p_tenant uuid,p_product uuid,p_delete boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p record; c record; n bigint; blockers text[]:=array[]::text[]; q text;
begin
 select id,active into p from public.business_software_price_book_items where tenant_id=p_tenant and id=p_product for update;
 if not found then return jsonb_build_object('ok',false,'error','Product not found'); end if;
 if p.active is distinct from false then return jsonb_build_object('ok',false,'error','Archive the product first'); end if;
 for c in select table_schema,table_name,column_name from information_schema.columns where table_schema='public' and table_name<>'business_software_price_book_items' and column_name in ('product_id','price_book_item_id') order by table_name loop
  execute format('select count(*) from %I.%I where %I=$1',c.table_schema,c.table_name,c.column_name) into n using p_product;
  if n>0 then blockers:=array_append(blockers,c.table_name||' ('||n||')');end if;
 end loop;
 for c in select distinct con.conrelid::regclass::text as tbl,att.attname as col from pg_constraint con join pg_attribute att on att.attrelid=con.conrelid and att.attnum=any(con.conkey) where con.contype='f' and con.confrelid='public.business_software_price_book_items'::regclass loop
  execute format('select count(*) from %s where %I=$1',c.tbl,c.col) into n using p_product;
  if n>0 and not (c.tbl||' ('||n||')')=any(blockers) then blockers:=array_append(blockers,c.tbl||' ('||n||')');end if;
 end loop;
 for c in select table_schema,table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and (table_name ilike '%audit%' or table_name ilike '%event%log%' or table_name ilike '%history%') loop
  execute format('select count(*) from %I.%I t where row_to_json(t)::text like $1',c.table_schema,c.table_name) into n using '%'||p_product::text||'%';
  if n>0 then blockers:=array_append(blockers,c.table_name||' audit/history ('||n||')');end if;
 end loop;
 if array_length(blockers,1)>0 then return jsonb_build_object('ok',false,'blocked',true,'references',blockers,'error','Product has historical references and cannot be permanently deleted');end if;
 if p_delete then
  delete from public.business_software_price_book_items where id=p_product and tenant_id=p_tenant and active=false;
  return jsonb_build_object('ok',true,'deleted',true);
 end if;
 return jsonb_build_object('ok',true,'deletable',true);
end $$;
revoke all on function public.bms_archived_product_delete_guard(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.bms_archived_product_delete_guard(uuid,uuid,boolean) to service_role;
create or replace function public.bms_archived_product_delete_statuses(p_tenant uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb:='{}'::jsonb; r record;
begin
 for r in select id from public.business_software_price_book_items where tenant_id=p_tenant and active=false order by updated_at desc limit 1000 loop
  result:=result||jsonb_build_object(r.id::text,public.bms_archived_product_delete_guard(p_tenant,r.id,false));
 end loop;
 return result;
end $$;
revoke all on function public.bms_archived_product_delete_statuses(uuid) from public,anon,authenticated;
grant execute on function public.bms_archived_product_delete_statuses(uuid) to service_role;
