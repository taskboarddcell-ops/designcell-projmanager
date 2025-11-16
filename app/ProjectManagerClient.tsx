// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// ------------ STATIC HTML (layout as string) ------------
const staticHtml = `
  <div class="app">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sb-top">
        <div class="brand">
          <img src="https://designcell.com.np/wp-content/themes/WPSTARTER/imagio_s/img/logo/logo.png" alt="DesignCell">
          <div>Project Manager</div>
        </div>
        <div class="me-box">
          <div class="row">
            <button id="btnLogin" class="btn" title="Login">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#172554">
                <path d="M480-120v-80h280v-560H480v-80h280q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H480Zm-80-160-55-58 102-102H120v-80h327L345-622l55-58 200 200-200 200Z"/>
              </svg>
              Login
            </button>
            <button id="btnLogout" class="btn btn-danger" style="display:none">Logout</button>
          </div>
          <div id="who" class="who"></div>
        </div>
      </div>

      <div class="sb-new">
        <button id="btnNewTask" class="btn">+ Task</button>
        <button id="btnNewProject" class="btn">+ Project</button>
        <button id="btnAddUser" class="btn">+ User</button>
      </div>

      <div class="sb-new">
        <div id="reportsEntry" class="proj-item" style="display:none">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#172554">
            <path d="M280-280h80v-200h-80v200Zm320 0h80v-400h-80v400Zm-160 0h80v-120h-80v120Zm0-200h80v-80h-80v80ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>
          </svg>
          Reports
        </div>
      </div>

      <div class="sb-body">
        <div class="sec-title">Projects</div>

        <div class="proj-list">
          <div class="search-wrap">
            <span class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
              </svg>
            </span>
            <input id="projSearch" type="text" placeholder="Search projects...">
          </div>
          <button id="btnAllProjects" class="btn" style="width:100%; margin-bottom:8px;">All Projects</button>
          <div id="projList"></div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="main">
      <div class="topbar">
        <div class="tabs">
          <!-- Project Structure tab (first) -->
          <button id="tabStages" class="tab" aria-selected="false">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" class="tab-icon" viewBox="0 -960 960 960">
              <path d="m656-120-56-56 63-64-63-63 56-57 64 64 63-64 57 57-64 63 64 64-57 56-63-63-64 63Zm-416-80q17 0 28.5-11.5T280-240q0-17-11.5-28.5T240-280q-17 0-28.5 11.5T200-240q0 17 11.5 28.5T240-200Zm0 80q-50 0-85-35t-35-85q0-50 35-85t85-35q37 0 67.5 20.5T352-284q39-11 63.5-43t24.5-73v-160q0-83 58.5-141.5T640-760h46l-63-63 57-57 160 160-160 160-57-56 63-64h-46q-50 0-85 35t-35 85v160q0 73-47 128.5T354-203q-12 37-43.5 60T240-120Zm-64-480-56-56 63-64-63-63 56-57 64 64 63-64 57 57-64 63 64 64-57 56-63-63-64 63Z"/>
            </svg>
            Project Structure
          </button>

          <!-- Kanban Board tab (second) -->
          <button id="tabKanban" class="tab" aria-selected="false">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" class="tab-icon" viewBox="0 -960 960 960">
              <path d="M280-280h80v-400h-80v400Zm320-80h80v-320h-80v320ZM440-480h80v-200h-80v200ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>
            </svg>
            Board
          </button>

          <!-- Task List tab (third, default active) -->
          <button id="tabTasks" class="tab" aria-selected="true">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" class="tab-icon" viewBox="0 -960 960 960">
              <path d="m438-240 226-226-58-58-169 169-84-84-57 57 142 142ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/>
            </svg>
            Task List
          </button>
        </div>

        <div class="topbar-right" style="display:flex;align-items:center;gap:8px;">
          <div id="contextInfo" class="small muted">All Projects</div>
          <select
            id="projectStatusControl"
            class="select"
            style="min-width:120px; display:none;"
          >
            <option value="Ongoing">Ongoing</option>
            <option value="On Hold">On Hold</option>
            <option value="Complete">Complete</option>
          </select>
        </div>
      </div>

      <div class="content">
        <!-- Task List -->
        <section id="viewTasks" class="card">
          <div class="filters">
            <select id="filterAssignee" class="select" style="min-width:220px">
              <option value="">All Assignees</option>
            </select>
            <select id="filterStatus" class="select" style="min-width:180px">
              <option value="Pending" selected>Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="All">All</option>
            </select>
            <div class="spacer"></div>
            <div id="projectContext" class="small muted"></div>
          </div>

          <div style="height:12px"></div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Assignees</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Remarks</th>
                  <th class="right">Action</th>
                </tr>
              </thead>
              <tbody id="tasksBody"></tbody>
            </table>
          </div>
        </section>

        <!-- Kanban -->
        <section id="viewKanban" class="card" style="display:none">
          <div class="filters" style="margin-bottom:12px">
            <select id="kbFilterAssignee" class="select" style="min-width:220px">
              <option value="">All Assignees</option>
            </select>
            <select id="kbFilterStatus" class="select" style="min-width:180px">
              <option value="Pending" selected>Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="All">All</option>
            </select>
            <div class="spacer"></div>
          </div>

          <div class="kanban">
            <div class="kcol">
              <div class="khead">
                <span class="kchip hi" title="High"></span>
                <span class="kchip med" title="Medium"></span>
                <span class="kchip low" title="Low"></span>
                Pending
              </div>
              <div id="colPending" class="kdrop" data-status="Pending"></div>
            </div>
            <div class="kcol">
              <div class="khead">
                <span class="kchip hi" title="High"></span>
                <span class="kchip med" title="Medium"></span>
                <span class="kchip low" title="Low"></span>
                In Progress
              </div>
              <div id="colProgress" class="kdrop" data-status="In Progress"></div>
            </div>
            <div class="kcol">
              <div class="khead">
                <span class="kchip hi" title="High"></span>
                <span class="kchip med" title="Medium"></span>
                <span class="kchip low" title="Low"></span>
                Completed
              </div>
              <div id="colDone" class="kdrop" data-status="Complete"></div>
            </div>
          </div>
        </section>

        <!-- Project Structure -->
        <section id="viewStages" class="card" style="display:none">
          <div class="row" id="layoutActions" style="margin-bottom:12px;display:none">
            <button id="btnEditLayout" class="btn">✎ Edit Layout</button>
            <button id="btnBulkAssign" class="btn" style="display:none">+ Bulk Tasks</button>
          </div>
          <div id="stagesBox"></div>
        </section>
      </div>
    </main>
  </div>

  <!-- LOGIN -->
  <div id="loginModal" class="modal">
    <div class="mc" style="max-width:420px">
      <h3 style="margin:0 0 8px 0">Login</h3>
      <div class="grid2">
        <div>
          <label class="small muted">StaffID</label>
          <input id="loginId" class="input" />
        </div>
        <div>
          <label class="small muted">4-digit Code</label>
          <input id="loginCode" class="input" type="password" maxlength="4" inputmode="numeric"/>
        </div>
      </div>
      <div class="right">
        <button id="loginCancel" class="btn">Cancel</button>
        <button id="loginOK" class="btn btn-primary">Login</button>
      </div>
    </div>
  </div>

  <!-- NEW PROJECT -->
  <div id="projModal" class="modal">
    <div class="mc">
      <h3 id="projModalTitle" style="margin:0 0 8px 0">New Project</h3>
      <div class="grid3">
        <!-- Project name -->
        <div>
          <label class="small muted">Name *</label>
          <input id="pName" class="input">
        </div>

        <!-- Project leads as checkbox list -->
        <div>
          <label class="small muted">Leads *</label>
          <div id="pLeadBox"
               class="list"
               style="max-height:220px;overflow:auto;border:1px solid #e2e8f0;padding:6px;border-radius:4px;background:#f8fafc">
          </div>
          <div class="small muted" style="margin-top:4px">
            Tick one or more project leads.
          </div>
        </div>

        <!-- Project type -->
        <div>
          <label class="small muted">Project Type *</label>
          <select id="pType" class="select"></select>
        </div>
      </div>

      <div class="row" style="margin-top:10px;align-items:center;gap:8px">
        <button id="btnLoadTemplate" class="btn">Load Template</button>
        <div class="small muted">
          Edit stages below before saving. This plan will be stored as JSON in
          <b>Projects.stage_plan</b>.
        </div>
      </div>

      <!-- Stage layout editor -->
      <div class="card" style="margin-top:10px;padding:8px">
        <div class="small muted" style="margin-bottom:4px">
          Stage layout (Stage &rarr; Sub-stages)
        </div>
        <div class="list" id="stagePlanEditor" style="max-height:360px;overflow:auto"></div>
      </div>

      <div class="row" style="margin-top:8px">
        <button id="btnAddStage" class="btn">+ Stage</button>
      </div>

      <div class="right">
        <button id="projCancel" class="btn">Cancel</button>
        <button id="projOK" class="btn btn-primary">Create Project</button>
      </div>
    </div>
  </div>

  <!-- NEW / EDIT TASK -->
  <div id="taskModal" class="modal">
    <div class="mc">
      <h3 id="taskModalTitle" style="margin:0 0 8px 0">New Task</h3>
      <div class="grid3">
        <div><label class="small muted">Project *</label><select id="tProject" class="select"></select></div>
        <div><label class="small muted">Stage *</label><select id="tStage" class="select"></select></div>
        <div><label class="small muted">Sub-stage *</label><select id="tSub" class="select"></select></div>
      </div>
      <div class="grid3" style="margin-top:8px">
        <div><label class="small muted">Due *</label><input id="tDue" class="input" type="date"></div>
        <div>
          <label class="small muted">Priority</label>
          <select id="tPriority" class="select">
            <option>High</option><option selected>Medium</option><option>Low</option>
          </select>
        </div>
        <div><label class="small muted">Description (task title)</label><input id="tDesc" class="input" placeholder="Details…"></div>
      </div>
      <div style="margin-top:8px">
        <label class="small muted">Assign to (check)</label>
        <div id="assigneesBox" class="list"></div>
      </div>
      <div class="right">
        <button id="taskCancel" class="btn">Cancel</button>
        <button id="taskOK" class="btn btn-primary">Save Task</button>
      </div>
    </div>
  </div>

  <!-- ADD USER -->
  <div id="userModal" class="modal">
    <div class="mc">
      <h3 style="margin:0 0 8px 0">Add User (Admin)</h3>
      <div class="grid3">
        <div><label class="small muted">Name *</label><input id="uName" class="input"></div>
        <div>
          <label class="small muted">Access Level *</label>
          <select id="uLevel" class="select">
            <option>Designer</option><option>Team Leader</option><option>Admin</option>
          </select>
        </div>
        <div><label class="small muted">Email *</label><input id="uEmail" class="input" type="email"></div>
      </div>
      <div class="right">
        <button id="userCancel" class="btn">Cancel</button>
        <button id="userOK" class="btn btn-primary">Create</button>
      </div>
    </div>
  </div>

  <!-- RESCHEDULE -->
  <div id="resModal" class="modal">
    <div class="mc" style="max-width:420px">
      <h3 style="margin:0 0 8px 0">Reschedule</h3>
      <label class="small muted">New Due *</label>
      <input id="resDate" class="input" type="date">
      <label class="small muted" style="margin-top:6px">Remarks</label>
      <input id="resRemark" class="input">
      <div class="right">
        <button id="resCancel" class="btn">Cancel</button>
        <button id="resOK" class="btn btn-primary">Save</button>
      </div>
    </div>
  </div>

  <!-- COMPLETE -->
  <div id="doneModal" class="modal">
    <div class="mc" style="max-width:420px">
      <h3 style="margin:0 0 8px 0">Complete Task</h3>
      <label class="small muted">Completion Remarks</label>
      <input id="doneRemark" class="input">
      <div class="right">
        <button id="doneCancel" class="btn">Cancel</button>
        <button id="doneOK" class="btn btn-primary">Mark Complete</button>
      </div>
    </div>
  </div>

  <!-- STATUS UPDATE -->
  <div id="statusModal" class="modal">
    <div class="mc" style="max-width:480px">
      <h3 style="margin:0 0 8px 0">Update Status</h3>
      <label class="small muted">New status</label>
      <select id="stSel" class="select">
        <option>Pending</option>
        <option>In Progress</option>
        <option>Complete</option>
      </select>
      <label class="small muted" style="margin-top:6px">Note (optional)</label>
      <textarea id="stNote" class="input" style="height:88px"></textarea>
      <div class="right">
        <button id="stCancel" class="btn">Cancel</button>
        <button id="stOK" class="btn btn-primary">Save</button>
      </div>
    </div>
  </div>

  <!-- HISTORY / LOG -->
  <div id="historyModal" class="modal">
    <div class="mc" style="max-width:520px">
      <h3 style="margin:0 0 8px 0">Status & Schedule History</h3>
      <div id="historyBody" class="list" style="max-height:320px;overflow:auto"></div>
      <div class="right">
        <button id="historyClose" class="btn">Close</button>
      </div>
    </div>
  </div>

  <!-- REPORTS (kept but not wired yet) -->
  <div id="reportsModal" class="modal">
    <div class="mc">
      <h3 style="margin:0 0 8px 0">Reports (Admin)</h3>
      <div class="rep-grid">
        <div class="rep-field">
          <div class="rep-label">Company</div>
          <div class="rep-control rep-single">
            <button id="btnCompanyRep" class="btn">↻ Generate (weekly)</button>
          </div>
        </div>
        <div class="rep-field">
          <div class="rep-label">Project</div>
          <div class="rep-control">
            <select id="repProject" class="select"></select>
            <button id="btnProjNow" class="btn">↻ Deep Dive</button>
          </div>
        </div>
        <div class="rep-field">
          <div class="rep-label">Staff</div>
          <div class="rep-control">
            <select id="repStaff" class="select"></select>
            <button id="btnStaffNow" class="btn">↻ Deep Dive</button>
          </div>
        </div>
      </div>
      <div id="repOut" class="list">
        <div class="empty">Choose a report…</div>
      </div>
      <div class="rep-footer">
        <button id="repClose" class="btn">Close</button>
      </div>
    </div>
  </div>
  
  <!-- BULK ASSIGN TASKS (still present but optional) -->
  <div id="bulkModal" class="modal">
    <div class="mc">
      <h3 style="margin:0 0 8px 0">Bulk Assign Tasks</h3>
      <div id="bulkProjectName" class="small muted" style="margin-bottom:8px"></div>

      <div class="grid3" style="margin-bottom:8px">
        <div>
          <label class="small muted">Due *</label>
          <input id="bulkDue" class="input" type="date">
        </div>
        <div>
          <label class="small muted">Priority</label>
          <select id="bulkPriority" class="select">
            <option>High</option>
            <option selected>Medium</option>
            <option>Low</option>
          </select>
        </div>
        <div>
          <label class="small muted">Assign to</label>
          <div
            id="bulkAssigneesBox"
            class="list"
            style="max-height:140px;overflow:auto;border:1px solid #e5e7eb;padding:6px;"
          ></div>
        </div>
      </div>

      <div>
        <label class="small muted">Select sub-stages to create tasks for</label>
        <div
          id="bulkStagesBox"
          class="list"
          style="max-height:260px;overflow:auto;margin-top:4px;"
        ></div>
      </div>

      <div class="right" style="margin-top:10px">
        <button id="bulkCancel" class="btn">Cancel</button>
        <button id="bulkOK" class="btn btn-primary">Create Tasks</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div id="toast" class="card" style="position:fixed;left:50%;top:12px;transform:translateX(-50%);display:none;z-index:60;padding:8px 12px">OK</div>

  <!-- Full-window loading overlay (optional) -->
  <div id="globalLoading" aria-hidden="true" style="display:none">
    <div class="sheet">
      <div class="spinner" role="status" aria-label="Loading"></div>
      <div class="label">Loading…</div>
    </div>
  </div>
`;

