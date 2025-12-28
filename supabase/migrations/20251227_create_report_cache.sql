-- Report Caching Infrastructure
-- Ensures deterministic report generation and reduces Gemini API calls

-- Report Runs: Metadata for each report generation
CREATE TABLE IF NOT EXISTS report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('individual', 'project', 'firm')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Versioning for cache invalidation
  schema_version TEXT NOT NULL DEFAULT '1.0',
  analytics_version TEXT NOT NULL DEFAULT '1.0',
  template_version TEXT NOT NULL DEFAULT '1.0',
  gemini_model_version TEXT NOT NULL DEFAULT 'gemini-2.0-flash-exp',
  
  -- Cache keys
  cache_key TEXT NOT NULL,
  data_fingerprint TEXT NOT NULL,
  prompt_fingerprint TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id TEXT,
  created_by_name TEXT,
  generation_duration_ms INTEGER,
  
  -- Indexes
  CONSTRAINT unique_cache_key UNIQUE (cache_key, data_fingerprint)
);

-- Report Artifacts: Stored outputs
CREATE TABLE IF NOT EXISTS report_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_run_id UUID NOT NULL REFERENCES report_runs(id) ON DELETE CASCADE,
  
  -- Stored content
  html_content TEXT,
  html_storage_path TEXT,
  pdf_storage_path TEXT,
  
  -- Structured data for re-rendering
  narrative_json JSONB NOT NULL,
  metrics_json JSONB NOT NULL,
  charts_json JSONB,
  
  -- Integrity
  checksum TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT one_artifact_per_run UNIQUE (report_run_id)
);

-- Indexes for performance
CREATE INDEX idx_report_runs_type_dates ON report_runs(report_type, start_date, end_date);
CREATE INDEX idx_report_runs_cache_key ON report_runs(cache_key);
CREATE INDEX idx_report_runs_created_at ON report_runs(created_at DESC);
CREATE INDEX idx_report_runs_filters ON report_runs USING gin(filters_json);
CREATE INDEX idx_report_artifacts_run_id ON report_artifacts(report_run_id);

-- RLS Policies (Admin only)
ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_artifacts ENABLE ROW LEVEL SECURITY;

-- Allow admins full access (adjust based on your auth setup)
CREATE POLICY "Admins can manage reports" ON report_runs
  FOR ALL USING (true); -- Replace with actual admin check

CREATE POLICY "Admins can manage artifacts" ON report_artifacts
  FOR ALL USING (true); -- Replace with actual admin check

COMMENT ON TABLE report_runs IS 'Tracks all report generation runs with caching metadata';
COMMENT ON TABLE report_artifacts IS 'Stores generated report outputs and structured data';
COMMENT ON COLUMN report_runs.cache_key IS 'Deterministic hash of report parameters';
COMMENT ON COLUMN report_runs.data_fingerprint IS 'Hash of underlying data state for cache invalidation';
COMMENT ON COLUMN report_runs.prompt_fingerprint IS 'Hash of facts packet sent to Gemini';
