-- Owners have the same built-in workflow access as administrators.
-- Existing explicit permission checks for other roles remain unchanged.
CREATE OR REPLACE FUNCTION public.bms_save_estimating_settings(p_tenant uuid, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); cfg jsonb; method text; markup numeric; margin numeric; vat numeric;
begin
 if not exists(select 1 from business_software_users u where u.tenant_id=p_tenant and u.auth_user_id=uid and u.status='active' and u.role in ('owner','admin')) then raise exception 'Not authorised'; end if;
 method:=coalesce(nullif(p_data->>'defaultPricingMethod',''),'margin');
 if method not in ('markup','margin') then raise exception 'Invalid pricing method'; end if;
 markup:=coalesce(nullif(p_data->>'defaultMarkupPercent','')::numeric,30);
 margin:=coalesce(nullif(p_data->>'defaultMarginPercent','')::numeric,30);
 vat:=coalesce(nullif(p_data->>'defaultCostVatRate','')::numeric,20);
 if margin<0 or margin>=100 or markup<0 or vat<0 then raise exception 'Invalid pricing value'; end if;
 select coalesce(app_config,'{}'::jsonb) into cfg from business_software_tenant_settings where tenant_id=p_tenant;
 cfg:=jsonb_set(cfg,'{estimating}',coalesce(cfg->'estimating','{}'::jsonb)||jsonb_build_object('defaultPricingMethod',method,'defaultMarkupPercent',markup,'defaultMarginPercent',margin,'costBasis','net','defaultCostVatRate',vat),true);
 update business_software_tenant_settings set app_config=cfg,updated_at=now() where tenant_id=p_tenant;
 return cfg->'estimating';
end $function$
;

CREATE OR REPLACE FUNCTION public.bms_team_update(p_tenant uuid, p_id uuid, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); p business_software_people; rate business_software_labour_rates; cfg jsonb; method text; def_markup numeric:=30; def_margin numeric:=30;
begin
 if not exists(select 1 from business_software_users u where u.tenant_id=p_tenant and u.auth_user_id=uid and u.status='active' and (u.role in ('owner','admin') or u.permissions ? 'manage_workforce')) then raise exception 'Not authorised'; end if;
 update business_software_people set name=coalesce(nullif(trim(p_data->>'name'),''),name),company=case when p_data?'company' then nullif(trim(p_data->>'company'),'') else company end,phone=case when p_data?'phone' then nullif(trim(p_data->>'phone'),'') else phone end,email=case when p_data?'email' then nullif(trim(p_data->>'email'),'') else email end,capabilities=case when p_data?'capabilities' then array(select jsonb_array_elements_text(p_data->'capabilities')) else capabilities end,relationship_type=coalesce(nullif(p_data->>'relationship_type',''),relationship_type),notes=case when p_data?'notes' then nullif(trim(p_data->>'notes'),'') else notes end,updated_at=now() where tenant_id=p_tenant and id=p_id returning * into p;
 if p.id is null then raise exception 'Workforce member not found'; end if;
 if p_data?'cost_rate' or p_data?'pricing_method' or p_data?'markup_percent' or p_data?'margin_percent' then
  select coalesce(app_config,'{}'::jsonb) into cfg from business_software_tenant_settings where tenant_id=p_tenant;method:=coalesce(nullif(p_data->>'pricing_method',''),cfg#>>'{estimating,defaultPricingMethod}','margin');def_markup:=coalesce((cfg#>>'{estimating,defaultMarkupPercent}')::numeric,30);def_margin:=coalesce((cfg#>>'{estimating,defaultMarginPercent}')::numeric,30);
  select * into rate from business_software_labour_rates where tenant_id=p_tenant and person_id=p_id and active order by created_at desc limit 1;
  if rate.id is null then insert into business_software_labour_rates(tenant_id,name,person_id,unit,cost_rate,cost_vat_rate,pricing_method,markup_percent,margin_percent,active) values(p_tenant,p.name,p.id,coalesce(nullif(p_data->>'rate_unit',''),'day'),coalesce(nullif(p_data->>'cost_rate','')::numeric,0),coalesce(nullif(p_data->>'cost_vat_rate','')::numeric,0),method,case when method='markup' then coalesce(nullif(p_data->>'markup_percent','')::numeric,def_markup) end,case when method='margin' then coalesce(nullif(p_data->>'margin_percent','')::numeric,def_margin) end,true) returning * into rate;
  else update business_software_labour_rates set name=p.name,unit=coalesce(nullif(p_data->>'rate_unit',''),unit),cost_rate=case when p_data?'cost_rate' then coalesce(nullif(p_data->>'cost_rate','')::numeric,0) else cost_rate end,cost_vat_rate=coalesce(nullif(p_data->>'cost_vat_rate','')::numeric,cost_vat_rate),pricing_method=method,markup_percent=case when method='markup' then coalesce(nullif(p_data->>'markup_percent','')::numeric,markup_percent,def_markup) else null end,margin_percent=case when method='margin' then coalesce(nullif(p_data->>'margin_percent','')::numeric,margin_percent,def_margin) else null end,updated_at=now() where id=rate.id returning * into rate;
  end if;
 end if;
 return jsonb_build_object('person',to_jsonb(p),'labour_rate',case when rate.id is null then null else to_jsonb(rate) end);
end $function$
;
