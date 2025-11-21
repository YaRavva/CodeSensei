/*
  # Auto-create user profile trigger
  
  Creates a database trigger that automatically creates a user profile
  in the public.users table whenever a new user is created in auth.users.
  
  This eliminates race conditions and ensures every authenticated user
  has a corresponding profile without manual intervention.
  
  Benefits:
  - No more race conditions between auth creation and profile creation
  - Works for all auth methods (email/password, OAuth, etc.)
  - Centralized logic in one place
  - Automatic handling of user metadata
*/

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_display_name TEXT;
BEGIN
  -- Extract role from metadata (prioritize app_metadata over user_metadata)
  user_role := COALESCE(
    NEW.raw_app_meta_data->>'user_role',
    NEW.raw_app_meta_data->>'role',
    NEW.raw_user_meta_data->>'role',
    'student'
  );
  
  -- Extract display name from metadata (OAuth providers store it here)
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NULL
  );
  
  -- Insert the user profile
  INSERT INTO public.users (
    id,
    email,
    role,
    display_name,
    avatar_url,
    created_at,
    last_active_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_role,
    user_display_name,
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;