-- Admins can read the optional details parents add on the website's Account page (Admin > Subscribers).
create policy "admin reads details" on parent_details for select using (private.is_admin((select auth.uid())));
