-- Wrap the fictional workflow with this before/after fingerprint check.
CREATE TEMP TABLE bms_protected_fingerprints(table_name text PRIMARY KEY, fingerprint text);
GRANT SELECT ON bms_protected_fingerprints TO service_role;
DO $$ DECLARE r record; h text; BEGIN
 FOR r IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='tenant_id' AND (table_name LIKE 'business_software_%' OR table_name LIKE 'bms_%') LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(md5(to_jsonb(x)::text),'''' ORDER BY to_jsonb(x)::text),'''')) FROM public.%I x WHERE tenant_id NOT IN(SELECT id FROM business_software_tenants WHERE slug=''flooring-showcase-demo'')',r.table_name) INTO h;
  INSERT INTO bms_protected_fingerprints VALUES(r.table_name,h);
 END LOOP;
END $$;
