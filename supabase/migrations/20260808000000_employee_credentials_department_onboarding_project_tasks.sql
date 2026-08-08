-- ORION employee credentials, department onboarding templates, and project work.
-- Additive only: existing employee-specific onboarding tasks and projects remain unchanged.

ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credentials_email_sent_at TIMESTAMPTZ;

ALTER TABLE public.onboarding_tasks
  ADD COLUMN IF NOT EXISTS department_task_template_id UUID,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.department_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  instructions TEXT NOT NULL DEFAULT '',
  step_phase TEXT NOT NULL DEFAULT 'Department onboarding',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_tasks
  ADD CONSTRAINT onboarding_tasks_department_template_fk
  FOREIGN KEY (department_task_template_id) REFERENCES public.department_onboarding_tasks(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_tasks_department_template_per_plan
  ON public.onboarding_tasks(onboarding_plan_id, department_task_template_id)
  WHERE department_task_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_department_onboarding_tasks_department_active
  ON public.department_onboarding_tasks(department_id) WHERE active;

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.company_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  description TEXT NOT NULL DEFAULT '',
  assigned_employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL DEFAULT 'project' CHECK (assignment_type IN ('project', 'employee')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived')),
  deadline TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_tasks_assignment_check CHECK (
    (assignment_type = 'project' AND assigned_employee_id IS NULL)
    OR (assignment_type = 'employee' AND assigned_employee_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.project_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_task_assignments_unique UNIQUE (project_task_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_task_assignments_employee_id ON public.project_task_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_task_assignments_task_id ON public.project_task_assignments(project_task_id);

CREATE OR REPLACE FUNCTION public.ensure_employee_department_onboarding_tasks(target_employee_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_company UUID; target_department UUID; target_plan UUID;
BEGIN
  SELECT company_id, department_id INTO target_company, target_department
  FROM public.employee_profiles WHERE id = target_employee_id;
  IF target_company IS NULL OR target_department IS NULL THEN RETURN; END IF;
  SELECT id INTO target_plan FROM public.onboarding_plans
  WHERE employee_id = target_employee_id AND status IN ('approved', 'completed')
  ORDER BY created_at DESC LIMIT 1;
  IF target_plan IS NULL THEN
    INSERT INTO public.onboarding_plans(employee_id, company_id, status)
    VALUES(target_employee_id, target_company, 'approved') RETURNING id INTO target_plan;
  END IF;
  INSERT INTO public.onboarding_tasks(onboarding_plan_id, step_no, title, instructions, step_phase, order_index, department_task_template_id)
  SELECT target_plan, row_number() OVER (ORDER BY created_at) + COALESCE((SELECT max(order_index) FROM public.onboarding_tasks WHERE onboarding_plan_id = target_plan), 0),
         title, instructions, step_phase,
         row_number() OVER (ORDER BY created_at) + COALESCE((SELECT max(order_index) FROM public.onboarding_tasks WHERE onboarding_plan_id = target_plan), 0), id
  FROM public.department_onboarding_tasks
  WHERE company_id = target_company AND department_id = target_department AND active
  ON CONFLICT (onboarding_plan_id, department_task_template_id) WHERE department_task_template_id IS NOT NULL DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_department_onboarding_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE employee_record RECORD;
BEGIN
  IF TG_OP = 'INSERT' OR (NEW.active AND NOT OLD.active) THEN
    FOR employee_record IN SELECT id FROM public.employee_profiles WHERE company_id = NEW.company_id AND department_id = NEW.department_id LOOP
      PERFORM public.ensure_employee_department_onboarding_tasks(employee_record.id);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_employee_department_onboarding_tasks()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.department_id IS DISTINCT FROM NEW.department_id THEN
    UPDATE public.onboarding_tasks t SET is_required = FALSE
    FROM public.onboarding_plans p JOIN public.department_onboarding_tasks d ON d.id = t.department_task_template_id
    WHERE t.onboarding_plan_id = p.id AND p.employee_id = NEW.id
      AND d.department_id IS DISTINCT FROM NEW.department_id AND t.status <> 'completed';
  END IF;
  PERFORM public.ensure_employee_department_onboarding_tasks(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS department_onboarding_task_sync ON public.department_onboarding_tasks;
CREATE TRIGGER department_onboarding_task_sync AFTER INSERT OR UPDATE OF active ON public.department_onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_department_onboarding_task();
DROP TRIGGER IF EXISTS employee_department_onboarding_task_sync ON public.employee_profiles;
CREATE TRIGGER employee_department_onboarding_task_sync AFTER INSERT OR UPDATE OF department_id ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_employee_department_onboarding_tasks();

CREATE OR REPLACE FUNCTION public.complete_onboarding_plan_when_required_tasks_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.onboarding_tasks WHERE onboarding_plan_id = NEW.onboarding_plan_id AND is_required AND status <> 'completed')
     AND EXISTS (SELECT 1 FROM public.onboarding_tasks WHERE onboarding_plan_id = NEW.onboarding_plan_id AND is_required) THEN
    UPDATE public.onboarding_plans SET status = 'completed' WHERE id = NEW.onboarding_plan_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS complete_onboarding_plan_after_task_change ON public.onboarding_tasks;
CREATE TRIGGER complete_onboarding_plan_after_task_change AFTER INSERT OR UPDATE OF status, is_required ON public.onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION public.complete_onboarding_plan_when_required_tasks_complete();

CREATE OR REPLACE FUNCTION public.create_project_task_assignments()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assignment_type = 'project' THEN
    INSERT INTO public.project_task_assignments(project_task_id, employee_id)
    SELECT NEW.id, employee_id FROM public.project_members WHERE project_id = NEW.project_id
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.project_task_assignments(project_task_id, employee_id) VALUES (NEW.id, NEW.assigned_employee_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_existing_project_tasks_to_new_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.project_task_assignments(project_task_id, employee_id)
  SELECT id, NEW.employee_id FROM public.project_tasks WHERE project_id = NEW.project_id AND assignment_type = 'project' AND status = 'open'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS project_task_assignment_sync ON public.project_tasks;
CREATE TRIGGER project_task_assignment_sync AFTER INSERT ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.create_project_task_assignments();
DROP TRIGGER IF EXISTS project_member_task_assignment_sync ON public.project_members;
CREATE TRIGGER project_member_task_assignment_sync AFTER INSERT ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.assign_existing_project_tasks_to_new_member();

DROP TRIGGER IF EXISTS set_department_onboarding_tasks_updated_at ON public.department_onboarding_tasks;
CREATE TRIGGER set_department_onboarding_tasks_updated_at BEFORE UPDATE ON public.department_onboarding_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_project_tasks_updated_at ON public.project_tasks;
CREATE TRIGGER set_project_tasks_updated_at BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_project_task_assignments_updated_at ON public.project_task_assignments;
CREATE TRIGGER set_project_task_assignments_updated_at BEFORE UPDATE ON public.project_task_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.department_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies manage own department onboarding tasks" ON public.department_onboarding_tasks FOR ALL TO authenticated
USING (public.is_project_company_admin(company_id)) WITH CHECK (public.is_project_company_admin(company_id) AND created_by = auth.uid());
CREATE POLICY "Employees view applicable department onboarding templates" ON public.department_onboarding_tasks FOR SELECT TO authenticated
USING (department_id IN (SELECT department_id FROM public.employee_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Companies manage own project tasks" ON public.project_tasks FOR ALL TO authenticated
USING (public.is_project_company_admin_for_project(project_id))
WITH CHECK (public.is_project_company_admin_for_project(project_id)
  AND (assigned_employee_id IS NULL OR public.project_member_matches_project_company(project_id, assigned_employee_id)));
CREATE POLICY "Employees view assigned project tasks" ON public.project_tasks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.project_task_assignments a WHERE a.project_task_id = id AND a.employee_id = public.current_employee_profile_id()));

CREATE POLICY "Companies manage own project task assignments" ON public.project_task_assignments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.project_tasks t WHERE t.id = project_task_id AND public.is_project_company_admin_for_project(t.project_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.project_tasks t WHERE t.id = project_task_id AND public.is_project_company_admin_for_project(t.project_id)));
CREATE POLICY "Employees view own project task assignments" ON public.project_task_assignments FOR SELECT TO authenticated
USING (employee_id = public.current_employee_profile_id());
CREATE POLICY "Employees update own project task status" ON public.project_task_assignments FOR UPDATE TO authenticated
USING (employee_id = public.current_employee_profile_id())
WITH CHECK (employee_id = public.current_employee_profile_id());

GRANT EXECUTE ON FUNCTION public.ensure_employee_department_onboarding_tasks(UUID) TO service_role;
