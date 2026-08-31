insert into settings (key, value, updated_at) values
  ('supplier_email', 'pkeeara@gmail.com', now()),
  ('supplier_password', '0268832336', now())
on conflict (key) do update set value = excluded.value, updated_at = now();
