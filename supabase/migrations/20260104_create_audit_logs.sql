-- 1. Create unified audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Admins can view/manage audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.level IN ('Admin', 'Super Admin')
        )
    );

-- 3. Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    record_id UUID;
    old_record JSONB := NULL;
    new_record JSONB := NULL;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        record_id := OLD.id;
        old_record := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        record_id := NEW.id;
        old_record := to_jsonb(OLD);
        new_record := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN
        record_id := NEW.id;
        new_record := to_jsonb(NEW);
    END IF;

    -- For updates, only log if something changed
    IF (TG_OP = 'UPDATE' AND old_record = new_record) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.audit_logs (
        table_name, 
        record_id, 
        operation, 
        old_data, 
        new_data, 
        changed_by
    ) VALUES (
        TG_TABLE_NAME, 
        record_id, 
        TG_OP, 
        old_record, 
        new_record, 
        auth.uid()
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Triggers to Key Tables
DROP TRIGGER IF EXISTS audit_projects ON public.projects;
CREATE TRIGGER audit_projects
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_tasks ON public.tasks;
CREATE TRIGGER audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 5. Restore Function (The "Restore Point" enabler)
CREATE OR REPLACE FUNCTION public.restore_from_audit(log_id UUID)
RETURNS JSONB AS $$
DECLARE
    log_entry public.audit_logs%ROWTYPE;
    result JSONB;
BEGIN
    SELECT * INTO log_entry FROM public.audit_logs WHERE id = log_id;

    IF log_entry.operation = 'DELETE' THEN
        -- Re-insert the deleted record
        EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(null::public.%I, $1)', log_entry.table_name, log_entry.table_name)
        USING log_entry.old_data;
        result := jsonb_build_object('status', 'restored', 'action', 'insert');

    ELSIF log_entry.operation = 'UPDATE' THEN
        -- Revert to old data
        EXECUTE format('UPDATE public.%I SET (id, name, type, stage_plan, project_status, created_at, lead_ids) = (SELECT id, name, type, stage_plan, project_status, created_at, lead_ids FROM jsonb_populate_record(null::public.%I, $1)) WHERE id = $2', log_entry.table_name, log_entry.table_name)
        USING log_entry.old_data, log_entry.record_id;
        
        -- Note: The generic UPDATE above is hard because column lists vary.
        -- A robust generic update requires dynamic query building which is complex in PLPGSQL.
        -- For 'projects' specifically (our main concern), let's make it robust:
        IF log_entry.table_name = 'projects' THEN
             UPDATE public.projects 
             SET stage_plan = (log_entry.old_data->>'stage_plan')::jsonb,
                 name = log_entry.old_data->>'name',
                 type = log_entry.old_data->>'type',
                 lead_ids = (SELECT array_agg(x) FROM jsonb_array_elements_text(log_entry.old_data->'lead_ids') t(x))
             WHERE id = log_entry.record_id;
        ELSIF log_entry.table_name = 'tasks' THEN
             -- Minimal restore for tasks (can expand)
             UPDATE public.tasks
             SET task = log_entry.old_data->>'task',
                 status = log_entry.old_data->>'status',
                 description = log_entry.old_data->>'description'
             WHERE id = log_entry.record_id;
        END IF;

        result := jsonb_build_object('status', 'restored', 'action', 'update');
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up older specific table if exists
DROP TABLE IF EXISTS public.project_history;
