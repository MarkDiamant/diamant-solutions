BEGIN;SET LOCAL ROLE service_role;
DO $$ DECLARE t uuid;j uuid;other_job uuid;q jsonb;a jsonb;b jsonb;failed boolean:=false;BEGIN
 SELECT id INTO t FROM business_software_tenants WHERE slug='flooring-showcase-demo';
 SELECT id INTO j FROM business_software_jobs WHERE tenant_id=t LIMIT 1;
 SELECT id INTO other_job FROM business_software_jobs WHERE tenant_id<>t LIMIT 1;
 q:=bms_create_quote_revision_once(t,j,'48 m2 fictional fitting invoice',888,20,'7 working days','test-invoice-quote-001');
 a:=bms_create_internal_draft_invoice_once(t,j,(q->>'id')::uuid,'test-invoice-key-001','FLI');
 b:=bms_create_internal_draft_invoice_once(t,j,(q->>'id')::uuid,'test-invoice-key-001','FLI');
 IF a->>'id' IS DISTINCT FROM b->>'id' OR (a->>'total')::numeric<>1065.60 OR b->>'created'<>'false' THEN RAISE EXCEPTION 'Invoice total or retry failed'; END IF;
 IF other_job IS NOT NULL THEN
  BEGIN PERFORM bms_create_internal_draft_invoice_once(t,other_job,(q->>'id')::uuid,'test-invoice-cross-tenant','FLI');EXCEPTION WHEN others THEN failed:=true;END;
  IF NOT failed THEN RAISE EXCEPTION 'Cross-tenant invoice created'; END IF;
 END IF;
END $$;
ROLLBACK;