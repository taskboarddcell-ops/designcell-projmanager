-- Add soft delete columns to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add soft delete columns to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update RLS policies (optional but good practice)
-- We'll keep it simple for now and rely on application logic filtering
-- assuming the application is the primary access point.
