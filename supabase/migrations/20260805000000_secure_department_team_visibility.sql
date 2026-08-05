-- Apply the same-company constraint for projects where the original team
-- visibility migration has already been run.
CREATE OR REPLACE FUNCTION public.current_employee_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id
    FROM public.employee_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_company_id() TO authenticated;

DROP POLICY IF EXISTS "Employees can view department colleagues" ON public.employee_profiles;
CREATE POLICY "Employees can view department colleagues"
ON public.employee_profiles
FOR SELECT
TO authenticated
USING (
    company_id = public.current_employee_company_id()
    AND department_id IS NOT NULL
    AND department_id = public.current_employee_department_id()
);

DROP POLICY IF EXISTS "Employees can view assigned department" ON public.departments;
CREATE POLICY "Employees can view assigned department"
ON public.departments
FOR SELECT
TO authenticated
USING (
    company_id = public.current_employee_company_id()
    AND id = public.current_employee_department_id()
);

CREATE INDEX IF NOT EXISTS idx_employee_profiles_company_department_id
    ON public.employee_profiles(company_id, department_id);
