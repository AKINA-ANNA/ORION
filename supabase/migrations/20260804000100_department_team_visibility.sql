-- Allow employees to see coworkers only when both are assigned to the same
-- company and department. SECURITY DEFINER avoids RLS recursion while the
-- policy resolves the authenticated employee's assignment.
CREATE OR REPLACE FUNCTION public.current_employee_department_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT department_id
    FROM public.employee_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_department_id() TO authenticated;

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
