-- Create project_history table
CREATE TABLE IF NOT EXISTS public.project_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    changed_by TEXT, -- Staff ID of the user who made the change
    operation_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_record JSONB,
    new_record JSONB,
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_history_project_id ON public.project_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_history_changed_at ON public.project_history(changed_at DESC);

-- Function to handle the trigger
CREATE OR REPLACE FUNCTION public.handle_project_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.project_history (project_id, operation_type, new_record)
        VALUES (NEW.id, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if actual data changed
        IF NEW IS DISTINCT FROM OLD THEN
            INSERT INTO public.project_history (project_id, operation_type, old_record, new_record)
            VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.project_history (project_id, operation_type, old_record)
        VALUES (OLD.id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger (Drop first to ensure idempotency)
DROP TRIGGER IF EXISTS on_project_change ON public.projects;

CREATE TRIGGER on_project_change
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_project_history();
