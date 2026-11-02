-- Non-mutating customer-return guard acceptance; all changes rollback.
begin;
do $$ declare t uuid:=gen_random_uuid(); l uuid:=gen_random_uuid(); loc uuid:=gen_random_uuid(); begin
 if not has_function_privilege('service_role','public.bms_record_customer_return(uuid,uuid,uuid,numeric,boolean,text,text)','EXECUTE') then raise exception 'Service role missing return permission';end if;
 if has_function_privilege('anon','public.bms_record_customer_return(uuid,uuid,uuid,numeric,boolean,text,text)','EXECUTE') then raise exception 'Anonymous return execution exposed';end if;
 begin perform public.bms_record_customer_return(t,l,loc,0,true,'test guard','return-guard-0001');raise exception 'Zero return incorrectly accepted';exception when others then if sqlerrm='Zero return incorrectly accepted' then raise;end if;end;
 begin perform public.bms_record_customer_return(t,l,loc,1,true,'test guard','return-guard-0002');raise exception 'Cross-tenant unknown order accepted';exception when others then if sqlerrm='Cross-tenant unknown order accepted' then raise;end if;end;
end $$;
rollback;
