-- The admin API uses the service role after verifying the caller against ADMIN_USER_IDS.
-- Do not grant direct insert access to anon or authenticated users.
grant insert on table public.marketplace_competitions to service_role;
