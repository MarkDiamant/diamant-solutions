-- Restore server-side Ruby document upload/review permissions without exposing attachments to clients.
GRANT SELECT,INSERT,UPDATE ON TABLE public.business_software_ai_attachments,public.business_software_ai_usage TO service_role;
