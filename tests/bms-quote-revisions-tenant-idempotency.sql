BEGIN;SET LOCAL ROLE service_role;
DO $$ DECLARE t uuid;j uuid;other_job uuid; a jsonb;b jsonb;c jsonb;failed boolean:=false;BEGIN
 SELECT id INTO t FROM business_software_tenants WHERE slug='flooring-showcase-demo';
 SELECT id INTO j FROM business_software_jobs WHERE tenant_id=t LIMIT 1;
 SELECT id INTO other_job FROM business_software_jobs WHERE tenant_id<>t LIMIT 1;
 a:=bms_create_quote_revision_once(t,j,'Fictional oak laminate supply',888,20,'7-10 working days','test-quote-revision-001');
 b:=bms_create_quote_revision_once(t,j,'Fictional oak laminate supply',888,20,'7-10 working days','test-quote-revision-001');
 IF a->>'id' IS DISTINCT FROM b->>'id' OR b->>'created'<>'false' THEN RAISE EXCEPTION 'Quote idempotency failed'; END IF;
 c:=bms_create_quote_revision_once(t,j,'Revised oak laminate supply',900,20,'7-10 working days','test-quote-revision-002');
 IF (c->>'version')::int<>(a->>'version')::int+1 THEN RAISE EXCEPTION 'Quote revision numbering failed'; END IF;
 BEGIN PERFORM bms_create_quote_revision_once(t,j,'Changed terms',1000,20,'7-10 working days','test-quote-revision-001');EXCEPTION WHEN others THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Idempotency payload mismatch accepted'; END IF;
 failed:=false;
 BEGIN PERFORM bms_create_quote_revision_once(t,j,'Fictional oak laminate supply',888,20,'12 working days','test-quote-revision-001');EXCEPTION WHEN others THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Conflicting lead-time terms accepted'; END IF;
 IF other_job IS NOT NULL THEN
  failed:=false;
  BEGIN PERFORM bms_create_quote_revision_once(t,other_job,'Cross-tenant quotation',888,20,'7 days','test-quote-cross-tenant');EXCEPTION WHEN others THEN failed:=true;END;
  IF NOT failed THEN RAISE EXCEPTION 'Cross-tenant quote accepted'; END IF;
 END IF;
END $$;ROLLBACK;