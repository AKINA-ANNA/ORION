ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS working_preferences JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  ALTER TABLE public.employee_profiles
    ADD CONSTRAINT employee_profiles_working_preferences_array
    CHECK (jsonb_typeof(working_preferences) = 'array');
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
