-- Fix: Add missing table_name column to audit_logs table
-- This column is required by the log_audit_event() trigger function
-- Date: 2026-01-21

-- Add the missing table_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs' 
        AND column_name = 'table_name'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN table_name TEXT;
        
        -- Update existing records to have a default value
        UPDATE public.audit_logs SET table_name = 'unknown' WHERE table_name IS NULL;
        
        -- Now make it NOT NULL
        ALTER TABLE public.audit_logs ALTER COLUMN table_name SET NOT NULL;
        
        RAISE NOTICE 'Added table_name column to audit_logs';
    ELSE
        RAISE NOTICE 'table_name column already exists';
    END IF;
END $$;

-- Recreate the trigger function to ensure it's up to date
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

-- Ensure triggers are in place
DROP TRIGGER IF EXISTS audit_tasks ON public.tasks;
CREATE TRIGGER audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_projects ON public.projects;
CREATE TRIGGER audit_projects
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
