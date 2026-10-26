-- Prevent cross-tenant customer-specific pricing references, including service-role writes.
CREATE OR REPLACE FUNCTION public.bms_validate_customer_price_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.business_software_customers WHERE id=NEW.customer_id AND tenant_id=NEW.tenant_id)
 OR NOT EXISTS(SELECT 1 FROM public.business_software_price_book_items WHERE id=NEW.product_id AND tenant_id=NEW.tenant_id)
 THEN RAISE EXCEPTION 'Customer price references must belong to the same tenant';END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bms_customer_price_tenant_guard ON public.business_software_customer_prices;
CREATE TRIGGER bms_customer_price_tenant_guard BEFORE INSERT OR UPDATE OF tenant_id,customer_id,product_id ON public.business_software_customer_prices
FOR EACH ROW EXECUTE FUNCTION public.bms_validate_customer_price_tenant();
