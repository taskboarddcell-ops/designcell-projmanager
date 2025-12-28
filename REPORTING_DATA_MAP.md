# Supabase Data Map for AI Reporting Module

Based on schema inspection via Supabase MCP.

## 1. Core Tables

### `tasks`
Primary unit of work.
- **PK**: `id` (uuid)
- **Project Link**: `project_id` (uuid) -> `projects.id`
- **Identity**: `task` (Title), `description` (Details)
- **Status workflow**: `status` (Current state), `priority`
- **Dates**: `created_at` (Start of lifecycle), `due` (Target), `completed_at` (End of lifecycle)
- **Assignments**: `assignee_ids` (Array of text, links to `profiles.staff_id`)
- **Missing**: No explicit `estimate`/`hours` column found. Metrics will use **Task Count**.

### `projects`
Context for tasks.
- **PK**: `id` (uuid)
- **Identity**: `name`
- **Metadata**: `type`, `project_status` (e.g. 'Ongoing')

### `task_status_log`
History for cycle time and bottleneck analysis.
- **FK**: `task_id` -> `tasks.id`
- **Transitions**: `from_status`, `to_status`
- **Timing**: `changed_at`
- **Actor**: `changed_by_id`

### `profiles` (Users)
- **Key**: `staff_id` (text) - Matches `tasks.assignee_ids`
- **Identity**: `name`, `email`, `level` (Role)

## 2. Derived Metrics Strategy

| Metric | Source Logic |
| :--- | :--- |
| **Throughput** | Count `tasks` where `completed_at` is within Report Range. |
| **Cycle Time** | `completed_at` - `created_at` (Lead Time). Refined via `task_status_log` (first 'In Progress' to 'Complete') if data permits. |
| **Aging** | `NOW()` - `created_at` for tasks where `status` != 'Complete'. |
| **On Hold Impact** | Sum of duration in `task_status_log` where `to_status` = 'On Hold'. |
| **Workload** | Count of open tasks where `assignee_ids` contains User ID. |
| **Overdue** | Count open tasks where `due` < `NOW()`. |

## 3. Missing / Needs
- **PDF Template**: Please provide the PDF file style reference. I will implement a responsive 2-column HTML layout with professional header/footer (branding) as a placeholder.
- **Secrets**: Ensure `GEMINI_API_KEY` is available in environment variables.
