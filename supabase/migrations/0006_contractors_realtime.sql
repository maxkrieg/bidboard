-- 0006_contractors_realtime.sql
-- Enable Supabase Realtime on the contractors table so ContractorCard
-- receives UPDATE events when enrichment completes.

alter publication supabase_realtime add table public.contractors;
