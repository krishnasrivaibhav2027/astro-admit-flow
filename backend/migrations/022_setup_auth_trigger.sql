-- Trigger function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
  full_name text;
  first_name text;
  last_name text;
  space_pos int;
begin
  -- Get the role from metadata (default to 'student' if missing)
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'student');

  -- Extract Name from Metadata
  full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  
  -- Split Name into First and Last
  if full_name = '' then
    first_name := '';
    last_name := '';
  else
    space_pos := position(' ' in full_name);
    if space_pos > 0 then
      first_name := substring(full_name from 1 for space_pos - 1);
      last_name := substring(full_name from space_pos + 1);
    else
      first_name := full_name;
      last_name := '';
    end if;
  end if;

  if user_role = 'admin' then
    insert into public.admins (email, first_name, last_name, role)
    values (new.email, 'Admin', 'User', 'admin')
    on conflict (email) do nothing;
  else
    -- Insert into students table with extracted names and SAFE DEFAULTS
    insert into public.students (id, email, first_name, last_name, role, phone, age, dob)
    values (
      new.id, 
      new.email, 
      first_name, 
      last_name, 
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
