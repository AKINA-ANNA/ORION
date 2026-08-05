-- ORION baseline schema. This is the first and only migration for a new project.
-- It is also safe to apply to the manually provisioned development database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL DEFAULT '',
    industry TEXT NOT NULL DEFAULT '',
    company_size TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    admin_name TEXT NOT NULL DEFAULT '',
    company_description TEXT,
    products_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    departments JSONB NOT NULL DEFAULT '[]'::jsonb,
    technologies JSONB NOT NULL DEFAULT '[]'::jsonb,
    onboarding_focus TEXT,
    ai_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    profile_generated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT company_profiles_products_services_array CHECK (jsonb_typeof(products_services) = 'array'),
    CONSTRAINT company_profiles_departments_array CHECK (jsonb_typeof(departments) = 'array'),
    CONSTRAINT company_profiles_technologies_array CHECK (jsonb_typeof(technologies) = 'array')
);

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT departments_company_name_key UNIQUE (company_id, name),
    CONSTRAINT departments_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE IF NOT EXISTS public.employee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT,
    role TEXT,
    experience_level TEXT,
    technical_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    onboarding_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
    additional_info TEXT,
    questionnaire_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT employee_profiles_technical_skills_array CHECK (jsonb_typeof(technical_skills) = 'array'),
    CONSTRAINT employee_profiles_onboarding_goals_array CHECK (jsonb_typeof(onboarding_goals) = 'array')
);

CREATE TABLE IF NOT EXISTS public.onboarding_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'approved', 'completed')),
    role TEXT,
    experience_level TEXT,
    company_context TEXT,
    company_expectations JSONB NOT NULL DEFAULT '[]'::jsonb,
    onboarding_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
    additional_instructions TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT onboarding_plans_expectations_array CHECK (jsonb_typeof(company_expectations) = 'array'),
    CONSTRAINT onboarding_plans_goals_array CHECK (jsonb_typeof(onboarding_goals) = 'array')
);

CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_plan_id UUID NOT NULL REFERENCES public.onboarding_plans(id) ON DELETE CASCADE,
    step_no INTEGER NOT NULL DEFAULT 1 CHECK (step_no > 0),
    title TEXT NOT NULL,
    instructions TEXT,
    step_phase TEXT NOT NULL DEFAULT 'General',
    order_index INTEGER NOT NULL DEFAULT 1 CHECK (order_index > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT onboarding_tasks_plan_order_key UNIQUE (onboarding_plan_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.company_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    extracted_text TEXT NOT NULL DEFAULT '',
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT company_knowledge_path_matches_company CHECK (split_part(file_path, '/', 1) = company_id::text)
);

-- CREATE TABLE IF NOT EXISTS intentionally leaves a manually-created table
-- unchanged. These statements make the baseline safe for the pre-migration
-- development database as well as for a completely new project.
ALTER TABLE public.company_knowledge ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE public.company_knowledge ADD COLUMN IF NOT EXISTS processing_status TEXT;
ALTER TABLE public.company_knowledge ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
UPDATE public.company_knowledge SET extracted_text = '' WHERE extracted_text IS NULL;
UPDATE public.company_knowledge SET processing_status = 'pending' WHERE processing_status IS NULL;
ALTER TABLE public.company_knowledge ALTER COLUMN extracted_text SET DEFAULT '';
ALTER TABLE public.company_knowledge ALTER COLUMN extracted_text SET NOT NULL;
ALTER TABLE public.company_knowledge ALTER COLUMN processing_status SET DEFAULT 'pending';
ALTER TABLE public.company_knowledge ALTER COLUMN processing_status SET NOT NULL;

DO $$
BEGIN
    ALTER TABLE public.company_knowledge
        ADD CONSTRAINT company_knowledge_processing_status_check
        CHECK (processing_status IN ('pending', 'processed', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_departments_company_id ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_company_id ON public.employee_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_department_id ON public.employee_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_plans_employee_id ON public.onboarding_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_plans_company_id ON public.onboarding_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_plans_status ON public.onboarding_plans(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_plan_id ON public.onboarding_tasks(onboarding_plan_id);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_company_id ON public.company_knowledge(company_id);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_created_at ON public.company_knowledge(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_search ON public.company_knowledge USING GIN (to_tsvector('simple', coalesce(file_name, '') || ' ' || extracted_text));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_company_profiles_updated_at ON public.company_profiles;
CREATE TRIGGER set_company_profiles_updated_at BEFORE UPDATE ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_departments_updated_at ON public.departments;
CREATE TRIGGER set_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_employee_profiles_updated_at ON public.employee_profiles;
CREATE TRIGGER set_employee_profiles_updated_at BEFORE UPDATE ON public.employee_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_onboarding_plans_updated_at ON public.onboarding_plans;
CREATE TRIGGER set_onboarding_plans_updated_at BEFORE UPDATE ON public.onboarding_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_onboarding_tasks_updated_at ON public.onboarding_tasks;
CREATE TRIGGER set_onboarding_tasks_updated_at BEFORE UPDATE ON public.onboarding_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_company_knowledge_updated_at ON public.company_knowledge;
CREATE TRIGGER set_company_knowledge_updated_at BEFORE UPDATE ON public.company_knowledge FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_knowledge ENABLE ROW LEVEL SECURITY;

-- These are ORION-owned tables. Remove manually-created policy variants before
-- installing the canonical set below, so policies cannot accumulate on reruns.
DO $$
DECLARE policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('company_profiles', 'departments', 'employee_profiles', 'onboarding_plans', 'onboarding_tasks', 'company_knowledge')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, policy_record.tablename);
    END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Companies can manage own profile" ON public.company_profiles;
CREATE POLICY "Companies can manage own profile" ON public.company_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Companies can manage own departments" ON public.departments;
CREATE POLICY "Companies can manage own departments" ON public.departments FOR ALL TO authenticated USING (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Companies can view own employees" ON public.employee_profiles;
CREATE POLICY "Companies can view own employees" ON public.employee_profiles FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Employees can view own profile" ON public.employee_profiles;
CREATE POLICY "Employees can view own profile" ON public.employee_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Employees can update own profile" ON public.employee_profiles;
CREATE POLICY "Employees can update own profile" ON public.employee_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Companies can manage onboarding plans" ON public.onboarding_plans;
CREATE POLICY "Companies can manage onboarding plans" ON public.onboarding_plans FOR ALL TO authenticated USING (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Employees can view own approved onboarding plan" ON public.onboarding_plans;
CREATE POLICY "Employees can view own approved onboarding plan" ON public.onboarding_plans FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()) AND status IN ('approved', 'completed'));

DROP POLICY IF EXISTS "Companies can manage onboarding tasks" ON public.onboarding_tasks;
CREATE POLICY "Companies can manage onboarding tasks" ON public.onboarding_tasks FOR ALL TO authenticated USING (onboarding_plan_id IN (SELECT op.id FROM public.onboarding_plans op JOIN public.company_profiles cp ON cp.id = op.company_id WHERE cp.user_id = auth.uid())) WITH CHECK (onboarding_plan_id IN (SELECT op.id FROM public.onboarding_plans op JOIN public.company_profiles cp ON cp.id = op.company_id WHERE cp.user_id = auth.uid()));
DROP POLICY IF EXISTS "Employees can view own approved tasks" ON public.onboarding_tasks;
CREATE POLICY "Employees can view own approved tasks" ON public.onboarding_tasks FOR SELECT TO authenticated USING (onboarding_plan_id IN (SELECT op.id FROM public.onboarding_plans op JOIN public.employee_profiles ep ON ep.id = op.employee_id WHERE ep.user_id = auth.uid() AND op.status IN ('approved', 'completed')));
DROP POLICY IF EXISTS "Employees can update own task status" ON public.onboarding_tasks;
CREATE POLICY "Employees can update own task status" ON public.onboarding_tasks FOR UPDATE TO authenticated USING (onboarding_plan_id IN (SELECT op.id FROM public.onboarding_plans op JOIN public.employee_profiles ep ON ep.id = op.employee_id WHERE ep.user_id = auth.uid() AND op.status IN ('approved', 'completed'))) WITH CHECK (onboarding_plan_id IN (SELECT op.id FROM public.onboarding_plans op JOIN public.employee_profiles ep ON ep.id = op.employee_id WHERE ep.user_id = auth.uid() AND op.status IN ('approved', 'completed')));

DROP POLICY IF EXISTS "Companies can view own knowledge" ON public.company_knowledge;
CREATE POLICY "Companies can view own knowledge" ON public.company_knowledge FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Companies can insert own knowledge" ON public.company_knowledge;
CREATE POLICY "Companies can insert own knowledge" ON public.company_knowledge FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Companies can update own knowledge" ON public.company_knowledge;
CREATE POLICY "Companies can update own knowledge" ON public.company_knowledge FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Companies can delete own knowledge" ON public.company_knowledge;
CREATE POLICY "Companies can delete own knowledge" ON public.company_knowledge FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.company_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Employees can view own company knowledge" ON public.company_knowledge;
CREATE POLICY "Employees can view own company knowledge" ON public.company_knowledge FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.employee_profiles WHERE user_id = auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-knowledge', 'company-knowledge', false, 10485760, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'text/csv', 'application/json'])
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Companies can read own knowledge files" ON storage.objects;
CREATE POLICY "Companies can read own knowledge files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-knowledge' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.company_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Employees can read own company knowledge files" ON storage.objects;
CREATE POLICY "Employees can read own company knowledge files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-knowledge' AND (storage.foldername(name))[1] IN (SELECT company_id::text FROM public.employee_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Companies can upload own knowledge files" ON storage.objects;
CREATE POLICY "Companies can upload own knowledge files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-knowledge' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.company_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Companies can update own knowledge files" ON storage.objects;
CREATE POLICY "Companies can update own knowledge files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-knowledge' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.company_profiles WHERE user_id = auth.uid())) WITH CHECK (bucket_id = 'company-knowledge' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.company_profiles WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Companies can delete own knowledge files" ON storage.objects;
CREATE POLICY "Companies can delete own knowledge files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-knowledge' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.company_profiles WHERE user_id = auth.uid()));
