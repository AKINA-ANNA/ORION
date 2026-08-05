-- Company projects and employee assignments.
CREATE TABLE IF NOT EXISTS public.company_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL CHECK (btrim(project_name) <> ''),
    problem_statement TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    deadline DATE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.company_projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT project_members_project_employee_key UNIQUE (project_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_company_projects_company_id ON public.company_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee_id ON public.project_members(employee_id);

CREATE OR REPLACE FUNCTION public.set_company_projects_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_company_projects_updated_at ON public.company_projects;
CREATE TRIGGER set_company_projects_updated_at BEFORE UPDATE ON public.company_projects
FOR EACH ROW EXECUTE FUNCTION public.set_company_projects_updated_at();

ALTER TABLE public.company_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_employee_profile_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id FROM public.employee_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_project_company_admin(project_company_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_profiles
        WHERE id = project_company_id AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_project_company_admin_for_project(target_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_projects cp
        JOIN public.company_profiles company ON company.id = cp.company_id
        WHERE cp.id = target_project_id AND company.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_to_project(target_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = target_project_id
          AND employee_id = public.current_employee_profile_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.project_member_matches_project_company(target_project_id UUID, target_employee_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.company_projects cp
        JOIN public.employee_profiles ep ON ep.company_id = cp.company_id
        WHERE cp.id = target_project_id AND ep.id = target_employee_id
    );
$$;

CREATE OR REPLACE FUNCTION public.employees_share_project(target_employee_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.project_members mine
        JOIN public.project_members teammate ON teammate.project_id = mine.project_id
        JOIN public.employee_profiles me ON me.id = mine.employee_id
        JOIN public.employee_profiles target ON target.id = teammate.employee_id
        WHERE mine.employee_id = public.current_employee_profile_id()
          AND teammate.employee_id = target_employee_id
          AND me.company_id = target.company_id
    );
$$;

CREATE OR REPLACE FUNCTION public.department_has_project_teammate(target_department_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.employee_profiles
        WHERE department_id = target_department_id
          AND public.employees_share_project(id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_company_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_company_admin_for_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_to_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_member_matches_project_company(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.employees_share_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.department_has_project_teammate(UUID) TO authenticated;

DROP POLICY IF EXISTS "Companies can manage own projects" ON public.company_projects;
DROP POLICY IF EXISTS "Companies delete own projects" ON public.company_projects;
DROP POLICY IF EXISTS "Companies insert own projects" ON public.company_projects;
DROP POLICY IF EXISTS "Companies update own projects" ON public.company_projects;
DROP POLICY IF EXISTS "Employees view assigned projects" ON public.company_projects;
DROP POLICY IF EXISTS "Companies can view or delete own projects" ON public.company_projects;
DROP POLICY IF EXISTS "Companies can create own projects" ON public.company_projects;
DROP POLICY IF EXISTS "Companies can update own projects" ON public.company_projects;
DROP POLICY IF EXISTS "Companies can delete own projects" ON public.company_projects;
DROP POLICY IF EXISTS "Employees can view assigned projects" ON public.company_projects;
CREATE POLICY "Companies can view or delete own projects" ON public.company_projects FOR SELECT TO authenticated
USING (public.is_project_company_admin(company_id));
CREATE POLICY "Companies can create own projects" ON public.company_projects FOR INSERT TO authenticated
WITH CHECK (public.is_project_company_admin(company_id) AND created_by = auth.uid());
CREATE POLICY "Companies can update own projects" ON public.company_projects FOR UPDATE TO authenticated
USING (public.is_project_company_admin(company_id))
WITH CHECK (public.is_project_company_admin(company_id));
CREATE POLICY "Companies can delete own projects" ON public.company_projects FOR DELETE TO authenticated
USING (public.is_project_company_admin(company_id));

DROP POLICY IF EXISTS "Employees can view assigned projects" ON public.company_projects;
CREATE POLICY "Employees can view assigned projects" ON public.company_projects FOR SELECT TO authenticated
USING (public.is_assigned_to_project(id));

DROP POLICY IF EXISTS "Companies can manage own project members" ON public.project_members;
DROP POLICY IF EXISTS "Companies manage project members" ON public.project_members;
DROP POLICY IF EXISTS "Employees view own project memberships" ON public.project_members;
CREATE POLICY "Companies can manage own project members" ON public.project_members FOR ALL TO authenticated
USING (public.is_project_company_admin_for_project(project_id))
WITH CHECK (
    public.is_project_company_admin_for_project(project_id)
    AND public.project_member_matches_project_company(project_id, employee_id)
);

DROP POLICY IF EXISTS "Employees can view assigned project members" ON public.project_members;
CREATE POLICY "Employees can view assigned project members" ON public.project_members FOR SELECT TO authenticated
USING (public.is_assigned_to_project(project_id));

DROP POLICY IF EXISTS "Employees can view project teammates" ON public.employee_profiles;
CREATE POLICY "Employees can view project teammates" ON public.employee_profiles FOR SELECT TO authenticated
USING (public.employees_share_project(id));

DROP POLICY IF EXISTS "Employees can view project teammate departments" ON public.departments;
CREATE POLICY "Employees can view project teammate departments" ON public.departments FOR SELECT TO authenticated
USING (public.department_has_project_teammate(id));
