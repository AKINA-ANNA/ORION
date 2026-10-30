-- AI knowledge assessments are optional and additive to the existing task workflow.
ALTER TABLE public.onboarding_tasks
    ADD COLUMN IF NOT EXISTS requires_assessment BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS assessment_score INTEGER DEFAULT NULL CHECK (assessment_score IS NULL OR assessment_score BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS assessment_attempts INTEGER NOT NULL DEFAULT 0 CHECK (assessment_attempts >= 0),
    ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS assessment_alert_dismissed BOOLEAN NOT NULL DEFAULT FALSE;
