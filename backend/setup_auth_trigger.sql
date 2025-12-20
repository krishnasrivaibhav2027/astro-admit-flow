-- Trigger function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
begin
  -- Get the role from metadata (default to 'student' if missing)
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'student');

  if user_role = 'admin' then
    insert into public.admins (email, first_name, last_name, role)
    values (new.email, 'Admin', 'User', 'admin')
    on conflict (email) do nothing;
  else
    -- Insert into students table with SAFE DEFAULTS for all required columns
    insert into public.students (id, email, first_name, last_name, role, phone, age, dob)
    values (
      new.id, 
      new.email, 
      '', -- first_name
      '', -- last_name
      'student', -- role
      '', -- phone (empty string is safer than null if not null constraint exists)
      0,  -- age (dummy integer)
      '2000-01-01' -- dob (dummy date)
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