// ------------ HELPERS (no TypeScript types) ------------
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d);
  }
}


// ------------ MAIN CLIENT COMPONENT ------------
export default function ProjectManagerClient() {
  const containerRef = useRef(null);

  useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  // Inject static HTML
  container.innerHTML = staticHtml;

  // ---------- IN-MEMORY STATE ----------
  let currentUser: any = null;
  let projects: any[] = [];
  let tasks: any[] = [];
  let activeProjectName = '';
  let selectedTask: any = null;
  let editingTask: any = null;
  let projectTypesCache: string[] | null = null;

  let layoutEditMode = false;
  let layoutEditingProjectId: string | null = null;
  let projectLayoutEditTargetId: string | null = null;

  const projectUsersCache: Record<string, any[]> = {};

  // ---------- HELPERS ----------
  const el = (id: string) => container.querySelector<HTMLElement>(`#${id}`);

  const STAGE_ORDER = [
    'PRELIMINARY',
    'ARCHITECTURAL DRAWINGS',
    'STRUCTURAL DRAWINGS',
    'SANITARY DRAWINGS',
    'ELECTRICAL DRAWINGS',
    'SITE DEVELOPMENT DRAWING',
    'MUNICIPAL',
  ];

  const STAGE_ORDER_MAP = new Map(
    STAGE_ORDER.map((name, idx) => [name.toUpperCase(), idx]),
  );

  const DEFAULT_STAGE_HIERARCHY = STAGE_ORDER.slice();

  const toast = (msg: string, ms = 1800) => {
    const t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => {
      t.style.display = 'none';
    }, ms);
  };

  const showModal = (m: HTMLElement | null) => {
    if (m) m.classList.add('show');
  };

  const hideModal = (m: HTMLElement | null) => {
    if (m) m.classList.remove('show');
  };

  // ---- ROLE / PERMISSION HELPERS ----
  const isAdmin = () =>
    currentUser &&
    (currentUser.access_level === 'Admin' ||
      currentUser.access_level === 'Owner');

  function isTeamLead() {
    return currentUser && currentUser.access_level === 'Team Leader';
  }

  function isDesigner() {
    return currentUser && currentUser.access_level === 'Designer';
  }

  function isProjectLeadFor(project: any, user: any = currentUser) {
    if (!project || !user) return false;
    const leads = project.lead_ids || [];
    return leads.includes(user.staff_id);
  }

  function isAssignee(task: any) {
    if (!currentUser) return false;
    const ids = task.assignee_ids || [];
    return ids.includes(currentUser.staff_id);
  }

  function userCanSeeTask(task: any) {
    if (!currentUser) return false;
    // Admin sees everything
    if (isAdmin()) return true;

    const proj = projects.find((p) => p.id === task.project_id);
    const isLeadForProject =
      proj && (proj.lead_ids || []).includes(currentUser.staff_id);

    // Project lead: all tasks in their project
    if (isLeadForProject) return true;

    // Everyone else: only tasks assigned to them
    return isAssignee(task);
  }

  async function loadProjectUsers(projectId: string) {
    if (projectUsersCache[projectId]) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Load project users failed', error);
      toast('Could not load users');
      projectUsersCache[projectId] = [];
      return;
    }

    projectUsersCache[projectId] = data || [];
  }

  const canEditProjectLayout = (proj: any) => {
    if (!currentUser || !proj) return false;
    if (isAdmin()) return true;
    const leads = proj.lead_ids || [];
    return leads.includes(currentUser.staff_id);
  };

  // ---------- PROJECT STATUS DROPDOWN (TOP BAR) ----------
  const projectStatusControl = el('projectStatusControl') as HTMLSelectElement | null;
  const contextInfo = el('contextInfo');

  function updateProjectStatusControl() {
    if (!projectStatusControl) return;

    // Only Admin + specific project selected
    if (!currentUser || !isAdmin() || !activeProjectName) {
      projectStatusControl.style.display = 'none';
      return;
    }

    const proj = projects.find((p) => p.name === activeProjectName);
    if (!proj) {
      projectStatusControl.style.display = 'none';
      return;
    }

    projectStatusControl.style.display = '';
    const status = proj.status || 'Ongoing';
    projectStatusControl.value = status;
  }

  projectStatusControl &&
    projectStatusControl.addEventListener('change', async () => {
      if (!currentUser || !isAdmin()) {
        toast('Only Admin can change project status');
        updateProjectStatusControl();
        return;
      }
      if (!activeProjectName) return;

      const proj = projects.find((p) => p.name === activeProjectName);
      if (!proj) return;

      const newStatus = projectStatusControl.value || 'Ongoing';

      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', proj.id);

      if (error) {
        console.error('Update project status error', error);
        toast('Failed to update project status');
        updateProjectStatusControl();
        return;
      }

      toast('Project status updated');
      proj.status = newStatus; // keep local cache in sync
    });

  // ---------- KANBAN STATUS CHANGE ----------
  async function changeTaskStatusFromKanban(taskId: string, newStatus: string) {
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;

    if (!currentUser) {
      toast('Please login first');
      return;
    }

    if (!isAssignee(task)) {
      toast('Only assignees can move this task');
      return;
    }

    const prevStatus = task.status || 'Pending';

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      console.error('Kanban status update error', error);
      toast('Failed to update status');
      return;
    }

    await supabase.from('task_status_log').insert([
      {
        task_id: task.id,
        action: 'status_change',
        from_status: prevStatus,
        to_status: newStatus,
        changed_by_id: currentUser.staff_id,
        changed_by_name: currentUser.name,
      },
    ]);

    toast('Status updated');
    await loadDataAfterLogin();
  }

  // ---------- BULK TASK MODAL ----------
  const bulkModal = el('bulkModal');
  const bulkProjectName = el('bulkProjectName');
  const bulkDue = el('bulkDue') as HTMLInputElement | null;
  const bulkPriority = el('bulkPriority') as HTMLSelectElement | null;
  const bulkAssigneesBox = el('bulkAssigneesBox');
  const bulkStagesBox = el('bulkStagesBox');
  const bulkCancel = el('bulkCancel');
  const bulkOK = el('bulkOK');

  async function openBulkModalForProject(proj: any) {
    if (!bulkModal || !bulkStagesBox || !bulkAssigneesBox) return;

    if (bulkProjectName) {
      bulkProjectName.textContent = `Project: ${proj.name || ''}`;
    }

    if (bulkDue) bulkDue.value = '';
    if (bulkPriority) bulkPriority.value = 'Medium';

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Load users for bulk assign failed', error);
      toast('Could not load users');
      return;
    }

    bulkAssigneesBox.innerHTML = (users || [])
      .map(
        (u) => `
          <label class="chk-line">
            <input type="checkbox"
                   value="${esc(u.staff_id)}"
                   data-name="${esc(u.name || '')}">
            <span>${esc(u.name || '')} [${esc(u.staff_id)}]</span>
          </label>
        `,
      )
      .join('');

    const plan = proj.stage_plan || [];
    if (!plan.length) {
      bulkStagesBox.innerHTML =
        '<div class="small muted">No stages defined for this project.</div>';
    } else {
      bulkStagesBox.innerHTML = plan
        .map((s: any) => {
          const stName = s.stage || s.name || '';
          const subs = s.subs || s.sub_stages || [];
          const subsHtml = subs.length
            ? subs
                .map(
                  (sb: string) => `
                    <label class="chk-line">
                      <input type="checkbox"
                             class="bulk-sub"
                             data-stage="${esc(stName)}"
                             data-sub="${esc(sb)}">
                      <span>${esc(stName)} → ${esc(sb)}</span>
                    </label>
                  `,
                )
                .join('')
            : `
              <div class="small muted" style="margin-left:4px">
                No sub-stages.
              </div>
            `;

          return `
            <div class="bulk-stage-group">
              <div class="small" style="font-weight:600;margin-top:4px;margin-bottom:2px;">
                ${esc(stName || 'Stage')}
              </div>
              ${subsHtml}
            </div>
          `;
        })
        .join('');
    }

    showModal(bulkModal);
  }

  bulkCancel &&
    bulkCancel.addEventListener('click', () => {
      hideModal(bulkModal);
    });

  bulkOK &&
    bulkOK.addEventListener('click', async () => {
      if (!currentUser) {
        toast('Please login first');
        return;
      }

      const proj = activeProjectName
        ? projects.find((p) => p.name === activeProjectName)
        : null;
      if (!proj) {
        toast('Select a project first');
        return;
      }

      const due = bulkDue && bulkDue.value ? bulkDue.value : null;
      const priority = (bulkPriority && bulkPriority.value) || 'Medium';

      if (!due) {
        toast('Pick a due date');
        return;
      }

      if (!bulkStagesBox) return;
      const checkedSubs = Array.from(
        bulkStagesBox.querySelectorAll<HTMLInputElement>('input.bulk-sub:checked'),
      );

      if (!checkedSubs.length) {
        toast('Select at least one sub-stage');
        return;
      }

      const checkedAssignees = bulkAssigneesBox
        ? Array.from(
            bulkAssigneesBox.querySelectorAll<HTMLInputElement>(
              'input[type="checkbox"]:checked',
            ),
          )
        : [];
      const assignee_ids = checkedAssignees.map((c) => c.value);
      const assignees = checkedAssignees.map(
        (c) => c.getAttribute('data-name') || c.value,
      );

      if (!assignee_ids.length) {
        toast('Select at least one assignee');
        return;
      }

      const rows = checkedSubs.map((cb) => {
        const stageName = cb.getAttribute('data-stage') || '';
        const subName = cb.getAttribute('data-sub') || '';
        const title = subName || stageName || 'Task';

        return {
          project_id: proj.id,
          project_name: proj.name,
          stage_id: stageName || null,
          sub_id: subName || null,
          task: title,
          description: '',
          due,
          priority,
          status: 'Pending',
          assignee_ids,
          assignees,
          created_by_id: currentUser.staff_id,
          created_by_name: currentUser.name,
        };
      });

      const { error } = await supabase.from('tasks').insert(rows);
      if (error) {
        console.error('Bulk create tasks error', error);
        toast('Failed to create tasks');
        return;
      }

      hideModal(bulkModal);
      toast(`Created ${rows.length} task(s)`);
      await loadDataAfterLogin();
    });

  // ---------- TABS ----------
  const tabTasks = el('tabTasks');
  const tabKanban = el('tabKanban');
  const tabStages = el('tabStages');
  const viewTasks = el('viewTasks');
  const viewKanban = el('viewKanban');
  const viewStages = el('viewStages');

  function selectTab(which: 'tasks' | 'kanban' | 'stages') {
    const map: Record<
      string,
      { tab: HTMLElement | null; view: HTMLElement | null }
    > = {
      tasks: { tab: tabTasks, view: viewTasks },
      kanban: { tab: tabKanban, view: viewKanban },
      stages: { tab: tabStages, view: viewStages },
    };

    Object.entries(map).forEach(([key, pair]) => {
      const tab = pair.tab;
      const view = pair.view;
      if (!tab || !view) return;
      const active = key === which;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      view.style.display = active ? '' : 'none';
    });

    if (which === 'kanban') renderKanban();
    if (which === 'tasks') renderTasks();
    if (which === 'stages') renderProjectStructure();
  }

  tabTasks && tabTasks.addEventListener('click', () => selectTab('tasks'));
  tabKanban && tabKanban.addEventListener('click', () => selectTab('kanban'));
  tabStages && tabStages.addEventListener('click', () => selectTab('stages'));

  // ---------- FILTERS ----------
  const filterAssignee = el('filterAssignee') as HTMLSelectElement | null;
  const filterStatus = el('filterStatus') as HTMLSelectElement | null;
  const kbFilterAssignee = el('kbFilterAssignee') as HTMLSelectElement | null;
  const kbFilterStatus = el('kbFilterStatus') as HTMLSelectElement | null;

  function syncKanbanFiltersFromList() {
    if (kbFilterAssignee && filterAssignee)
      kbFilterAssignee.value = filterAssignee.value;
    if (kbFilterStatus && filterStatus)
      kbFilterStatus.value = filterStatus.value;
  }

  filterAssignee &&
    filterAssignee.addEventListener('change', () => {
      renderTasks();
      syncKanbanFiltersFromList();
      renderKanban();
    });

  filterStatus &&
    filterStatus.addEventListener('change', () => {
      renderTasks();
      syncKanbanFiltersFromList();
      renderKanban();
    });

  kbFilterAssignee &&
    kbFilterAssignee.addEventListener('change', () => renderKanban());
  kbFilterStatus &&
    kbFilterStatus.addEventListener('change', () => renderKanban());

  // ---------- SIDEBAR: PROJECT LIST ----------
  const projList = el('projList');
  const projSearch = el('projSearch') as HTMLInputElement | null;
  const btnAllProjects = el('btnAllProjects');

  function buildProjectSidebar() {
    if (!projList) return;
    const q = ((projSearch && projSearch.value) || '')
      .toLowerCase()
      .trim();
    const filtered = projects.filter((p) =>
      !q || (p.name || '').toLowerCase().includes(q),
    );

    let html = `
      <div class="proj-item ${activeProjectName ? '' : 'active'}" data-name="">
        All Projects
      </div>
    `;

    filtered.forEach((p) => {
      const isActive = p.name === activeProjectName;
      html += `
        <div class="proj-item ${isActive ? 'active' : ''}" data-name="${esc(
          p.name,
        )}">
          ${esc(p.name)}
        </div>
      `;
    });

    projList.innerHTML = html;

    updateProjectStatusControl();

    projList.querySelectorAll<HTMLElement>('.proj-item').forEach((item) => {
      item.addEventListener('click', () => {
        activeProjectName = item.getAttribute('data-name') || '';
        if (contextInfo) {
          contextInfo.textContent = activeProjectName
            ? `Project: ${activeProjectName}`
            : 'All Projects';
        }
        buildProjectSidebar();
        renderTasks();
        renderKanban();
        if (viewStages && viewStages.style.display !== 'none') {
          renderProjectStructure();
        }
      });
    });
  }

  projSearch && projSearch.addEventListener('input', buildProjectSidebar);
  btnAllProjects &&
    btnAllProjects.addEventListener('click', () => {
      activeProjectName = '';
      if (contextInfo) contextInfo.textContent = 'All Projects';
      buildProjectSidebar();
      renderTasks();
      renderKanban();
      if (viewStages && viewStages.style.display !== 'none') {
        renderProjectStructure();
      }
      updateProjectStatusControl();
    });

  // ---------- ASSIGNEE FILTER OPTIONS ----------
  function refreshAssigneeFilters() {
    const names = new Set<string>();
    tasks.forEach((t) => {
      if (!userCanSeeTask(t)) return;
      (t.assignees || []).forEach((nm: string) => {
        if (nm) names.add(nm);
      });
    });

    const sorted = Array.from(names).sort((a, b) => a.localeCompare(b));

    const options = ['<option value="">All Assignees</option>'].concat(
      sorted.map((nm) => `<option value="${esc(nm)}">${esc(nm)}</option>`),
    );

    if (filterAssignee) filterAssignee.innerHTML = options.join('');
    if (kbFilterAssignee) kbFilterAssignee.innerHTML = options.join('');
  }

  // ---------- RENDER TASK TABLE ----------
  function renderTasks() {
    const body = el('tasksBody');
    if (!body) return;
    body.innerHTML = '';

    const assigneeFilter = (filterAssignee && filterAssignee.value) || '';
    const statusFilter = (filterStatus && filterStatus.value) || 'Pending';

    const visible = tasks.filter((t) => {
      // Permission
      if (!userCanSeeTask(t)) return false;

      // Project filter
      if (activeProjectName && t.project_name !== activeProjectName) return false;

      // Assignee filter
      if (assigneeFilter) {
        const list = t.assignees || [];
        if (!list.includes(assigneeFilter)) return false;
      }

      // Status filter
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Completed') return t.status === 'Complete';
      if (statusFilter === 'In Progress') return t.status === 'In Progress';
      if (statusFilter === 'Pending') {
        return t.status !== 'Complete' && t.status !== 'In Progress';
      }
      return true;
    });

    visible
      .sort((a, b) => {
        const da = a.due ? new Date(a.due) : new Date(8640000000000000);
        const db = b.due ? new Date(b.due) : new Date(8640000000000000);
        return da.getTime() - db.getTime();
      })
      .forEach((t) => {
        const tr = document.createElement('tr');
        const prioClass = (t.priority || 'Medium').toLowerCase();
        tr.className = prioClass;
        tr.dataset.id = t.id;

        const dueStr = formatDate(t.due);
        const assigneesHtml = (t.assignees || [])
          .map(
            (nm: string) =>
              `<span class="chip chip-assignee"><strong>${esc(nm)}</strong></span>`,
          )
          .join('');

        tr.innerHTML = `
          <td>${esc(t.project_name || '')}</td>
          <td>
            ${esc(t.task)}
            ${
              t.current_status
                ? `<div class="small muted">${esc(t.current_status)}</div>`
                : ''
            }
          </td>
          <td>${assigneesHtml}</td>
          <td>${esc(dueStr)}</td>
          <td>${esc(t.priority || '')}</td>
          <td>${esc(t.description || '')}</td>
          <td style="text-align:right; display:flex; gap:4px; justify-content:flex-end; flex-wrap:wrap;">
            <span class="small muted" style="margin-right:8px">${esc(
              t.status || 'Pending',
            )}</span>
            <button class="btn-sm act-status" data-id="${esc(t.id)}">Status</button>
            <button class="btn-sm act-reschedule" data-id="${esc(
              t.id,
            )}">Resched</button>
            <button class="btn-sm act-complete" data-id="${esc(t.id)}">Done</button>
            <button class="btn-sm act-edit" data-id="${esc(t.id)}">Edit</button>
            <button class="btn-sm act-history" data-id="${esc(t.id)}">Log</button>
          </td>
        `;

        body.appendChild(tr);
      });
  }

  // ---------- RENDER KANBAN ----------
  function renderKanban() {
    const colPending = el('colPending');
    const colProgress = el('colProgress');
    const colDone = el('colDone');
    if (!colPending || !colProgress || !colDone) return;

    colPending.innerHTML = '';
    colProgress.innerHTML = '';
    colDone.innerHTML = '';

    const assigneeFilter = (kbFilterAssignee && kbFilterAssignee.value) || '';
    const statusFilter = (kbFilterStatus && kbFilterStatus.value) || 'Pending';

    const filtered = tasks.filter((t) => {
      if (!userCanSeeTask(t)) return false;
      if (activeProjectName && t.project_name !== activeProjectName) return false;

      if (assigneeFilter) {
        const list = t.assignees || [];
        if (!list.includes(assigneeFilter)) return false;
      }

      if (statusFilter === 'All') return true;
      if (statusFilter === 'Completed') return t.status === 'Complete';
      if (statusFilter === 'In Progress') return t.status === 'In Progress';
      if (statusFilter === 'Pending') {
        return t.status !== 'Complete' && t.status !== 'In Progress';
      }
      return true;
    });

    filtered.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'kcard';
      card.dataset.id = t.id;
      card.dataset.priority = t.priority || 'Medium';
      card.draggable = true;

      const dueStr = formatDate(t.due);

      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="flex:1;">
            <div><strong>${esc(t.task)}</strong></div>
            <div class="small muted"><strong>${esc(t.project_name || '')}</strong></div>
            <div class="small muted assignee-line">
              ${(t.assignees || [])
                .map(
                  (nm: string) =>
                    `<span class="chip chip-assignee"><strong>${esc(
                      nm,
                    )}</strong></span>`,
                )
                .join('')}
            </div>
            <div class="small muted">${esc(dueStr)}</div>
          </div>
          <div class="small" style="border:1px solid #cbd5e1;padding:2px 6px">
            ${esc(t.priority || '')}
          </div>
        </div>
      `;

      const status = t.status || 'Pending';
      if (status === 'Complete') colDone.appendChild(card);
      else if (status === 'In Progress') colProgress.appendChild(card);
      else colPending.appendChild(card);

      card.addEventListener('dragstart', (ev) => {
        ev.dataTransfer?.setData('text/plain', String(t.id));
        if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
      });
    });

    const zones = container.querySelectorAll<HTMLElement>('.kdrop');

    zones.forEach((zone) => {
      zone.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        zone.classList.add('kdrop-hover');
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('kdrop-hover');
      });

      zone.addEventListener('drop', async (ev) => {
        ev.preventDefault();
        zone.classList.remove('kdrop-hover');

        const taskId = ev.dataTransfer?.getData('text/plain');
        const newStatus = zone.dataset.status;

        if (!taskId || !newStatus) return;
        await changeTaskStatusFromKanban(taskId, newStatus);
      });
    });
  }

  // ---------- LOGIN / LOGOUT ----------
  const btnLogin = el('btnLogin');
  const btnLogout = el('btnLogout');
  const loginModal = el('loginModal');
  const loginId = el('loginId') as HTMLInputElement | null;
  const loginCode = el('loginCode') as HTMLInputElement | null;
  const loginCancel = el('loginCancel');
  const loginOK = el('loginOK');
  const who = el('who');

  btnLogin && btnLogin.addEventListener('click', () => showModal(loginModal));
  loginCancel &&
    loginCancel.addEventListener('click', () => hideModal(loginModal));

  btnLogout &&
    btnLogout.addEventListener('click', () => {
      currentUser = null;
      tasks = [];
      projects = [];
      activeProjectName = '';
      selectedTask = null;
      editingTask = null;
      layoutEditMode = false;
      layoutEditingProjectId = null;
      projectLayoutEditTargetId = null;

      if (who) who.textContent = '';
      if (contextInfo) contextInfo.textContent = 'All Projects';
      if (btnLogin) btnLogin.style.display = '';
      if (btnLogout) btnLogout.style.display = 'none';
      buildProjectSidebar();
      refreshAssigneeFilters();
      renderTasks();
      renderKanban();
      renderProjectStructure();
      refreshRoleUI();
    });

  loginOK &&
    loginOK.addEventListener('click', async () => {
      const staffId = ((loginId && loginId.value) || '').trim();
      const code = ((loginCode && loginCode.value) || '').trim();

      if (!staffId || !code) {
        toast('Enter StaffID and 4 digits');
        return;
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('staff_id', staffId)
        .eq('passcode', code)
        .limit(1);

      if (usersError) {
        console.error('Login error', usersError);
        toast('Login failed (check console)');
        return;
      }

      const user = usersData && usersData[0];
      if (!user) {
        toast('Invalid credentials');
        return;
      }

      currentUser = user;
      if (who) who.textContent = `${user.name} [${user.access_level || 'User'}]`;
      if (btnLogin) btnLogin.style.display = 'none';
      if (btnLogout) btnLogout.style.display = '';
      refreshRoleUI();

      hideModal(loginModal);
      await loadDataAfterLogin();
    });

  // ---------- LOAD DATA AFTER LOGIN ----------
  async function loadDataAfterLogin() {
    const { data: projData, error: projError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projError) {
      console.error('Projects error', projError);
      toast('Failed to load projects');
    } else {
      projects = projData || [];
    }

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .order('due', { ascending: true });

    if (taskError) {
      console.error('Tasks error', taskError);
      toast('Failed to load tasks');
    } else {
      tasks = taskData || [];
    }

    buildProjectSidebar();
    refreshAssigneeFilters();
    renderTasks();
    renderKanban();
    if (viewStages && viewStages.style.display !== 'none') {
      renderProjectStructure();
    }
    updateProjectStatusControl();
    refreshRoleUI();
  }

  // ---------- PROJECT TYPES (TEMPLATES) ----------
  async function loadProjectTypesIntoSelect(selectEl: HTMLSelectElement | null) {
    if (!selectEl) return;

    if (projectTypesCache && projectTypesCache.length) {
      selectEl.innerHTML = projectTypesCache
        .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
        .join('');
      return;
    }

    const { data, error } = await supabase
      .from('project_stage_templates')
      .select('project_type')
      .order('project_type', { ascending: true });

    if (error) {
      console.error('Load project types error', error);
      const fallback = [
        'Architecture',
        'Interior',
        'Landscape',
        'Masterplan',
        'Other',
      ];
      projectTypesCache = fallback;
      selectEl.innerHTML = fallback
        .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
        .join('');
      return;
    }

    const typesSet = new Set(
      (data || []).map((row: any) => row.project_type).filter(Boolean),
    );
    const types = Array.from(typesSet);

    if (!types.length) {
      const fallback = [
        'Architecture',
        'Interior',
        'Landscape',
        'Masterplan',
        'Other',
      ];
      projectTypesCache = fallback;
      selectEl.innerHTML = fallback
        .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
        .join('');
      return;
    }

    projectTypesCache = types;
    selectEl.innerHTML = types
      .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
      .join('');
  }

  // ---------- STAGE PLAN EDITOR ----------
  function renderStagePlanEditor(plan: any[], editor: HTMLElement | null) {
    if (!editor) return;

    let workingPlan: any[];
    if (!plan || !plan.length) {
      workingPlan = DEFAULT_STAGE_HIERARCHY.map((stageName) => ({
        stage: stageName,
        subs: [],
      }));
    } else {
      workingPlan = plan;
    }

    editor.innerHTML = workingPlan
      .map((st, idx) => {
        const subs = st.subs || [];
        const subsHtml = subs
          .map(
            (s: string, i: number) => `
            <div class="sub-row" data-sub-index="${i}">
              <input class="input sub-name" value="${esc(
                s,
              )}" placeholder="Sub-stage name">
              <button type="button" class="btn-sm sub-del">×</button>
            </div>
          `,
          )
          .join('');

        return `
          <div class="stage-row" data-index="${idx}">
            <div class="row" style="align-items:center;gap:6px">
              <input class="input stage-name" value="${esc(
                st.stage,
              )}" placeholder="Stage name">
              <button type="button" class="btn-sm stage-insert-below">+ Below</button>
              <button type="button" class="btn-sm stage-del">Remove</button>
            </div>
            <div class="sub-list" style="margin-left:16px;margin-top:4px">
              ${subsHtml}
              <button type="button" class="btn-sm sub-add">+ Sub-stage</button>
            </div>
          </div>
        `;
      })
      .join('');

    function wireStageRow(row: HTMLElement) {
      const subList = row.querySelector<HTMLElement>('.sub-list');
      const subAdd = row.querySelector<HTMLElement>('.sub-add');
      const stageDel = row.querySelector<HTMLElement>('.stage-del');
      const insertBelow = row.querySelector<HTMLElement>('.stage-insert-below');

      subAdd &&
        subAdd.addEventListener('click', () => {
          if (!subList) return;
          const div = document.createElement('div');
          div.className = 'sub-row';
          div.innerHTML = `
          <input class="input sub-name" placeholder="Sub-stage name">
          <button type="button" class="btn-sm sub-del">×</button>
        `;
          subList.insertBefore(div, subAdd);
          const delBtn = div.querySelector<HTMLElement>('.sub-del');
          delBtn &&
            delBtn.addEventListener('click', () => {
              div.remove();
            });
        });

      subList &&
        subList.querySelectorAll<HTMLElement>('.sub-del').forEach((btn) => {
          btn.addEventListener('click', () => {
            const parent = btn.closest('.sub-row');
            parent && parent.remove();
          });
        });

      stageDel &&
        stageDel.addEventListener('click', () => {
          row.remove();
        });

      insertBelow &&
        insertBelow.addEventListener('click', () => {
          const newRow = document.createElement('div');
          newRow.className = 'stage-row';
          newRow.innerHTML = `
          <div class="row" style="align-items:center;gap:6px">
            <input class="input stage-name" placeholder="Stage name">
            <button type="button" class="btn-sm stage-insert-below">+ Below</button>
            <button type="button" class="btn-sm stage-del">Remove</button>
          </div>
          <div class="sub-list" style="margin-left:16px;margin-top:4px">
            <button type="button" class="btn-sm sub-add">+ Sub-stage</button>
          </div>
        `;
          row.insertAdjacentElement('afterend', newRow);
          wireStageRow(newRow);
        });
    }

    editor.querySelectorAll<HTMLElement>('.stage-row').forEach((row) => {
      wireStageRow(row);
    });
  }

  function readStagePlanFromEditor(editor: HTMLElement | null) {
    if (!editor) return [];
    const stages: any[] = [];

    editor.querySelectorAll<HTMLElement>('.stage-row').forEach((row) => {
      const nameInput = row.querySelector<HTMLInputElement>('.stage-name');
      const stageName = ((nameInput && nameInput.value) || '').trim();
      if (!stageName) return;

      const subs: string[] = [];
      row.querySelectorAll<HTMLElement>('.sub-row').forEach((srow) => {
        const sinput = srow.querySelector<HTMLInputElement>('.sub-name');
        const subName = ((sinput && sinput.value) || '').trim();
        if (subName) subs.push(subName);
      });

      stages.push({ stage: stageName, subs });
    });

    return stages;
  }

  async function loadTemplateForType(
    typeKey: string,
    editor: HTMLElement | null,
  ) {
    if (!editor) return;

    if (!typeKey || typeKey === 'Other') {
      renderStagePlanEditor([], editor);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_stage_templates')
        .select('stage, substage')
        .eq('project_type', typeKey)
        .order('stage', { ascending: true })
        .order('substage', { ascending: true });

      if (error) {
        console.error('Template load error', error);
        toast('Could not load template; using empty layout.');
        renderStagePlanEditor([], editor);
        return;
      }

      if (!data || data.length === 0) {
        toast('No template for this type (using empty layout).');
        renderStagePlanEditor([], editor);
        return;
      }

      const grouped: Record<string, string[]> = {};
      data.forEach((row: any) => {
        const stName = row.stage || 'Stage';
        const subName = row.substage || '';
        if (!grouped[stName]) grouped[stName] = [];
        if (subName) grouped[stName].push(subName);
      });

      let plan = Object.entries(grouped).map(([stage, subs]) => ({
        stage,
        subs,
      }));

      plan.sort((a, b) => {
        const ua = (a.stage || '').toUpperCase();
        const ub = (b.stage || '').toUpperCase();
        const ia = STAGE_ORDER_MAP.has(ua) ? STAGE_ORDER_MAP.get(ua)! : 999;
        const ib = STAGE_ORDER_MAP.has(ub) ? STAGE_ORDER_MAP.get(ub)! : 999;
        if (ia !== ib) return ia - ib;
        return ua.localeCompare(ub);
      });

      renderStagePlanEditor(plan, editor);
    } catch (e) {
      console.error('Template load exception', e);
      toast('Could not load template; using empty layout.');
      renderStagePlanEditor([], editor);
    }
  }

  // ---------- NEW PROJECT MODAL ----------
  const projModal = el('projModal');
  const projModalTitle = el('projModalTitle');
  const btnNewProject = el('btnNewProject');
  const pName = el('pName') as HTMLInputElement | null;
  const pType = el('pType') as HTMLSelectElement | null;
  const pLeadBox = el('pLeadBox');
  const projCancel = el('projCancel');
  const projOK = el('projOK');
  const btnLoadTemplate = el('btnLoadTemplate');
  const stagePlanEditor = el('stagePlanEditor');
  const btnAddStage = el('btnAddStage');

  btnNewProject &&
    btnNewProject.addEventListener('click', async () => {
      if (!currentUser) {
        toast('Please login first');
        return;
      }
      if (!isAdmin()) {
        toast('Only Admin can create projects');
        return;
      }

      projectLayoutEditTargetId = null;
      if (projModalTitle) projModalTitle.textContent = 'New Project';

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Load users for project leads failed', error);
        toast('Could not load users');
      } else if (pLeadBox) {
        pLeadBox.innerHTML = (users || [])
          .map(
            (u: any) => `
              <label class="chk-line">
                <input type="checkbox"
                       value="${esc(u.staff_id)}"
                       data-name="${esc(u.name || '')}">
                <span>${esc(u.name || '')} [${esc(u.staff_id)}]</span>
              </label>
            `,
          )
          .join('');
      }

      if (pType) {
        await loadProjectTypesIntoSelect(pType);
      }

      if (pName) pName.value = '';
      if (stagePlanEditor) renderStagePlanEditor([], stagePlanEditor);

      showModal(projModal);
    });

  projCancel &&
    projCancel.addEventListener('click', () => {
      hideModal(projModal);
      projectLayoutEditTargetId = null;
    });

  btnLoadTemplate &&
    btnLoadTemplate.addEventListener('click', async () => {
      if (!pType) return;
      const typeKey = pType.value;
      await loadTemplateForType(typeKey, stagePlanEditor);
    });

  btnAddStage &&
    btnAddStage.addEventListener('click', () => {
      if (!stagePlanEditor) return;

      if (!stagePlanEditor.querySelector('.stage-row')) {
        stagePlanEditor.innerHTML = '';
      }

      const div = document.createElement('div');
      div.className = 'stage-row';
      div.innerHTML = `
      <div class="row" style="align-items:center;gap:6px">
        <input class="input stage-name" placeholder="Stage name">
        <button type="button" class="btn-sm stage-del">Remove</button>
      </div>
      <div class="sub-list" style="margin-left:16px;margin-top:4px">
        <button type="button" class="btn-sm sub-add">+ Sub-stage</button>
      </div>
    `;
      stagePlanEditor.appendChild(div);

      const subList = div.querySelector<HTMLElement>('.sub-list');
      const subAdd = div.querySelector<HTMLElement>('.sub-add');
      const stageDel = div.querySelector<HTMLElement>('.stage-del');

      subAdd &&
        subAdd.addEventListener('click', () => {
          if (!subList) return;
          const sdiv = document.createElement('div');
          sdiv.className = 'sub-row';
          sdiv.innerHTML = `
        <input class="input sub-name" placeholder="Sub-stage name">
        <button type="button" class="btn-sm sub-del">×</button>
      `;
          subList.insertBefore(sdiv, subAdd);
          const delBtn = sdiv.querySelector<HTMLElement>('.sub-del');
          delBtn && delBtn.addEventListener('click', () => sdiv.remove());
        });

      stageDel &&
        stageDel.addEventListener('click', () => {
          div.remove();
        });
    });

  projOK &&
    projOK.addEventListener('click', async () => {
      if (!pName || !pType || !pLeadBox) return;

      const name = pName.value.trim();
      const type = pType.value || null;
      const lead_ids = pLeadBox
        ? Array.from(
            pLeadBox.querySelectorAll<HTMLInputElement>(
              'input[type="checkbox"]:checked',
            ),
          ).map((cb) => cb.value)
        : [];

      if (!name) {
        toast('Project name is required');
        return;
      }
      if (!type) {
        toast('Project type is required');
        return;
      }
      if (!lead_ids.length) {
        toast('Select at least one lead');
        return;
      }

      const stage_plan = readStagePlanFromEditor(stagePlanEditor);

      if (projectLayoutEditTargetId) {
        const { error } = await supabase
          .from('projects')
          .update({
            name,
            type,
            lead_ids,
            stage_plan,
          })
          .eq('id', projectLayoutEditTargetId);

        if (error) {
          console.error('Update project layout error', error);
          toast('Failed to update project');
          return;
        }

        toast('Project updated');
      } else {
        const { error } = await supabase.from('projects').insert([
          {
            name,
            type,
            lead_ids,
            stage_plan,
          },
        ]);

        if (error) {
          console.error('Create project error', error);
          toast('Failed to create project');
          return;
        }

        toast('Project created');
      }

      hideModal(projModal);
      projectLayoutEditTargetId = null;
      await loadDataAfterLogin();
    });

  // ---------- TASK MODAL ----------
  const taskModal = el('taskModal');
  const taskModalTitle = el('taskModalTitle');
  const btnNewTask = el('btnNewTask');
  const tProject = el('tProject') as HTMLSelectElement | null;
  const tStage = el('tStage') as HTMLSelectElement | null;
  const tSub = el('tSub') as HTMLSelectElement | null;
  const tDue = el('tDue') as HTMLInputElement | null;
  const tPriority = el('tPriority') as HTMLSelectElement | null;
  const tDesc = el('tDesc') as HTMLInputElement | null;
  const assigneesBox = el('assigneesBox');
  const taskCancel = el('taskCancel');
  const taskOK = el('taskOK');

  async function loadStageAndSubOptionsForProject(projectId: string | null) {
    if (!tStage || !tSub) return;

    if (!projectId) {
      tStage.innerHTML = `<option value="">General</option>`;
      tSub.innerHTML = `<option value="">General</option>`;
      return;
    }

    const proj = projects.find((p) => p.id === projectId);
    const plan = (proj && proj.stage_plan) || [];

    if (!plan.length) {
      tStage.innerHTML = `<option value="">General</option>`;
      tSub.innerHTML = `<option value="">General</option>`;
      return;
    }

    const stages = plan.map((s: any) => s.stage || s.name).filter((s: any) => !!s);
    tStage.innerHTML = stages
      .map((st: string) => `<option value="${esc(st)}">${esc(st)}</option>`)
      .join('');

    const first = plan[0];
    const subs = (first.subs || first.sub_stages || []).filter((x: any) => !!x);
    if (!subs.length) {
      tSub.innerHTML = `<option value="">General</option>`;
    } else {
      tSub.innerHTML = subs
        .map((sb: string) => `<option value="${esc(sb)}">${esc(sb)}</option>`)
        .join('');
    }

    tStage.onchange = () => {
      const val = tStage.value;
      const chosen = plan.find(
        (s: any) => (s.stage || s.name) === val,
      );
      const subs2 =
        (chosen && (chosen.subs || chosen.sub_stages) || []).filter(
          (x: any) => !!x,
        );
      if (!subs2.length) {
        tSub.innerHTML = `<option value="">General</option>`;
      } else {
        tSub.innerHTML = subs2
          .map((sb: string) => `<option value="${esc(sb)}">${esc(sb)}</option>`)
          .join('');
      }
    };
  }

  async function openTaskModal(taskToEdit: any | null) {
    if (!currentUser) {
      toast('Please login first');
      return;
    }

    editingTask = taskToEdit || null;

    if (taskModalTitle) {
      taskModalTitle.textContent = editingTask ? 'Edit Task' : 'New Task';
    }

    // Build project list according to role
    if (tProject) {
      const isEdit = !!taskToEdit;

      let availableProjects: any[];
      if (isEdit) {
        availableProjects = projects;
      } else if (isAdmin()) {
        availableProjects = projects;
      } else {
        availableProjects = projects.filter((p) =>
          (p.lead_ids || []).includes(currentUser.staff_id),
        );
      }

      if (!isEdit && (!availableProjects || !availableProjects.length)) {
        toast('Only Admin or project leads can create tasks');
        return;
      }

      tProject.innerHTML = (availableProjects || [])
        .map(
          (p: any) =>
            `<option value="${esc(p.id)}">${esc(p.name)}</option>`,
        )
        .join('');
    }

    let initialProjectId: string | null = null;
    if (editingTask && editingTask.project_id) {
      initialProjectId = editingTask.project_id;
    } else if (projects.length) {
      initialProjectId = projects[0].id;
    }
    if (tProject && initialProjectId) {
      tProject.value = initialProjectId;
    }

    await loadStageAndSubOptionsForProject(initialProjectId);

    if (assigneesBox) {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Load users for assignees failed', error);
        toast('Could not load users');
      } else {
        assigneesBox.innerHTML = (users || [])
          .map(
            (u: any) => `
              <label class="chk-line">
                <input type="checkbox"
                       value="${esc(u.staff_id)}"
                       data-name="${esc(u.name || '')}">
                <span>${esc(u.name || '')} [${esc(u.staff_id)}]</span>
              </label>
            `,
          )
          .join('');

        if (editingTask && editingTask.assignee_ids) {
          const ids = new Set(editingTask.assignee_ids);
          assigneesBox
            .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
            .forEach((cb) => {
              if (ids.has(cb.value)) cb.checked = true;
            });
        }
      }
    }

    if (tProject) {
      tProject.onchange = async () => {
        const projId = tProject.value || null;
        await loadStageAndSubOptionsForProject(projId);
      };
    }

    // Editing case: permission & prefill
    if (editingTask) {
      const project = projects.find((p) => p.id === editingTask.project_id);

      const canEditTask =
        isAdmin() ||
        editingTask.created_by_id === currentUser?.staff_id ||
        isProjectLeadFor(project);

      if (!canEditTask) {
        toast('You do not have permission to modify this task.');
        editingTask = null;
        return;
      }

      // Select correct project
      if (tProject && editingTask.project_id) {
        tProject.value = String(editingTask.project_id);
        await loadStageAndSubOptionsForProject(editingTask.project_id);
      }

      // Prefill
      if (tStage && editingTask.stage_id) tStage.value = editingTask.stage_id;
      if (tSub && editingTask.sub_id) tSub.value = editingTask.sub_id;
      if (tDue && editingTask.due)
        tDue.value = String(editingTask.due).slice(0, 10);
      if (tPriority && editingTask.priority)
        tPriority.value = editingTask.priority;
      if (tDesc && editingTask.task) tDesc.value = editingTask.task;
    } else {
      // New task defaults
      if (tDue) tDue.value = '';
      if (tPriority) tPriority.value = 'Medium';
      if (tDesc) tDesc.value = '';
    }

    showModal(taskModal);
  }

  btnNewTask &&
    btnNewTask.addEventListener('click', () => {
      if (!currentUser) {
        toast('Please login first');
        return;
      }

      if (isDesigner()) {
        toast('Designers are not allowed to create tasks.');
        return;
      }

      // Admins -> always
      if (isAdmin()) {
        openTaskModal(null);
        return;
      }

      // Non-admins -> must be lead on at least one project
      const leadProjects = projects.filter((p) =>
        (p.lead_ids || []).includes(currentUser.staff_id),
      );

      if (leadProjects.length === 0) {
        toast('Only Admins or Project Leads can create tasks');
        return;
      }

      openTaskModal(null);
    });

  taskCancel &&
    taskCancel.addEventListener('click', () => {
      hideModal(taskModal);
      editingTask = null;
    });

  taskOK &&
    taskOK.addEventListener('click', async () => {
      if (isDesigner()) {
        toast('Designers cannot create tasks.');
        return;
      }

      // Team Lead can only create tasks for projects they lead
      if (isTeamLead() && tProject) {
        const projId = tProject.value;
        const project = projects.find((p) => p.id === projId);

        if (!project || !isProjectLeadFor(project)) {
          toast('You can create tasks only for your own projects.');
          return;
        }
      }

      if (!tProject || !tDue || !tPriority || !tDesc) return;
      if (!currentUser) {
        toast('Please login first');
        return;
      }

      const projectId = tProject.value;
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        toast('Select a project');
        return;
      }

      const title = tDesc.value.trim();
      if (!title) {
        toast('Enter a task description');
        return;
      }

      const due = tDue.value || null;
      const priority = tPriority.value || 'Medium';

      const checked = assigneesBox
        ? Array.from(
            assigneesBox.querySelectorAll<HTMLInputElement>(
              'input[type="checkbox"]:checked',
            ),
          )
        : [];

      let assignee_ids = checked.map((c) => c.value);
      let assignees = checked.map(
        (c) => c.getAttribute('data-name') || c.value,
      );

      const isLeadForProject = isProjectLeadFor(project, currentUser);

      if (isAdmin()) {
        // keep as-is
      } else if (isLeadForProject) {
        // keep as-is
      } else {
        // Designer / others: force self
        assignee_ids = [currentUser.staff_id];
        assignees = [currentUser.name || currentUser.staff_id];
      }

      const payload: any = {
        project_id: project.id,
        project_name: project.name,
        stage_id: (tStage && tStage.value) || null,
        sub_id: (tSub && tSub.value) || null,
        task: title,
        description: '',
        due,
        priority,
        status: editingTask ? editingTask.status || 'Pending' : 'Pending',
        assignee_ids,
        assignees,
      };

      if (editingTask) {
        let canEdit = false;
        if (currentUser) {
          if (isAdmin()) {
            canEdit = true;
          } else if (editingTask.created_by_id === currentUser.staff_id) {
            canEdit = true;
          } else {
            const projForTask = projects.find(
              (p) => p.id === editingTask.project_id,
            );
            if (projForTask && isProjectLeadFor(projForTask, currentUser)) {
              canEdit = true;
            }
          }
        }

        if (!canEdit) {
          toast('Only creator, Admin or project lead can edit this task');
          return;
        }

        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', editingTask.id);

        if (error) {
          console.error('Update task error', error);
          toast('Failed to update task');
          return;
        }

        hideModal(taskModal);
        editingTask = null;
        toast('Task updated');
      } else {
        const { error } = await supabase.from('tasks').insert([
          {
            ...payload,
            created_by_id: currentUser ? currentUser.staff_id : null,
            created_by_name: currentUser ? currentUser.name : null,
          },
        ]);

        if (error) {
          console.error('Create task error', error);
          toast('Failed to create task');
          return;
        }

        hideModal(taskModal);
        toast('Task created');
      }

      await loadDataAfterLogin();
    });

  // ---------- ADD USER MODAL ----------
  const userModal = el('userModal');
  const btnAddUser = el('btnAddUser');
  const uName = el('uName') as HTMLInputElement | null;
  const uLevel = el('uLevel') as HTMLSelectElement | null;
  const uEmail = el('uEmail') as HTMLInputElement | null;
  const userCancel = el('userCancel');
  const userOK = el('userOK');

  btnAddUser &&
    btnAddUser.addEventListener('click', () => {
      if (!currentUser) {
        toast('Please login first');
        return;
      }
      if (!isAdmin()) {
        toast('Only Admin can add users');
        return;
      }
      if (uName) uName.value = '';
      if (uEmail) uEmail.value = '';
      if (uLevel) uLevel.value = 'Designer';
      showModal(userModal);
    });

  userCancel &&
    userCancel.addEventListener('click', () => hideModal(userModal));

  userOK &&
  userOK.addEventListener('click', async () => {
    if (!uName || !uLevel || !uEmail) return;

    const name = uName.value.trim();
    const email = uEmail.value.trim();
    const level = uLevel.value || 'Designer';

    if (!name || !email) {
      toast('Name and email are required');
      return;
    }

    // ------------------ GENERATE DC-ID ------------------
    const { data: nextId, error: idErr } = await supabase.rpc('get_next_dc_id');
    if (idErr || !nextId) {
      console.error('get_next_dc_id error:', idErr);
      toast('Failed to generate user ID');
      return;
    }
    const staffId = nextId as string;   // Example: DC07
    // ---------------------------------------------------

    const passcode = String(Math.floor(1000 + Math.random() * 9000));

    const { error } = await supabase.from('users').insert([
      {
        staff_id: staffId,
        name,
        email,
        access_level: level,
        passcode,
      },
    ]);

    if (error) {
      console.error('Create user error', error);
      toast('Failed to create user');
      return;
    }

    // ---------- CALL EDGE FUNCTION TO SEND EMAIL ----------
    try {
      const { data: fnData, error: fnError } =
        await supabase.functions.invoke('send-user-invite', {
          body: {
            name,
            email,
            staff_id: staffId,
            passcode,
          },
        });

      console.log('send-user-invite result', { fnData, fnError });

      if (fnError) {
        console.error('send-user-invite error:', fnError);
        // Don’t block on email failure
      }
    } catch (fnErr) {
      console.error('send-user-invite exception:', fnErr);
      // Optional: toast('User created, but failed to send email');
    }

    hideModal(userModal);
    toast(`User created. StaffID: ${staffId}, PIN: ${passcode}`);
  });

  // ---------- STATUS / RESCHEDULE / COMPLETE / HISTORY ----------
  const resModal = el('resModal');
  const resDate = el('resDate') as HTMLInputElement | null;
  const resRemark = el('resRemark') as HTMLInputElement | null;
  const resCancel = el('resCancel');
  const resOK = el('resOK');

  const doneModal = el('doneModal');
  const doneRemark = el('doneRemark') as HTMLInputElement | null;
  const doneCancel = el('doneCancel');
  const doneOK = el('doneOK');

  const statusModal = el('statusModal');
  const stSel = el('stSel') as HTMLSelectElement | null;
  const stNote = el('stNote') as HTMLTextAreaElement | null;
  const stCancel = el('stCancel');
  const stOK = el('stOK');

  const historyModal = el('historyModal');
  const historyBody = el('historyBody');
  const historyClose = el('historyClose');

  const tasksBody = el('tasksBody');

  async function loadHistoryForTask(task: any) {
    if (!historyBody) return;
    historyBody.innerHTML = '<div class="small muted">Loading…</div>';

    const { data, error } = await supabase
      .from('task_status_log')
      .select('*')
      .eq('task_id', task.id)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Load history error', error);
      historyBody.innerHTML =
        '<div class="small muted">Could not load history.</div>';
      return;
    }

    if (!data || data.length === 0) {
      historyBody.innerHTML =
        '<div class="small muted">No history yet for this task.</div>';
      return;
    }

    historyBody.innerHTML = (data || [])
      .map((row: any) => {
        const ts = row.changed_at
          ? new Date(row.changed_at).toLocaleString()
          : '';
        const actor = row.changed_by_name || row.changed_by_id || 'Unknown';
        const from = row.from_status || '-';
        const to = row.to_status || '-';
        const note = row.note || '';

        return `
          <div class="history-item">
            <div class="small muted">${esc(ts)} — ${esc(actor)}</div>
            <div><strong>${esc(row.action || '')}</strong> ${esc(
          from,
        )} → ${esc(to)}</div>
            ${
              note
                ? `<div class="small">${esc(note)}</div>`
                : ''
            }
          </div>
        `;
      })
      .join('');
  }

  historyClose &&
    historyClose.addEventListener('click', () => hideModal(historyModal));

  tasksBody &&
    tasksBody.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement;
      if (!target) return;

      const id = target.getAttribute('data-id');
      if (!id) return;

      const task = tasks.find((t) => String(t.id) === String(id));
      if (!task) return;

      if (!currentUser) {
        toast('Please login first');
        return;
      }

      selectedTask = task;

      if (target.classList.contains('act-reschedule')) {
        if (resDate)
          resDate.value = task.due ? String(task.due).slice(0, 10) : '';
        if (resRemark) resRemark.value = task.reschedule_remarks || '';
        showModal(resModal);
      } else if (target.classList.contains('act-complete')) {
        if (doneRemark) doneRemark.value = task.completion_remarks || '';
        showModal(doneModal);
      } else if (target.classList.contains('act-status')) {
        if (stSel) stSel.value = task.status || 'Pending';
        if (stNote) stNote.value = task.current_status || '';
        showModal(statusModal);
      } else if (target.classList.contains('act-edit')) {
        if (!currentUser) {
          toast('Please login first');
          return;
        }

        const projForTask = projects.find((p) => p.id === task.project_id);

        const canEdit =
          isAdmin() ||
          task.created_by_id === currentUser.staff_id ||
          (projForTask && isProjectLeadFor(projForTask, currentUser));

        if (!canEdit) {
          toast('Only creator, Admin or project lead can edit this task');
          return;
        }

        openTaskModal(task);
      } else if (target.classList.contains('act-history')) {
        loadHistoryForTask(task);
        showModal(historyModal);
      }
    });

  // Reschedule
  resCancel &&
    resCancel.addEventListener('click', () => hideModal(resModal));
  resOK &&
    resOK.addEventListener('click', async () => {
      if (!selectedTask || !resDate) return;

      const newDue = resDate.value;
      if (!newDue) {
        toast('Pick a new due date');
        return;
      }

      const remark = resRemark ? resRemark.value.trim() : '';
      const prevStatus = selectedTask.status || 'Pending';

      const { error } = await supabase
        .from('tasks')
        .update({
          due: newDue,
          reschedule_remarks: remark || null,
        })
        .eq('id', selectedTask.id);

      if (error) {
        console.error('Reschedule error', error);
        toast('Failed to reschedule');
        return;
      }

      await supabase.from('task_status_log').insert([
        {
          task_id: selectedTask.id,
          action: 'reschedule',
          from_status: prevStatus,
          to_status: prevStatus,
          note: `New due: ${newDue}${remark ? ' — ' + remark : ''}`,
          changed_by_id: currentUser ? currentUser.staff_id : null,
          changed_by_name: currentUser ? currentUser.name : null,
        },
      ]);

      hideModal(resModal);
      toast('Task rescheduled');
      await loadDataAfterLogin();
    });

  // Complete
  doneCancel &&
    doneCancel.addEventListener('click', () => hideModal(doneModal));
  doneOK &&
    doneOK.addEventListener('click', async () => {
      if (!selectedTask) return;

      if (!isAssignee(selectedTask)) {
        toast('Only assignees can complete this task');
        return;
      }

      const remark = doneRemark ? doneRemark.value.trim() : '';
      const prevStatus = selectedTask.status || 'Pending';

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'Complete',
          completion_remarks: remark || null,
          completed_at: new Date().toISOString(),
          completed_by: currentUser
            ? currentUser.name || currentUser.staff_id
            : null,
        })
        .eq('id', selectedTask.id);

      if (error) {
        console.error('Complete task error', error);
        toast('Failed to complete task');
        return;
      }

      await supabase.from('task_status_log').insert([
        {
          task_id: selectedTask.id,
          action: 'complete',
          from_status: prevStatus,
          to_status: 'Complete',
          note: remark || null,
          changed_by_id: currentUser ? currentUser.staff_id : null,
          changed_by_name: currentUser ? currentUser.name : null,
        },
      ]);

      hideModal(doneModal);
      toast('Task marked complete');
      await loadDataAfterLogin();
    });

  // Status update
  stCancel &&
    stCancel.addEventListener('click', () => hideModal(statusModal));
  stOK &&
    stOK.addEventListener('click', async () => {
      if (!selectedTask || !stSel) return;
      if (!isAssignee(selectedTask)) {
        toast('Only assignees can update status');
        return;
      }

      const newStatus = stSel.value || 'Pending';
      const note = stNote ? stNote.value.trim() : '';
      const prevStatus = selectedTask.status || 'Pending';

      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          current_status: note || null,
        })
        .eq('id', selectedTask.id);

      if (error) {
        console.error('Status update error', error);
        toast('Failed to update status');
        return;
      }

      await supabase.from('task_status_log').insert([
        {
          task_id: selectedTask.id,
          action: 'status_change',
          from_status: prevStatus,
          to_status: newStatus,
          note: note || null,
          changed_by_id: currentUser ? currentUser.staff_id : null,
          changed_by_name: currentUser ? currentUser.name : null,
        },
      ]);

      hideModal(statusModal);
      toast('Status updated');
      await loadDataAfterLogin();
    });

  // ---------- PROJECT STRUCTURE TAB ----------
  const stagesBox = el('stagesBox');
  const layoutActions = el('layoutActions');
  const btnEditLayout = el('btnEditLayout');
  const btnBulkAssign = el('btnBulkAssign');

  // Per-substage assign UI (uses projectUsersCache)
  function wireSubstageAssignUI(proj: any) {
    if (!proj) return;

    const panel = el('stAssignPanel');
    if (!panel) return;

    const stageSel = el('stAssignStageSel') as HTMLSelectElement | null;
    const subSel = el('stAssignSubSel') as HTMLSelectElement | null;
    const assignList = el('stAssignUserMulti');
    const assignBtn = el('stAssignBtn');
    const closeBtn = el('stAssignClose');

    let selectedExistingTask: any = null;

    // Expose function on window for stage/sub rows
    (window as any).openSubstageAssign = async (
      stageName: string,
      subName: string,
      existingTaskId?: string,
    ) => {
      if (!projectUsersCache[proj.id]) {
        await loadProjectUsers(proj.id);
      }

      selectedExistingTask = null;

      if (stageSel) stageSel.value = stageName || '';
      if (subSel) subSel.value = subName || '';

      if (assignList) assignList.innerHTML = '';

      if (assignList && projectUsersCache[proj.id]) {
        projectUsersCache[proj.id].forEach((u) => {
          assignList.innerHTML += `
            <label class="chk-line">
              <input type="checkbox" class="asgU" value="${esc(
                u.staff_id,
              )}" data-name="${esc(u.name || '')}">
              <span>${esc(u.name || '')} [${esc(u.staff_id)}]</span>
            </label>
          `;
        });
      }

      if (existingTaskId) {
        const existingTask = tasks.find(
          (t) => String(t.id) === String(existingTaskId),
        );

        if (existingTask) {
          selectedExistingTask = existingTask;

          const ids = existingTask.assignee_ids || [];
          assignList
            ?.querySelectorAll<HTMLInputElement>('.asgU')
            .forEach((chk) => {
              if (ids.includes(chk.value)) chk.checked = true;
            });

          if (assignBtn) assignBtn.textContent = 'Update Task';
        }
      } else {
        if (assignBtn) assignBtn.textContent = 'Create Task';
      }

      panel.classList.add('show');
    };

    closeBtn &&
      closeBtn.addEventListener('click', () => {
        panel.classList.remove('show');
      });

    assignBtn &&
      assignBtn.addEventListener('click', async () => {
        if (!currentUser) {
          toast('Please login first');
          return;
        }

        const stageName = stageSel?.value || '';
        const subName = subSel?.value || '';

        if (!canEditProjectLayout(proj)) {
          toast('Only project leads or admins can assign/edit tasks here');
          return;
        }

        const chosen = assignList
          ? Array.from(
              assignList.querySelectorAll<HTMLInputElement>('.asgU:checked'),
            )
          : [];

        const assignee_ids = chosen.map((c) => c.value);
        const assignees = chosen.map(
          (c) => c.getAttribute('data-name') || c.value,
        );

        if (!assignee_ids.length) {
          toast('Select at least one assignee');
          return;
        }

        if (selectedExistingTask) {
          const old = selectedExistingTask;

          const { error } = await supabase
            .from('tasks')
            .update({
              assignee_ids,
              assignees,
            })
            .eq('id', old.id);

          if (error) {
            console.error('Update error', error);
            toast('Failed to update task');
            return;
          }

          toast('Task updated');
        } else {
          const title = `${stageName} - ${subName}`;

          const { error } = await supabase.from('tasks').insert([
            {
              project_id: proj.id,
              project_name: proj.name,
              stage_id: stageName,
              sub_id: subName,
              task: title,
              description: '',
              due: null,
              priority: 'Medium',
              status: 'Pending',
              assignee_ids,
              assignees,
              created_by_id: currentUser.staff_id,
              created_by_name: currentUser.name,
            },
          ]);

          if (error) {
            console.error('Insert error', error);
            toast('Failed to create task');
            return;
          }

          toast('Task created');
        }

        panel.classList.remove('show');
        await loadDataAfterLogin();
      });
  }

  function renderProjectStructure() {
    if (!stagesBox) return;

    const isAllProjects = !activeProjectName;
    const proj = isAllProjects
      ? null
      : projects.find((p) => p.name === activeProjectName) || null;

    // ALL PROJECTS VIEW (status manager)
    if (isAllProjects) {
      if (layoutActions) layoutActions.style.display = 'none';

      const sorted = [...projects].sort((a, b) =>
        (a.name || '').localeCompare(b.name || ''),
      );

      stagesBox.innerHTML = `
        <div class="card" style="margin-bottom:8px;">
          <div class="row" style="align-items:center;gap:8px;">
            <div class="small muted">All Projects — Set status</div>
            <div style="flex:1;"></div>
            <input
              id="projStatusFilter"
              class="input"
              placeholder="Filter projects..."
              style="max-width:260px;"
            />
          </div>
        </div>
        <div id="projStatusList">
          ${sorted
            .map((p) => {
              const rawStatus = p.project_status || p.status || 'Ongoing';
              const status = ['Ongoing', 'On Hold', 'Complete'].includes(
                rawStatus,
              )
                ? rawStatus
                : 'Ongoing';

              return `
                <div class="card proj-status-row" data-name="${esc(
                  (p.name || '').toLowerCase(),
                )}" data-id="${esc(p.id)}" style="margin-bottom:6px;">
                  <div class="row" style="align-items:center;gap:10px;">
                    <div style="flex:1;">
                      <div><strong>${esc(p.name || '')}</strong></div>
                      <div class="small muted">
                        Type: ${esc(p.type || '–')}
                      </div>
                    </div>
                    <div>
                      <label class="small muted" style="margin-right:4px;">Status</label>
                      <select class="select proj-status-control">
                        <option value="Ongoing" ${
                          status === 'Ongoing' ? 'selected' : ''
                        }>Ongoing</option>
                        <option value="On Hold" ${
                          status === 'On Hold' ? 'selected' : ''
                        }>On Hold</option>
                        <option value="Complete" ${
                          status === 'Complete' ? 'selected' : ''
                        }>Complete</option>
                      </select>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;

      const filterInput =
        stagesBox.querySelector<HTMLInputElement>('#projStatusFilter');
      const rows =
        stagesBox.querySelectorAll<HTMLElement>('.proj-status-row');

      if (filterInput) {
        filterInput.addEventListener('input', () => {
          const q = filterInput.value.toLowerCase().trim();
          rows.forEach((row) => {
            const name = row.getAttribute('data-name') || '';
            row.style.display = !q || name.includes(q) ? '' : 'none';
          });
        });
      }

      stagesBox
        .querySelectorAll<HTMLSelectElement>('.proj-status-control')
        .forEach((sel) => {
          sel.addEventListener('change', async (ev) => {
            const selectEl = ev.target as HTMLSelectElement;
            const rowEl = selectEl.closest(
              '.proj-status-row',
            ) as HTMLElement | null;
            if (!rowEl) return;
            const projId = rowEl.getAttribute('data-id');
            const newStatus = selectEl.value;

            if (!projId) return;

            try {
              const { error } = await supabase
                .from('projects')
                .update({ project_status: newStatus })
                .eq('id', projId);

              if (error) {
                console.error('Failed to update project status', error);
                toast('Failed to update project status');
              } else {
                const p = projects.find((p) => p.id === projId);
                if (p) {
                  p.project_status = newStatus;
                }
                toast('Project status updated');
              }
            } catch (e) {
              console.error('Exception updating project status', e);
              toast('Failed to update project status');
            }
          });
        });

      return;
    }

    // SINGLE PROJECT VIEW
    if (!proj) {
      stagesBox.innerHTML = `
        <div class="small muted">
          Select a project from the left to see its stage layout.
        </div>
      `;
      if (layoutActions) layoutActions.style.display = 'none';
      return;
    }

    const canEdit = canEditProjectLayout(proj);
    if (layoutActions) {
      layoutActions.style.display = canEdit ? '' : 'none';
    }

    if (!layoutEditMode) {
      const planRaw = proj.stage_plan || [];
      const planArray = Array.isArray(planRaw)
        ? planRaw
        : typeof planRaw === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(planRaw);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              console.warn('Invalid stage_plan JSON for project', proj.id);
              return [];
            }
          })()
        : [];

      if (!planArray.length) {
        stagesBox.innerHTML = `
          <div class="small muted">
            No stage plan defined for this project yet.
            ${canEdit ? 'Click "✎ Edit Layout" to define one.' : ''}
          </div>
        `;
        if (btnEditLayout) btnEditLayout.textContent = '✎ Edit Layout';
        if (btnBulkAssign) {
          btnBulkAssign.textContent = 'Bulk Assign Tasks';
          btnBulkAssign.style.display = canEdit ? '' : 'none';
        }
        return;
      }

      const html = planArray
        .map((s: any) => {
          const stName = s.stage || s.name || 'Stage';
          const subs = s.subs || s.sub_stages || [];

          const subsHtml = subs.length
            ? `<ul class="small sub-list-ui" style="margin-top:4px;padding-left:16px;">
                ${subs
                  .map((sb: string) => {
                    const stageName = stName;
                    const subName = sb;

                    const matching = tasks.filter(
                      (t) =>
                        t.project_id === proj.id &&
                        (t.stage_id || '') === stageName &&
                        (t.sub_id || '') === subName &&
                        userCanSeeTask(t),
                    );
                    const nonCompleted = matching.filter(
                      (t) => t.status !== 'Complete',
                    );
                    const primary = nonCompleted[0] || matching[0] || null;

                    const hasTaskAttr = primary
                      ? `data-has-task="1" data-task-id="${esc(primary.id)}"`
                      : `data-has-task="0"`;

                    const isDone = primary && primary.status === 'Complete';

                    const assignedSummary = primary
                      ? `<div class="small muted">
                           ${
                             isDone
                               ? '<span class="tick-done" style="color:#16a34a;font-weight:700;font-size:14px;margin-right:4px;">✔</span>'
                               : ''
                           }
                           <strong>${esc(primary.task || '')}</strong>
                           ${
                             (primary.assignees || []).length
                               ? ' — <span class="assignee-label">' +
                                 esc(
                                   (primary.assignees || []).join(', '),
                                 ) +
                                 '</span>'
                               : ' — <span class="assignee-label assignee-unassigned">Unassigned</span>'
                           }
                           ${
                             primary.due
                               ? ' · Due ' + esc(formatDate(primary.due))
                               : ''
                           }
                           ${primary.status ? ' · ' + esc(primary.status) : ''}
                         </div>`
                      : '';

                    const buttonLabel = primary ? 'Modify Task' : 'Assign Task';

                    return `
                      <li class="sub-item"
                          data-stage="${esc(stageName)}"
                          data-sub="${esc(subName)}"
                          ${hasTaskAttr}>
                        <div class="sub-main-row" style="display:flex;align-items:center;gap:6px;justify-content:space-between;">
                          <span>${esc(subName)}</span>
                          <button type="button"
                                  class="btn-sm sub-assign"
                                  onclick="openSubstageAssign('${esc(
                                    stageName,
                                  )}','${esc(subName)}',${
                      primary ? `'${esc(primary.id)}'` : 'null'
                    })">
                            ${esc(buttonLabel)}
                          </button>
                        </div>
                        ${assignedSummary}
                      </li>
                    `;
                  })
                  .join('')}
              </ul>`
            : `<div class="small muted" style="margin-top:4px">No sub-stages</div>`;

          return `
            <div class="card" style="margin-bottom:8px">
              <div><strong>${esc(stName)}</strong></div>
              ${subsHtml}
            </div>
          `;
        })
        .join('');

      stagesBox.innerHTML =
        html || '<div class="small muted">No stages.</div>';

      if (btnEditLayout) btnEditLayout.textContent = '✎ Edit Layout';
      if (btnBulkAssign) {
        btnBulkAssign.textContent = 'Bulk Assign Tasks';
        btnBulkAssign.style.display = canEdit ? '' : 'none';
      }

      wireSubstageAssignUI(proj);
    } else {
      const planRaw = proj.stage_plan || [];
      const planArray = Array.isArray(planRaw)
        ? planRaw
        : typeof planRaw === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(planRaw);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              console.warn(
                'Invalid stage_plan JSON for project (edit mode)',
                proj.id,
              );
              return [];
            }
          })()
        : [];

      const normalizedPlan = planArray.map((s: any) => ({
        stage: s.stage || s.name || '',
        subs: s.subs || s.sub_stages || [],
      }));

      renderStagePlanEditor(normalizedPlan, stagesBox);
      if (btnEditLayout) btnEditLayout.textContent = '💾 Save Layout';
      if (btnBulkAssign) {
        btnBulkAssign.textContent = 'Cancel Edit';
        btnBulkAssign.style.display = '';
      }
    }
  }

  btnEditLayout &&
    btnEditLayout.addEventListener('click', async () => {
      const proj = activeProjectName
        ? projects.find((p) => p.name === activeProjectName)
        : null;
      if (!proj) {
        toast('Select a project first');
        return;
      }
      if (!canEditProjectLayout(proj)) {
        toast('Only leads or Admin can edit layout');
        return;
      }

      if (!layoutEditMode) {
        layoutEditMode = true;
        layoutEditingProjectId = proj.id;
        if (projModalTitle) projModalTitle.textContent = 'Edit Project Layout';
        projectLayoutEditTargetId = proj.id;

        if (pName) pName.value = proj.name || '';
        if (pType) {
          await loadProjectTypesIntoSelect(pType);
          pType.value = proj.type || '';
        }
        if (pLeadBox) {
          const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });

          if (!error && users) {
            const leadSet = new Set(proj.lead_ids || []);
            pLeadBox.innerHTML = users
              .map((u: any) => {
                const checked = leadSet.has(u.staff_id) ? 'checked' : '';
                return `
                  <label class="chk-line">
                    <input type="checkbox"
                           value="${esc(u.staff_id)}"
                           data-name="${esc(u.name || '')}"
                           ${checked}>
                    <span>${esc(u.name || '')} [${esc(u.staff_id)}]</span>
                  </label>
                `;
              })
              .join('');
          }
        }
        renderProjectStructure();
      } else {
        if (!stagesBox || !layoutEditingProjectId) {
          layoutEditMode = false;
          layoutEditingProjectId = null;
          projectLayoutEditTargetId = null;
          renderProjectStructure();
          return;
        }

        const newPlan = readStagePlanFromEditor(stagesBox);
        const { error } = await supabase
          .from('projects')
          .update({ stage_plan: newPlan })
          .eq('id', layoutEditingProjectId);

        if (error) {
          console.error('Save layout error', error);
          toast('Failed to save layout');
          return;
        }

        toast('Layout saved');
        layoutEditMode = false;
        layoutEditingProjectId = null;
        projectLayoutEditTargetId = null;
        await loadDataAfterLogin();
      }
    });

  btnBulkAssign &&
    btnBulkAssign.addEventListener('click', async () => {
      const proj = activeProjectName
        ? projects.find((p) => p.name === activeProjectName)
        : null;

      if (!proj) {
        toast('Select a project first');
        return;
      }
      if (!canEditProjectLayout(proj)) {
        toast('Only leads or Admin can use this');
        return;
      }

      if (layoutEditMode) {
        layoutEditMode = false;
        layoutEditingProjectId = null;
        projectLayoutEditTargetId = null;
        renderProjectStructure();
        return;
      }

      await openBulkModalForProject(proj);
    });

  // ---------- ROLE UI & ESC HANDLER ----------
  function userIsLeadAnywhere() {
    if (!currentUser) return false;
    return projects.some((p) =>
      (p.lead_ids || []).includes(currentUser.staff_id),
    );
  }

  function refreshRoleUI() {
    if (!btnNewProject || !btnAddUser || !btnNewTask) return;

    if (!currentUser) {
      btnNewProject.style.display = 'none';
      btnAddUser.style.display = 'none';
      btnNewTask.style.display = 'none';
      return;
    }

    if (isAdmin()) {
      btnNewProject.style.display = '';
      btnAddUser.style.display = '';
      btnNewTask.style.display = '';
    } else {
      btnNewProject.style.display = 'none';
      btnAddUser.style.display = 'none';
      btnNewTask.style.display = userIsLeadAnywhere() ? '' : 'none';
    }
  }

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      container.querySelectorAll<HTMLElement>('.modal.show').forEach((m) =>
        m.classList.remove('show'),
      );
    }
  };
  document.addEventListener('keydown', keyHandler);

  // Initial UI state
  refreshRoleUI();

  // Cleanup
  return () => {
    document.removeEventListener('keydown', keyHandler);
  };
}, []);

  // React just provides a container; DOM is driven by our staticHtml + JS
  return <div ref={containerRef} />;
}