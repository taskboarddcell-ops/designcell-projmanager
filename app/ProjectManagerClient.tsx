// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// ------------ STATIC HTML (layout as string) ------------
const staticHtml = `
  <div class="app">
    <!-- Mobile Header (hidden on desktop) -->
    <div class="mobile-header" style="display: none;">
      <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
      <div class="mobile-title">
        <img src="https://designcell.com.np/wp-content/themes/WPSTARTER/imagio_s/img/logo/logo.png" alt="DesignCell">
        DCell PM
      </div>
      <div id="mobileUser" class="small muted"></div>
    </div>
    
    <!-- Mobile Overlay -->
    <div class="mobile-overlay" id="mobileOverlay"></div>

    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
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
        <div id="userManagementEntry" class="proj-item" style="display:none">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#172554">
            <path d="M38-158v-94q0-35 18-63.5t50-42.5q73-32 131.5-46T358-418q62 0 120 14t131 46q32 14 50.5 42.5T678-252v94H38Zm700 0v-94q0-63-32-103.5T622-423q69 8 130 23.5t99 35.5q33 19 52 47t19 63v96H738ZM358-478q-66 0-108-42t-42-108q0-66 42-108t108-42q66 0 108 42t42 108q0 66-42 108t-108 42Zm360-150q0 66-42 108t-108 42q-11 0-24.5-1.5T519-484q24-25 36.5-61.5T568-628q0-45-12.5-79.5T519-774q11-3 24.5-5t24.5-2q66 0 108 42t42 108Z"/>
          </svg>
          User Management
        </div>
        
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
            <input id="projSearch" type="text" placeholder="Search projects..." autocomplete="off">
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
          <!-- Notification Bell -->
          <div id="notificationBell" style="position:relative;cursor:pointer;display:none;">
            <button id="btnNotificationBell" class="btn" style="position:relative;padding:6px;background:transparent;border:none;" title="Notifications">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#172554">
                <path d="M160-200v-60h60v-246q0-83 50-145.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 17 130 79.5T720-506v246h60v60H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80Z"/>
              </svg>
              <span id="notificationBadge" class="notification-badge" style="display:none;position:absolute;top:-4px;right:-4px;background:#dc2626;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;">0</span>
            </button>
            <!-- Notification Dropdown -->
            <div id="notificationDropdown" class="notification-dropdown" style="display:none;position:absolute;top:40px;right:0;background:white;border:1px solid #e5e7eb;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.1);min-width:320px;max-width:400px;max-height:480px;overflow-y:auto;z-index:50;">
              <div style="padding:12px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
                <div class="small" style="font-weight:600;">Notifications</div>
                <button id="markAllReadBtn" class="btn-sm" style="background:transparent;border:none;color:#172554;font-size:12px;cursor:pointer;">Mark all as read</button>
              </div>
              <div id="notificationList" style="padding:0;">
                <div class="small muted" style="padding:16px;text-align:center;">Loading...</div>
              </div>
            </div>
          </div>

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
            <div style="display:flex;align-items:center;gap:8px;">
              <label class="small muted" style="white-space:nowrap;">Due Date:</label>
              <input id="filterDateFrom" class="input" type="date" placeholder="From" style="min-width:140px;">
              <span class="small muted">to</span>
              <input id="filterDateTo" class="input" type="date" placeholder="To" style="min-width:140px;">
            </div>
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
            <div style="display:flex;align-items:center;gap:8px;">
              <label class="small muted" style="white-space:nowrap;">Due Date:</label>
              <input id="kbFilterDateFrom" class="input" type="date" placeholder="From" style="min-width:140px;">
              <span class="small muted">to</span>
              <input id="kbFilterDateTo" class="input" type="date" placeholder="To" style="min-width:140px;">
            </div>
            <div class="spacer"></div>
          </div>

          <div class="kanban" id="kanbanBoard">
            <div class="kcol">
              <div class="khead">
                <div class="khead-title">
                  <span class="kchip hi" title="High"></span>
                  <span class="kchip med" title="Medium"></span>
                  <span class="kchip low" title="Low"></span>
                  Pending
                </div>
                <span class="kcount" id="countPending">0</span>
              </div>
              <div id="colPending" class="kdrop" data-status="Pending"></div>
            </div>
            <div class="kcol">
              <div class="khead">
                <div class="khead-title">
                  <span class="kchip hi" title="High"></span>
                  <span class="kchip med" title="Medium"></span>
                  <span class="kchip low" title="Low"></span>
                  In Progress
                </div>
                <span class="kcount" id="countProgress">0</span>
              </div>
              <div id="colProgress" class="kdrop" data-status="In Progress"></div>
            </div>
            <div class="kcol">
              <div class="khead">
                <div class="khead-title">
                  <span class="kchip hi" title="High"></span>
                  <span class="kchip med" title="Medium"></span>
                  <span class="kchip low" title="Low"></span>
                  Completed
                </div>
                <span class="kcount" id="countDone">0</span>
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
          <div id="projectInfoCard" style="display:none;margin-bottom:16px;"></div>
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
        <div class="list" id="stagePlanEditor" style="max-height:500px;overflow-y:auto;overflow-x:hidden;padding:4px"></div>
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
        <div><label class="small muted">Due *</label><input id="tDue" class="input" type="date" required></div>
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
          <input id="bulkDue" class="input" type="date" required>
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

  <!-- EDIT PROJECT INFO MODAL -->
  <div id="editProjectInfoModal" class="modal">
    <div class="mc" style="max-width:500px">
      <h3 style="margin:0 0 12px 0">Edit Project Info</h3>
      
      <div style="margin-bottom:12px">
        <label class="small muted">Project Name *</label>
        <input id="editProjectNameInput" class="input" type="text" placeholder="Enter project name">
      </div>

      <div style="margin-bottom:12px;">
        <label class="small muted" style="margin-bottom:4px;display:block;">Project Leads</label>
        <div id="editProjectLeadsBox" class="list" style="max-height:150px;overflow:auto;border:1px solid #e5e7eb;padding:6px;">
          <!-- Populated by JS -->
        </div>
      </div>

      <div class="right" style="margin-top:12px">
        <button id="editProjectInfoCancel" class="btn">Cancel</button>
        <button id="editProjectInfoSave" class="btn btn-primary">Save Changes</button>
      </div>
    </div>
  </div>

  <!-- USER MANAGEMENT MODAL -->
  <div id="userManagementModal" class="modal">
    <div class="mc" style="max-width:800px">
      <h3 style="margin:0 0 12px 0">User Management</h3>
      
      <div style="margin-bottom:12px;">
        <input id="userSearchInput" class="input" type="text" placeholder="Search users by name or staff ID...">
      </div>

      <div style="max-height:500px;overflow:auto;border:2px solid var(--line-hair);background:#fff;">
        <table style="width:100%;">
          <thead>
            <tr>
              <th style="padding:10px;text-align:left;background:#eef2f6;border-bottom:2px solid var(--line-strong);">Name</th>
              <th style="padding:10px;text-align:left;background:#eef2f6;border-bottom:2px solid var(--line-strong);">Staff ID</th>
              <th style="padding:10px;text-align:left;background:#eef2f6;border-bottom:2px solid var(--line-strong);">Access Level</th>
              <th style="padding:10px;text-align:right;background:#eef2f6;border-bottom:2px solid var(--line-strong);">Actions</th>
            </tr>
          </thead>
          <tbody id="userManagementList">
            <tr>
              <td colspan="4" style="padding:20px;text-align:center;" class="small muted">Loading users...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="right" style="margin-top:12px">
        <button id="userManagementClose" class="btn">Close</button>
      </div>
    </div>
  </div>

  <!-- RESET PASSWORD MODAL -->
  <div id="resetPasswordModal" class="modal">
    <div class="mc" style="max-width:400px">
      <h3 style="margin:0 0 12px 0">Reset Password</h3>
      
      <div style="margin-bottom:12px;">
        <div class="small muted" style="margin-bottom:8px;">User: <strong id="resetPasswordUserName"></strong></div>
        <label class="small muted">New 4-Digit Password *</label>
        <input id="resetPasswordInput" class="input" type="password" maxlength="4" inputmode="numeric" placeholder="Enter 4 digits">
      </div>

      <div class="right" style="margin-top:12px">
        <button id="resetPasswordCancel" class="btn">Cancel</button>
        <button id="resetPasswordSave" class="btn btn-primary">Reset Password</button>
      </div>
    </div>
  </div>

  <!-- STAGE / SUB-STAGE ASSIGN PANEL -->
  <div id="stAssignPanel" class="modal">
    <div class="mc" style="max-width:480px">
      <h3 style="margin:0 0 8px 0">Assign / Update Task</h3>

      <div class="grid2" style="margin-bottom:8px">
        <div>
          <label class="small muted">Stage</label>
          <input id="stAssignStageSel" class="input" readonly />
        </div>
        <div>
          <label class="small muted">Sub-stage</label>
          <input id="stAssignSubSel" class="input" readonly />
        </div>
      </div>

      <div class="grid2" style="margin-bottom:8px">
        <div>
          <label class="small muted">Due *</label>
          <input id="stAssignDue" class="input" type="date" required>
        </div>
        <div>
          <label class="small muted">Priority</label>
          <select id="stAssignPriority" class="select">
            <option>High</option>
            <option selected>Medium</option>
            <option>Low</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom:8px">
        <label class="small muted">Assign to (check)</label>
        <div
          id="stAssignUserMulti"
          class="list"
          style="max-height:220px;overflow:auto;border:1px solid #e5e7eb;padding:6px;border-radius:4px;background:#f8fafc"
        ></div>
      </div>

      <div class="right" style="margin-top:8px">
        <button id="stAssignClose" class="btn">Cancel</button>
        <button id="stAssignBtn" class="btn btn-primary">Create Task</button>
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

    // Helper to extract year from project name (YYYY-...)
    const getProjectYear = (name: string): number => {
      const match = (name || '').match(/^(\d{4})/);
      return match ? parseInt(match[1], 10) : 9999;
    };

    // State for project filtering
    let projectYearFilter = 'All';


    // ---------- SESSION MANAGEMENT ----------
    const SESSION_KEY = 'pm_session';
    const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

    function saveSession(user: any) {
      try {
        const payload = {
          user,
          lastActive: Date.now(),
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      } catch (e) {
        console.error('Save session failed', e);
      }
    }

    function clearSession() {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (e) {
        console.error('Clear session failed', e);
      }
    }

    function restoreSession() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        if (!payload || !payload.user || !payload.lastActive) return null;

        const now = Date.now();
        if (now - payload.lastActive > SESSION_TIMEOUT_MS) {
          clearSession();
          return null;
        }

        // Update activity on restore
        saveSession(payload.user);
        return payload.user;
      } catch (e) {
        console.error('Restore session failed', e);
        return null;
      }
    }

    function updateSessionActivity() {
      if (!currentUser) return;
      // Read current to preserve user, just update time
      // Optimization: only write if > 1 min has passed?
      // For now, simple write is fine, or we can throttle.
      saveSession(currentUser);
    }

    // Global activity listener to keep session alive
    const activityEvents = ['mousedown', 'keydown', 'touchstart'];
    const handleActivity = () => {
      // Throttle: only update if we have a user
      if (currentUser) {
        // We could check last write time here to avoid spamming localStorage
        // But for this scale, it's acceptable to just update.
        // Let's debounce slightly by just updating the variable in memory if we had one,
        // but here we are using localStorage as the source of truth for "lastActive".
        // A simple way: just call saveSession(currentUser)
        saveSession(currentUser);
      }
    };

    // We'll attach this listener once
    activityEvents.forEach(evt => document.addEventListener(evt, handleActivity));

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

    // ---------- MODAL HELPERS ----------
    const showModal = (modal: HTMLElement | null) => {
      if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
      }
    };

    const hideModal = (modal: HTMLElement | null) => {
      if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
      }
    };

    // ---------- ROLE HELPERS ----------
    const isAdmin = () => {
      return currentUser?.access_level === 'Admin';
    };

    const isAssignee = (taskAssignees: string[] | null | undefined) => {
      return currentUser && Array.isArray(taskAssignees) && taskAssignees.includes(currentUser.staff_id);
    };

    const userCanSeeTask = (task: any) => {
      if (!currentUser) return false;
      if (isAdmin()) return true;
      if (isAssignee(task.assignee_ids || [])) return true;
      if (task.created_by_id === currentUser.staff_id) return true;
      // Project leads should see tasks in their projects
      if (task.project_id && isProjectLeadFor(task.project_id)) return true;
      return false;
    };

    const isProjectLeadFor = (projectId: string) => {
      if (!currentUser) return false;
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return false;
      return (proj.lead_ids || []).includes(currentUser.staff_id);
    };

    // Handle task assignment notifications
    async function handleTaskAssignmentChange(oldTask, newTask) {
      if (!newTask || !newTask.assignee_ids || newTask.assignee_ids.length === 0) {
        return;
      }

      // Skip if task is completed
      if (newTask.status === 'Complete' || newTask.status === 'Completed') {
        return;
      }

      const oldAssignees = oldTask?.assignee_ids || [];
      const newAssignees = newTask.assignee_ids || [];

      // Find newly assigned users
      const newlyAssigned = newAssignees.filter(
        (id) => !oldAssignees.includes(id)
      );

      if (newlyAssigned.length === 0) {
        return;
      }

      try {
        // Create notifications for newly assigned users
        const notifications = newlyAssigned.map((staffId) => {
          const dueStr = newTask.due
            ? new Date(newTask.due).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
            : 'No due date';

          return {
            user_id: staffId,
            type: 'TASK_ASSIGNED',
            title: `New task assigned: ${newTask.task || 'Untitled'}`,
            body: `You have been assigned a new task in project "${newTask.project_name || 'Unknown'}".\n\nDue date: ${dueStr}`,
            link_url: `/tasks/${newTask.id}`,
          };
        });

        await supabase.from('notifications').insert(notifications);
      } catch (error) {
        console.error('Create task assignment notification error:', error);
      }
    }

    // Handle task status change notifications (notify leads and admins)
    async function handleTaskStatusChange(task: any, fromStatus: string, toStatus: string, changedByName: string) {
      console.log('[NOTIFICATION] handleTaskStatusChange called:', { taskName: task?.task, fromStatus, toStatus, changedByName });
      if (!task || !task.project_id) return;

      try {
        // Get the project to find leads
        const project = projects.find((p) => p.id === task.project_id);
        if (!project) return;

        // Get all admin users
        const { data: adminUsers, error: adminError } = await supabase
          .from('users')
          .select('staff_id')
          .eq('access_level', 'Admin');

        if (adminError) {
          console.error('Failed to load admins for notification', adminError);
          return;
        }

        const adminIds = (adminUsers || []).map((u) => u.staff_id);
        const leadIds = project.lead_ids || [];

        // Combine admin and lead IDs, remove duplicates, and exclude the person who made the change
        const notifyUsers = [...new Set([...adminIds, ...leadIds])].filter(
          (id) => id !== currentUser?.staff_id
        );

        if (notifyUsers.length === 0) return;

        // Create notifications
        const notifications = notifyUsers.map((staffId) => ({
          user_id: staffId,
          type: 'TASK_STATUS_UPDATE',
          title: `Task status updated: ${task.task || 'Untitled'}`,
          body: `${changedByName} changed task status from "${fromStatus}" to "${toStatus}" in project "${task.project_name || 'Unknown'}".`,
          link_url: `/tasks/${task.id}`,
        }));

        console.log('[NOTIFICATION] Creating notifications for users:', notifyUsers);
        console.log('[NOTIFICATION] Notification data:', notifications);

        const { data: insertResult, error: insertError } = await supabase
          .from('notifications')
          .insert(notifications)
          .select();

        if (insertError) {
          console.error('[NOTIFICATION] Insert failed:', insertError);
        } else {
          console.log('[NOTIFICATION] Successfully created', insertResult?.length || 0, 'notifications');
        }
      } catch (error) {
        console.error('Create task status notification error:', error);
      }
    }

    const canEditProjectLayout = (proj: any) => {
      if (!currentUser || !proj) return false;
      // Only admins can edit project layout
      return isAdmin();
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

      if (!isAssignee(task.assignee_ids)) {
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

      // Notify admins and project leads
      await handleTaskStatusChange(
        task,
        prevStatus,
        newStatus,
        currentUser.name || currentUser.staff_id
      );

      // Update local task object immediately for instant UI feedback
      task.status = newStatus;

      toast('Status updated');

      // Re-render Kanban board immediately
      renderKanban();

      // Then refresh all data from database
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
        .neq('status', 'deactivated') // Exclude deactivated users
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
                      <span>${esc(sb)}</span>
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
        if ((bulkOK as HTMLButtonElement).disabled) return;
        (bulkOK as HTMLButtonElement).disabled = true;
        try {
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
        } finally {
          (bulkOK as HTMLButtonElement).disabled = false;
        }
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

      const filterDateFromEl = el('filterDateFrom') as HTMLInputElement | null;
      const filterDateToEl = el('filterDateTo') as HTMLInputElement | null;
      const kbFilterDateFromEl = el('kbFilterDateFrom') as HTMLInputElement | null;
      const kbFilterDateToEl = el('kbFilterDateTo') as HTMLInputElement | null;

      if (kbFilterDateFromEl && filterDateFromEl)
        kbFilterDateFromEl.value = filterDateFromEl.value;
      if (kbFilterDateToEl && filterDateToEl)
        kbFilterDateToEl.value = filterDateToEl.value;
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

    // Date filter event listeners
    const filterDateFromEl = el('filterDateFrom') as HTMLInputElement | null;
    const filterDateToEl = el('filterDateTo') as HTMLInputElement | null;

    filterDateFromEl &&
      filterDateFromEl.addEventListener('change', () => {
        renderTasks();
        syncKanbanFiltersFromList();
        renderKanban();
      });

    filterDateToEl &&
      filterDateToEl.addEventListener('change', () => {
        renderTasks();
        syncKanbanFiltersFromList();
        renderKanban();
      });

    kbFilterAssignee &&
      kbFilterAssignee.addEventListener('change', () => renderKanban());
    kbFilterStatus &&
      kbFilterStatus.addEventListener('change', () => renderKanban());

    // Kanban date filter event listeners
    const kbFilterDateFromEl = el('kbFilterDateFrom') as HTMLInputElement | null;
    const kbFilterDateToEl = el('kbFilterDateTo') as HTMLInputElement | null;

    kbFilterDateFromEl &&
      kbFilterDateFromEl.addEventListener('change', () => renderKanban());
    kbFilterDateToEl &&
      kbFilterDateToEl.addEventListener('change', () => renderKanban());

    // ---------- USER MANAGEMENT ----------
    const userManagementEntry = el('userManagementEntry');
    const userManagementModal = el('userManagementModal');
    const userManagementList = el('userManagementList');
    const userSearchInput = el('userSearchInput') as HTMLInputElement | null;
    const userManagementClose = el('userManagementClose');

    const resetPasswordModal = el('resetPasswordModal');
    const resetPasswordUserName = el('resetPasswordUserName');
    const resetPasswordInput = el('resetPasswordInput') as HTMLInputElement | null;
    const resetPasswordCancel = el('resetPasswordCancel');
    const resetPasswordSave = el('resetPasswordSave');

    let currentResetUserId: string | null = null;
    let allUsers: any[] = [];

    async function openUserManagement() {
      if (!isAdmin()) {
        toast('Only admins can manage users');
        return;
      }

      await loadAllUsers();
      showModal(userManagementModal);
    }

    async function loadAllUsers() {
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Failed to load users', error);
          toast('Failed to load users');
          return;
        }

        allUsers = users || [];
        renderUserList(allUsers);
      } catch (err) {
        console.error('Exception loading users', err);
        toast('Failed to load users');
      }
    }

    function renderUserList(users: any[]) {
      if (!userManagementList) return;

      if (users.length === 0) {
        userManagementList.innerHTML = `
          <tr>
            <td colspan="4" style="padding:20px;text-align:center;" class="small muted">No users found</td>
          </tr>
        `;
        return;
      }

      userManagementList.innerHTML = users.map((user) => {
        const isCurrentUser = currentUser && currentUser.staff_id === user.staff_id;
        const isDeactivated = user.status === 'deactivated';
        const rowStyle = isDeactivated
          ? 'border-bottom:1px solid #e5e7eb;background:#fef2f2;opacity:0.85;'
          : 'border-bottom:1px solid #e5e7eb;';

        return `
          <tr style="${rowStyle}">
            <td style="padding:12px 10px;">
              ${esc(user.name || 'N/A')}
              ${isDeactivated ? '<span style="font-size:11px;color:#dc2626;font-weight:600;margin-left:6px;">(deactivated)</span>' : ''}
            </td>
            <td style="padding:12px 10px;">${esc(user.staff_id)}</td>
            <td style="padding:12px 10px;">${esc(user.access_level || 'User')}</td>
            <td style="padding:12px 10px;text-align:right;">
              <button 
                class="btn-sm user-reset-password" 
                data-user-id="${esc(user.staff_id)}"
                data-user-name="${esc(user.name || user.staff_id)}"
                style="margin-left:4px;"
              >
                Reset Password
              </button>
              ${!isCurrentUser ? `
                <button 
                  class="btn-sm btn-danger user-delete" 
                  data-user-id="${esc(user.staff_id)}"
                  data-user-name="${esc(user.name || user.staff_id)}"
                  style="margin-left:4px;"
                >
                  ${isDeactivated ? 'Reactivate' : 'Deactivate'}
                </button>
              ` : '<span class="small muted" style="margin-left:8px;">(Current User)</span>'}
            </td>
          </tr>
        `;
      }).join('');

      // Attach event listeners
      userManagementList.querySelectorAll<HTMLElement>('.user-reset-password').forEach((btn) => {
        btn.addEventListener('click', () => {
          const userId = btn.getAttribute('data-user-id');
          const userName = btn.getAttribute('data-user-name');
          if (userId && userName) {
            openResetPasswordModal(userId, userName);
          }
        });
      });

      userManagementList.querySelectorAll<HTMLElement>('.user-delete').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const userId = btn.getAttribute('data-user-id');
          const userName = btn.getAttribute('data-user-name');
          if (userId && userName) {
            // Check if user is deactivated
            const user = allUsers.find(u => u.staff_id === userId);
            if (user && user.status === 'deactivated') {
              await reactivateUser(userId, userName);
            } else {
              await deactivateUser(userId, userName);
            }
          }
        });
      });
    }

    async function reactivateUser(userId: string, userName: string) {
      if (!isAdmin()) {
        toast('Only admins can reactivate users');
        return;
      }

      const confirmed = confirm(`Reactivate user "${userName}" (${userId})?\\n\\nThis user will be able to log in again.`);
      if (!confirmed) return;

      try {
        const { error } = await supabase
          .from('users')
          .update({ status: 'active' })
          .eq('staff_id', userId);

        if (error) {
          console.error('[REACTIVATE-USER] Error:', error);
          toast('Failed to reactivate user');
          return;
        }

        toast('User reactivated successfully');
        await loadAllUsers();
        await loadDataAfterLogin();
      } catch (err) {
        console.error('[REACTIVATE-USER] Exception:', err);
        toast(`Exception: ${err}`);
      }
    }

    function openResetPasswordModal(userId: string, userName: string) {
      currentResetUserId = userId;
      if (resetPasswordUserName) {
        resetPasswordUserName.textContent = userName;
      }
      if (resetPasswordInput) {
        resetPasswordInput.value = '';
      }
      showModal(resetPasswordModal);
    }

    async function deactivateUser(userId: string, userName: string) {
      if (!isAdmin()) {
        toast('Only admins can deactivate users');
        return;
      }

      const confirmed = confirm(`Are you sure you want to delete user "${userName}" (${userId})?\n\nThis action cannot be undone.`);
      if (!confirmed) return;

      console.log('[DEACTIVATE-USER] Attempting to deactivate:', { userId, userName });

      try {
        // Get count of open tasks assigned to this user
        const { data: openTasks, error: taskError } = await supabase
          .from('tasks')
          .select('id, task, status, assignee_ids, assignees')
          .contains('assignee_ids', [userId])
          .not('status', 'eq', 'Complete');

        if (taskError) {
          console.error('[DEACTIVATE-USER] Error fetching tasks:', taskError);
          toast('Failed to check user tasks');
          return;
        }

        const openTaskCount = openTasks?.length || 0;

        let reassignAction = 'leave'; // 'leave', 'reassign', 'unassign'
        let reassignToUserId: string | null = null;

        // Show confirmation with task info
        const message = openTaskCount > 0
          ? `Deactivate user "${userName}" (${userId})?\\n\\n` +
          `This user has ${openTaskCount} open task(s) assigned.\\n\\n` +
          `What would you like to do with these tasks?\\n` +
          `• OK = Leave tasks assigned (will show as "deactivated")\\n` +
          `• Cancel = Don't deactivate`
          : `Deactivate user "${userName}" (${userId})?\\n\\n` +
          `This user has no open tasks.\\n\\n` +
          `Deactivated users cannot log in but remain in task history.`;

        const confirmed = confirm(message);
        if (!confirmed) return;

        // If there are open tasks, ask about reassignment
        if (openTaskCount > 0) {
          const wantReassign = confirm(
            `Do you want to reassign the ${openTaskCount} open task(s) to another user?\\n\\n` +
            `• OK = Choose a user to reassign tasks\\n` +
            `• Cancel = Leave tasks assigned to ${userName} (deactivated)`
          );

          if (wantReassign) {
            // Get active users for reassignment
            const { data: activeUsers } = await supabase
              .from('users')
              .select('staff_id, name')
              .eq('status', 'active')
              .neq('staff_id', userId)
              .order('name', { ascending: true });

            if (activeUsers && activeUsers.length > 0) {
              const userList = activeUsers
                .map((u, idx) => `${idx + 1}. ${u.name} (${u.staff_id})`)
                .join('\\n');

              const choice = prompt(
                `Select a user to reassign tasks to:\\n\\n${userList}\\n\\n` +
                `Enter the number (1-${activeUsers.length}), or 0 to unassign:`
              );

              if (choice) {
                const choiceNum = parseInt(choice);
                if (choiceNum === 0) {
                  reassignAction = 'unassign';
                } else if (choiceNum > 0 && choiceNum <= activeUsers.length) {
                  reassignAction = 'reassign';
                  reassignToUserId = activeUsers[choiceNum - 1].staff_id;
                }
              }
            }
          }
        }

        // Handle task reassignment based on choice
        if (openTasks && openTasks.length > 0) {
          for (const task of openTasks) {
            if (reassignAction === 'reassign' && reassignToUserId) {
              // Reassign to new user
              const currentIds = (task.assignee_ids || []) as string[];
              const newIds = currentIds.filter((id: string) => id !== userId);
              newIds.push(reassignToUserId);

              await supabase
                .from('tasks')
                .update({
                  assignee_ids: newIds,
                  assignees: newIds
                })
                .eq('id', task.id);

              // Log reassignment event
              await supabase.from('task_events').insert({
                task_id: task.id,
                event_type: 'reassigned',
                from_user_id: userId,
                to_user_id: reassignToUserId,
                performed_by: currentUser?.staff_id
              });
            } else if (reassignAction === 'unassign') {
              // Remove user from assignment
              const currentIds = (task.assignee_ids || []) as string[];
              const newIds = currentIds.filter((id: string) => id !== userId);

              await supabase
                .from('tasks')
                .update({
                  assignee_ids: newIds,
                  assignees: newIds
                })
                .eq('id', task.id);

              // Log unassignment event
              await supabase.from('task_events').insert({
                task_id: task.id,
                event_type: 'unassigned',
                from_user_id: userId,
                to_user_id: null,
                performed_by: currentUser?.staff_id
              });
            }
            // If 'leave', we don't modify the task assignments
          }
        }


        // Deactivate the user (soft delete)
        console.log('[DEACTIVATE-USER] About to update user status:', { userId, currentStatus: 'checking...' });

        const { data: updateResult, error: deactivateError } = await supabase
          .from('users')
          .update({ status: 'deactivated' })
          .eq('staff_id', userId)
          .select(); // Add .select() to see what was updated

        console.log('[DEACTIVATE-USER] Update result:', { updateResult, deactivateError });

        if (deactivateError) {
          console.error('[DEACTIVATE-USER] Error:', deactivateError);
          toast(`Failed to deactivate user: ${deactivateError.message}`);
          return;
        }

        if (!updateResult || updateResult.length === 0) {
          console.error('[DEACTIVATE-USER] No rows updated - RLS policy may be blocking');
          toast('User not deactivated - check permissions');
          alert('User was NOT deactivated.\\n\\nPossible causes:\\n1. Row-Level Security (RLS) policy blocking UPDATE\\n2. User not found\\n3. Insufficient permissions\\n\\nCheck Supabase Dashboard → Database → users table → Policies');
          return;
        }

        console.log('[DEACTIVATE-USER] Successfully deactivated user:', userId);

        const actionMsg = reassignAction === 'reassign'
          ? ` and reassigned ${openTaskCount} task(s)`
          : reassignAction === 'unassign'
            ? ` and unassigned ${openTaskCount} task(s)`
            : openTaskCount > 0
              ? ` (${openTaskCount} task(s) remain assigned)`
              : '';

        toast(`User deactivated${actionMsg}`);

        // Force fresh reload from database
        await loadAllUsers();
        await loadDataAfterLogin(); // Refresh tasks to reflect changes
      } catch (err) {
        console.error('[DELETE-USER] Exception:', err);
        toast(`Exception: ${err}`);
      }
    }

    userManagementEntry &&
      userManagementEntry.addEventListener('click', openUserManagement);

    userManagementClose &&
      userManagementClose.addEventListener('click', () => {
        hideModal(userManagementModal);
      });

    userSearchInput &&
      userSearchInput.addEventListener('input', () => {
        const query = (userSearchInput.value || '').toLowerCase().trim();
        if (!query) {
          renderUserList(allUsers);
          return;
        }

        const filtered = allUsers.filter((u) => {
          const name = (u.name || '').toLowerCase();
          const staffId = (u.staff_id || '').toLowerCase();
          return name.includes(query) || staffId.includes(query);
        });

        renderUserList(filtered);
      });

    resetPasswordCancel &&
      resetPasswordCancel.addEventListener('click', () => {
        hideModal(resetPasswordModal);
        currentResetUserId = null;
      });

    resetPasswordSave &&
      resetPasswordSave.addEventListener('click', async () => {
        if (!isAdmin()) {
          toast('Only admins can reset passwords');
          return;
        }

        if (!currentResetUserId) {
          toast('No user selected');
          return;
        }

        const newPassword = (resetPasswordInput && resetPasswordInput.value.trim()) || '';
        if (!newPassword || newPassword.length !== 4 || !/^\d{4}$/.test(newPassword)) {
          toast('Password must be exactly 4 digits');
          return;
        }

        try {
          // Hash the password with bcrypt
          const bcrypt = await import('https://esm.sh/bcryptjs@2.4.3');
          const hashedPassword = await bcrypt.hash(newPassword, 10);

          const { error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('staff_id', currentResetUserId);

          if (error) {
            console.error('Failed to reset password', error);
            toast('Failed to reset password');
            return;
          }

          toast('Password reset successfully');
          hideModal(resetPasswordModal);
          currentResetUserId = null;
          if (resetPasswordInput) resetPasswordInput.value = '';
        } catch (err) {
          console.error('Exception resetting password', err);
          toast('Failed to reset password');
        }
      });

    // ---------- SIDEBAR: PROJECT LIST ----------
    const projList = el('projList');
    const projSearch = el('projSearch') as HTMLInputElement | null;
    const btnAllProjects = el('btnAllProjects');

    function buildProjectSidebar() {
      if (!projList) return;
      const q = ((projSearch && projSearch.value) || '')
        .toLowerCase()
        .trim();
      const filtered = projects
        .filter((p) => !q || (p.name || '').toLowerCase().includes(q))
        .sort((a, b) => getProjectYear(a.name) - getProjectYear(b.name)); // Ascending by year

      let html = `
      <div class="proj-item ${activeProjectName ? '' : 'active'}" data-name="">
        All Projects
      </div>
    `;

      filtered.forEach((p) => {
        const isActive = p.name === activeProjectName;
        const editBtn = isAdmin()
          ? `<button class="proj-edit-btn" data-project-id="${esc(p.id)}" title="Edit project name">
               <svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 -960 960 960" fill="currentColor">
                 <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
               </svg>
             </button>`
          : '';
        html += `
        <div class="proj-item ${isActive ? 'active' : ''}" data-name="${esc(
          p.name,
        )}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span class="proj-name" style="flex:1;overflow:hidden;text-overflow:ellipsis;">${esc(p.name)}</span>
          ${editBtn}
        </div>
      `;
      });

      projList.innerHTML = html;

      updateProjectStatusControl();

      projList.querySelectorAll<HTMLElement>('.proj-item').forEach((item) => {
        // Handle project name click (not edit button)
        const projName = item.querySelector('.proj-name');
        if (projName) {
          projName.addEventListener('click', () => {
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
        }

        // Handle edit button click
        const editBtn = item.querySelector<HTMLElement>('.proj-edit-btn');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const projectId = editBtn.getAttribute('data-project-id');
            if (projectId) {
              openEditProjectInfoModal(projectId);
            }
          });
        }
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

    // ---------- EDIT PROJECT INFO MODAL ----------
    const editProjectInfoModal = el('editProjectInfoModal');
    const editProjectNameInput = el('editProjectNameInput') as HTMLInputElement | null;
    const editProjectLeadsBox = el('editProjectLeadsBox');
    const editProjectInfoCancel = el('editProjectInfoCancel');
    const editProjectInfoSave = el('editProjectInfoSave');
    let editingProjectId: string | null = null;

    async function openEditProjectInfoModal(projectId: string) {
      if (!isAdmin()) {
        toast('Only admins can edit project details');
        return;
      }

      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        toast('Project not found');
        return;
      }

      editingProjectId = projectId;
      if (editProjectNameInput) {
        editProjectNameInput.value = project.name || '';
      }

      // Populate leads
      if (editProjectLeadsBox) {
        editProjectLeadsBox.innerHTML = '<div class="small muted">Loading users...</div>';
        try {
          const { data: users, error } = await supabase
            .from('users')
            .select('staff_id, name')
            .neq('status', 'deactivated') // Exclude deactivated users
            .order('name', { ascending: true });

          if (error) {
            console.error('Load users error', error);
            editProjectLeadsBox.innerHTML = '<div class="small error">Failed to load users</div>';
          } else {
            const currentLeads = new Set(project.lead_ids || []);
            editProjectLeadsBox.innerHTML = (users || [])
              .map((u: any) => {
                const checked = currentLeads.has(u.staff_id) ? 'checked' : '';
                return `
                <label class="chk-line" style="display:flex;align-items:center;min-height:24px;margin-bottom:4px;">
                  <input type="checkbox" class="lead-chk" value="${esc(u.staff_id)}" ${checked}>
                  <span style="font-size:13px;margin-left:6px;">${esc(u.name || u.staff_id)}</span>
                </label>
                `;
              })
              .join('');
          }
        } catch (err) {
          console.error('Populate leads error', err);
          editProjectLeadsBox.innerHTML = '<div class="small error">Exception loading users</div>';
        }
      }

      showModal(editProjectInfoModal);
    }

    editProjectInfoCancel &&
      editProjectInfoCancel.addEventListener('click', () => {
        hideModal(editProjectInfoModal);
        editingProjectId = null;
      });

    editProjectInfoSave &&
      editProjectInfoSave.addEventListener('click', async () => {
        if (!editingProjectId || !editProjectNameInput) return;

        const newName = editProjectNameInput.value.trim();
        if (!newName) {
          toast('Project name is required');
          return;
        }

        // Collect selected leads
        const leadIds: string[] = [];
        if (editProjectLeadsBox) {
          editProjectLeadsBox.querySelectorAll<HTMLInputElement>('.lead-chk:checked').forEach(cb => {
            leadIds.push(cb.value);
          });
        }

        const { error } = await supabase
          .from('projects')
          .update({
            name: newName,
            lead_ids: leadIds,
          })
          .eq('id', editingProjectId);

        if (error) {
          console.error('Update project error', error);
          toast('Failed to update project');
          return;
        }

        // Update local state
        const p = projects.find((x) => x.id === editingProjectId);
        if (p) {
          p.name = newName;
          p.lead_ids = leadIds;
        }

        toast('Project updated');
        hideModal(editProjectInfoModal);
        editingProjectId = null;

        // Refresh UI
        buildProjectSidebar();
        if (activeProjectName) {
          if (p) activeProjectName = p.name;
        }

        if (contextInfo) {
          contextInfo.textContent = activeProjectName
            ? `Project: ${activeProjectName}`
            : 'All Projects';
        }

        renderProjectStructure();
        renderTasks();
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
      const filterDateFromEl = el('filterDateFrom') as HTMLInputElement | null;
      const filterDateToEl = el('filterDateTo') as HTMLInputElement | null;
      const dateFrom = filterDateFromEl?.value || '';
      const dateTo = filterDateToEl?.value || '';

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

        // Date range filter
        if (dateFrom || dateTo) {
          const taskDate = t.due ? new Date(t.due) : null;
          if (!taskDate) return false;

          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            if (taskDate < fromDate) return false;
          }

          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // Include the entire end date
            if (taskDate > toDate) return false;
          }
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
            ${t.current_status
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
      const kbFilterDateFromEl = el('kbFilterDateFrom') as HTMLInputElement | null;
      const kbFilterDateToEl = el('kbFilterDateTo') as HTMLInputElement | null;
      const dateFrom = kbFilterDateFromEl?.value || '';
      const dateTo = kbFilterDateToEl?.value || '';

      const filtered = tasks.filter((t) => {
        if (!userCanSeeTask(t)) return false;
        if (activeProjectName && t.project_name !== activeProjectName) return false;

        if (assigneeFilter) {
          const list = t.assignees || [];
          if (!list.includes(assigneeFilter)) return false;
        }

        // Date range filter
        if (dateFrom || dateTo) {
          const taskDate = t.due ? new Date(t.due) : null;
          if (!taskDate) return false;

          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            if (taskDate < fromDate) return false;
          }

          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // Include the entire end date
            if (taskDate > toDate) return false;
          }
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

        // Touch support for mobile drag and drop
        let touchStartY = 0;
        let touchStartX = 0;
        let isDragging = false;
        let draggedElement: HTMLElement | null = null;

        card.addEventListener('touchstart', (ev) => {
          const touch = ev.touches[0];
          touchStartY = touch.clientY;
          touchStartX = touch.clientX;
          isDragging = false;
          draggedElement = card;
          card.style.transition = 'none';
        });

        card.addEventListener('touchmove', (ev) => {
          ev.preventDefault();
          const touch = ev.touches[0];
          const deltaY = Math.abs(touch.clientY - touchStartY);
          const deltaX = Math.abs(touch.clientX - touchStartX);

          if ((deltaY > 10 || deltaX > 10) && !isDragging) {
            isDragging = true;
            card.classList.add('dragging');
            card.style.position = 'fixed';
            card.style.zIndex = '1000';
            card.style.width = '280px';
            card.style.pointerEvents = 'none';
          }

          if (isDragging) {
            card.style.left = (touch.clientX - 140) + 'px';
            card.style.top = (touch.clientY - 30) + 'px';
          }
        });

        card.addEventListener('touchend', (ev) => {
          if (!isDragging) return;

          const touch = ev.changedTouches[0];
          const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
          const dropZone = elementBelow?.closest('.kdrop');

          // Reset card styles
          card.classList.remove('dragging');
          card.style.position = '';
          card.style.zIndex = '';
          card.style.width = '';
          card.style.left = '';
          card.style.top = '';
          card.style.pointerEvents = '';
          card.style.transition = '';

          if (dropZone && dropZone.dataset.status) {
            const newStatus = dropZone.dataset.status;
            if (newStatus !== status) {
              changeTaskStatusFromKanban(String(t.id), newStatus);
            }
          }

          isDragging = false;
          draggedElement = null;
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

      updateKanbanCounts();
    }

    // ---------- MOBILE MENU HANDLING ----------
    const mobileMenuBtn = el('mobileMenuBtn');
    const mobileOverlay = el('mobileOverlay');
    const sidebar = el('sidebar');
    const mobileUser = el('mobileUser');
    const mobileHeader = container.querySelector('.mobile-header');

    // Show mobile header on mobile screens
    const updateMobileUI = () => {
      if (window.innerWidth <= 980) {
        if (mobileHeader) mobileHeader.style.display = 'flex';
        if (mobileUser && currentUser) {
          mobileUser.textContent = currentUser.name || '';
        }
      } else {
        if (mobileHeader) mobileHeader.style.display = 'none';
        closeMobileMenu();
      }
    };

    const openMobileMenu = () => {
      if (sidebar) sidebar.classList.add('mobile-open');
      if (mobileOverlay) mobileOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeMobileMenu = () => {
      if (sidebar) sidebar.classList.remove('mobile-open');
      if (mobileOverlay) mobileOverlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    mobileMenuBtn && mobileMenuBtn.addEventListener('click', openMobileMenu);
    mobileOverlay && mobileOverlay.addEventListener('click', closeMobileMenu);

    // Close mobile menu when clicking on sidebar links
    const sidebarLinks = container.querySelectorAll('.proj-item, .btn');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 980) {
          setTimeout(closeMobileMenu, 100); // Delay to allow click to register
        }
      });
    });

    // Handle window resize
    window.addEventListener('resize', updateMobileUI);
    updateMobileUI(); // Initial call

    // ---------- KANBAN IMPROVEMENTS ---------- 
    const updateKanbanCounts = () => {
      const countPending = el('countPending');
      const countProgress = el('countProgress');
      const countDone = el('countDone');

      if (countPending) {
        const pendingCards = container.querySelectorAll('#colPending .kcard').length;
        countPending.textContent = pendingCards.toString();
      }
      if (countProgress) {
        const progressCards = container.querySelectorAll('#colProgress .kcard').length;
        countProgress.textContent = progressCards.toString();
      }
      if (countDone) {
        const doneCards = container.querySelectorAll('#colDone .kcard').length;
        countDone.textContent = doneCards.toString();
      }
    };

    // ---------- NOTIFICATION BELL HANDLING ----------
    const btnNotificationBell = el('btnNotificationBell');
    const notificationBadge = el('notificationBadge');
    const notificationDropdown = el('notificationDropdown');
    const notificationList = el('notificationList');
    const markAllReadBtn = el('markAllReadBtn');

    let notificationsPollInterval = null;

    async function loadNotifications() {
      if (!currentUser) return;

      try {
        const response = await fetch(
          `/api/notifications?userId=${encodeURIComponent(currentUser.staff_id)}&limit=20`,
        );
        if (!response.ok) {
          console.error('Failed to load notifications', {
            status: response.status,
            statusText: response.statusText,
            userId: currentUser?.staff_id
          });
          const text = await response.text();
          console.error('Response body:', text);
          return;
        }

        const data = await response.json();
        const { notifications, unread_count } = data;

        // Update badge
        if (notificationBadge) {
          if (unread_count > 0) {
            notificationBadge.textContent = unread_count;
            notificationBadge.style.display = 'flex';
          } else {
            notificationBadge.style.display = 'none';
          }
        }

        // Render notification list
        if (notificationList) {
          if (notifications.length === 0) {
            notificationList.innerHTML = '<div class="small muted" style="padding:16px;text-align:center;">No notifications</div>';
          } else {
            notificationList.innerHTML = notifications
              .map((notif) => {
                const createdAt = new Date(notif.created_at);
                const timeStr = getRelativeTime(createdAt);
                const isUnread = !notif.is_read;

                return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notif.id}" data-link="${notif.link_url || ''}">
                  <div class="notification-item-title">${esc(notif.title)}</div>
                  ${notif.body ? `<div class="notification-item-body">${esc(notif.body)}</div>` : ''}
                  <div class="notification-item-time">${timeStr}</div>
                </div>
              `;
              })
              .join('');

            // Add click handlers
            notificationList.querySelectorAll('.notification-item').forEach((item) => {
              item.addEventListener('click', async () => {
                const notifId = item.getAttribute('data-id');
                const link = item.getAttribute('data-link');

                if (notifId) {
                  try {
                    await fetch(`/api/notifications/${notifId}/read`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: currentUser.staff_id }),
                    });
                  } catch (error) {
                    console.error('Failed to mark notification as read:', error);
                  }
                }

                if (link) {
                  // Navigate to the link
                  window.location.href = link;
                }

                await loadNotifications();
              });
            });
          }
        }
      } catch (error) {
        console.error('Load notifications error:', error);
      }
    }

    // Helper to format relative time
    function getRelativeTime(date) {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }

    // Toggle notification dropdown
    btnNotificationBell &&
      btnNotificationBell.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (notificationDropdown) {
          const isHidden = notificationDropdown.style.display === 'none';
          notificationDropdown.style.display = isHidden ? 'block' : 'none';

          if (isHidden) {
            await loadNotifications();

            // Poll for new notifications while dropdown is open
            if (notificationsPollInterval) {
              clearInterval(notificationsPollInterval);
            }
            notificationsPollInterval = setInterval(loadNotifications, 30000); // Poll every 30s
          } else {
            if (notificationsPollInterval) {
              clearInterval(notificationsPollInterval);
              notificationsPollInterval = null;
            }
          }
        }
      });

    // Mark all as read
    markAllReadBtn &&
      markAllReadBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        try {
          await fetch('/api/notifications/mark-all-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.staff_id }),
          });

          await loadNotifications();
        } catch (error) {
          console.error('Mark all as read error:', error);
        }
      });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (
        notificationDropdown &&
        !notificationDropdown.contains(e.target as Node) &&
        e.target !== btnNotificationBell
      ) {
        notificationDropdown.style.display = 'none';
        if (notificationsPollInterval) {
          clearInterval(notificationsPollInterval);
          notificationsPollInterval = null;
        }
      }
    });

    // ---------- LOGIN/LOGOUT EVENT HANDLERS ----------
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
        clearSession(); // Clear session
        tasks = [];
        projects = [];
        activeProjectName = '';
        selectedTask = null;
        editingTask = null;
        layoutEditMode = false;
        layoutEditingProjectId = null;
        projectLayoutEditTargetId = null;

        if (who) who.textContent = '';
        if (mobileUser) mobileUser.textContent = '';
        if (contextInfo) contextInfo.textContent = 'All Projects';
        if (btnLogin) btnLogin.style.display = '';
        if (btnLogout) btnLogout.style.display = 'none';
        const notificationBell = el('notificationBell');
        if (notificationBell) notificationBell.style.display = 'none';

        // Close mobile menu if open
        closeMobileMenu();

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

        // Prevent deactivated users from logging in
        if (user.status === 'deactivated') {
          toast('This account has been deactivated. Please contact an administrator.');
          return;
        }

        currentUser = user;
        saveSession(user); // Persist session
        console.log('Login successful, showing notification bell');
        if (who) who.textContent = `${user.name} [${user.access_level || 'User'}]`;
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = '';
        const notificationBell = el('notificationBell');
        if (notificationBell) {
          notificationBell.style.display = '';
        }
        hideModal(loginModal);
        await loadDataAfterLogin();
        await loadNotifications();
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
    // Helper to wire up events for a stage row (toggle, delete, add sub-stage, insert below)
    function wireStageRow(row: HTMLElement) {
      const subList = row.querySelector<HTMLElement>('.editor-sub-list');
      const subAdd = row.querySelector<HTMLElement>('.sub-add');
      const stageDel = row.querySelector<HTMLElement>('.stage-del');
      const insertBelow = row.querySelector<HTMLElement>('.stage-insert-below');
      const toggleBtn = row.querySelector<HTMLElement>('.editor-toggle-btn');
      const stageNameInput = row.querySelector<HTMLElement>('.editor-stage-name');

      // Toggle visibility
      toggleBtn &&
        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (subList) {
            subList.classList.toggle('hidden');
            toggleBtn.classList.toggle('collapsed');
          }
        });

      // Add sub-stage
      subAdd &&
        subAdd.addEventListener('click', () => {
          if (!subList) return;
          // Ensure open if adding
          if (subList.classList.contains('hidden')) {
            subList.classList.remove('hidden');
            toggleBtn && toggleBtn.classList.remove('collapsed');
          }

          const div = document.createElement('div');
          div.className = 'editor-sub-row';
          div.innerHTML = `
            <input class="editor-sub-name" placeholder="Sub-stage name">
            <button type="button" class="btn-icon sub-del" title="Remove sub-stage">
              <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="#ef4444"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
            </button>
          `;
          subList.insertBefore(div, subAdd);

          // Wire delete button for this new sub-stage
          const delBtn = div.querySelector<HTMLElement>('.sub-del');
          delBtn &&
            delBtn.addEventListener('click', () => {
              div.remove();
            });

          // Focus the new input
          const input = div.querySelector<HTMLElement>('input');
          if (input) input.focus();
        });

      // Delete sub-stages (existing ones)
      if (subList) {
        subList.querySelectorAll<HTMLElement>('.sub-del').forEach((btn) => {
          btn.addEventListener('click', () => {
            const parent = btn.closest('.editor-sub-row');
            parent && parent.remove();
          });
        });
      }

      // Delete stage
      stageDel &&
        stageDel.addEventListener('click', () => {
          if (confirm('Delete this entire stage?')) {
            row.remove();
          }
        });

      // Insert stage below
      insertBelow &&
        insertBelow.addEventListener('click', () => {
          const newRow = createStageRowDOM();
          row.insertAdjacentElement('afterend', newRow);
          wireStageRow(newRow);
          // Focus new stage name
          const input = newRow.querySelector<HTMLElement>('.editor-stage-name');
          if (input) input.focus();
        });
    }

    // Helper to create the DOM structure for a stage row
    function createStageRowDOM(stageName = '', subStages: string[] = []) {
      const subsHtml = subStages
        .map(
          (s) => `
            <div class="editor-sub-row">
              <input class="editor-sub-name" value="${esc(s)}" placeholder="Sub-stage name">
              <button type="button" class="btn-icon sub-del" title="Remove sub-stage">
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="#ef4444"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
              </button>
            </div>
          `
        )
        .join('');

      const div = document.createElement('div');
      div.className = 'editor-stage-card';
      div.innerHTML = `
        <div class="editor-stage-header">
          <button type="button" class="editor-toggle-btn" title="Toggle">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#64748b"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>
          </button>
          <input class="editor-stage-name" value="${esc(stageName)}" placeholder="Stage name">
          <div class="editor-actions">
            <button type="button" class="btn-sm stage-insert-below" title="Add Stage Below">+ Stage</button>
            <button type="button" class="btn-icon stage-del" title="Remove Stage">
               <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="#ef4444"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
            </button>
          </div>
        </div>
        <div class="editor-sub-list">
          ${subsHtml}
          <button type="button" class="btn-sm sub-add">+ Sub-stage</button>
        </div>
      `;
      return div;
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

      editor.innerHTML = '';

      // Create rows
      workingPlan.forEach((st) => {
        const row = createStageRowDOM(st.stage, st.subs || []);
        editor.appendChild(row);
        wireStageRow(row);
      });
    }

    function readStagePlanFromEditor(editor: HTMLElement | null) {
      if (!editor) return [];
      const stages: any[] = [];

      editor.querySelectorAll<HTMLElement>('.editor-stage-card').forEach((row) => {
        const nameInput = row.querySelector<HTMLInputElement>('.editor-stage-name');
        const stageName = ((nameInput && nameInput.value) || '').trim();
        if (!stageName) return;

        const subs: string[] = [];
        row.querySelectorAll<HTMLElement>('.editor-sub-row').forEach((srow) => {
          const sinput = srow.querySelector<HTMLInputElement>('.editor-sub-name');
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

        if (!stagePlanEditor.querySelector('.editor-stage-card')) {
          stagePlanEditor.innerHTML = '';
        }

        // Use the helpers!
        const div = createStageRowDOM();
        stagePlanEditor.appendChild(div);
        wireStageRow(div);

        // Focus the input
        const input = div.querySelector<HTMLElement>('.editor-stage-name');
        if (input) input.focus();
      });

    projOK &&
      projOK.addEventListener('click', async () => {
        if (!pName || !pType || !pLeadBox) return;

        // Prevent double-clicks
        if ((projOK as HTMLButtonElement).disabled) return;
        (projOK as HTMLButtonElement).disabled = true;

        try {
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
              console.error('Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
              });

              // Check for duplicate name error
              if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
                toast('A project with this name already exists. Please choose a different name.');
              } else {
                toast(`Failed to create project: ${error.message || 'Unknown error'}`);
              }
              return;
            }

            toast('Project created');
          }

          hideModal(projModal);
          projectLayoutEditTargetId = null;
          await loadDataAfterLogin();
        } finally {
          // Re-enable button
          (projOK as HTMLButtonElement).disabled = false;
        }
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
          .neq('status', 'deactivated') // Exclude deactivated users
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
          isProjectLeadFor(project.id);

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
        if (!tProject || !tDue || !tPriority || !tDesc) return;
        if (!currentUser) {
          toast('Please login first');
          return;
        }

        // Prevent double-clicks
        if ((taskOK as HTMLButtonElement).disabled) return;
        (taskOK as HTMLButtonElement).disabled = true;

        try {
          const projectId = tProject.value;
          const project = projects.find((p) => p.id === projectId);
          if (!project) {
            toast('Select a project');
            return;
          }

          // Creation permission check: Admin or Lead for THIS project
          if (!editingTask) {
            if (!isAdmin() && !isProjectLeadFor(project.id)) {
              toast('Only Admins or Project Leads can create tasks for this project.');
              return;
            }
          }

          const title = tDesc.value.trim();
          if (!title) {
            toast('Enter a task description');
            return;
          }

          const due = tDue.value || null;
          if (!due) {
            toast('Due date is required');
            return;
          }

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

          const isLeadForProject = isProjectLeadFor(project.id);

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
                if (projForTask && isProjectLeadFor(projForTask.id)) {
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

            // Handle task assignment notifications
            const oldAssignees = editingTask.assignee_ids || [];
            const newAssignees = payload.assignee_ids || [];
            if (JSON.stringify(oldAssignees) !== JSON.stringify(newAssignees)) {
              await handleTaskAssignmentChange(editingTask, payload);
            }

            hideModal(taskModal);
            editingTask = null;
            toast('Task updated');
          } else {
            const { data: inserted, error } = await supabase.from('tasks').insert([
              {
                ...payload,
                created_by_id: currentUser ? currentUser.staff_id : null,
                created_by_name: currentUser ? currentUser.name : null,
              },
            ]).select().single();

            if (error) {
              console.error('Create task error', error);
              toast('Failed to create task');
              return;
            }

            // Handle task assignment notifications for new task
            if (inserted && (payload.assignee_ids || []).length > 0) {
              await handleTaskAssignmentChange(null, inserted);
            }

            hideModal(taskModal);
            toast('Task created');
          }

          await loadDataAfterLogin();
        } finally {
          // Re-enable button
          (taskOK as HTMLButtonElement).disabled = false;
        }
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
        // ------------------ GENERATE DC-ID ------------------
        // Use our API route to avoid CORS/RPC issues on client
        let nextId = null;
        let idErr = null;

        try {
          const res = await fetch('/api/users/generate-id');
          if (!res.ok) {
            idErr = { message: `Fetch failed: ${res.status}` };
          } else {
            const json = await res.json();
            if (json.error) {
              idErr = json.error;
            } else {
              nextId = json.nextId;
            }
          }
        } catch (e) {
          idErr = e;
        }

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
            ${note
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
            (projForTask && isProjectLeadFor(projForTask.id));

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

        if (!isAssignee(selectedTask.assignee_ids || [])) {
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

        // Notify admins and project leads
        if (currentUser) {
          await handleTaskStatusChange(
            selectedTask,
            prevStatus,
            'Complete',
            currentUser.name || currentUser.staff_id
          );
        }

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

        let canUpdate = false;
        if (isAdmin()) canUpdate = true;
        else if (selectedTask.created_by_id === currentUser?.staff_id) canUpdate = true;
        else if (isAssignee(selectedTask.assignee_ids || [])) canUpdate = true;
        else if (selectedTask.project_id && isProjectLeadFor(selectedTask.project_id)) canUpdate = true;

        if (!canUpdate) {
          toast('Only assignees, leads, or admins can update status');
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

        // Notify admins and project leads
        if (currentUser) {
          await handleTaskStatusChange(
            selectedTask,
            prevStatus,
            newStatus,
            currentUser.name || currentUser.staff_id
          );
        }

        hideModal(statusModal);
        toast('Status updated');
        await loadDataAfterLogin();
      });

    //  ---------- PROJECT STRUCTURE TAB ----------
    const stagesBox = el('stagesBox');
    const layoutActions = el('layoutActions');
    const btnEditLayout = el('btnEditLayout');
    const btnBulkAssign = el('btnBulkAssign');

    // Load users for a project and cache them
    async function loadProjectUsers(projectId: string) {
      try {
        console.log('[loadProjectUsers] Loading users for project:', projectId);
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .neq('status', 'deactivated') // Exclude deactivated users
          .order('name', { ascending: true });

        if (error) {
          console.error('[loadProjectUsers] Error loading users:', error);
          projectUsersCache[projectId] = [];
          return;
        }

        projectUsersCache[projectId] = users || [];
        console.log('[loadProjectUsers] Loaded', users?.length || 0, 'users for project', projectId);
      } catch (err) {
        console.error('[loadProjectUsers] Exception:', err);
        projectUsersCache[projectId] = [];
      }
    }

    // Per-substage assign UI (uses projectUsersCache)
    function wireSubstageAssignUI(proj: any) {
      if (!proj) return;

      const panel = el('stAssignPanel');
      if (!panel) return;

      const stageSel = el('stAssignStageSel') as HTMLInputElement | null;
      const subSel = el('stAssignSubSel') as HTMLInputElement | null;
      const dueSel = el('stAssignDue') as HTMLInputElement | null;
      const prioritySel = el('stAssignPriority') as HTMLSelectElement | null;
      const assignList = el('stAssignUserMulti');
      const assignBtn = el('stAssignBtn');
      const closeBtn = el('stAssignClose');

      let selectedExistingTask: any = null;
      let bulkAssignStageName: string | null = null; // New state for bulk assign

      const openSubstageAssign = async (
        stageName: string,
        subName: string,
        existingTaskId?: string,
      ) => {
        bulkAssignStageName = null; // Reset bulk mode
        if (subSel) subSel.disabled = false;
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

      // New function for Bulk Assign
      const openStageBulkAssign = async (stageName: string) => {
        if (!projectUsersCache[proj.id]) {
          await loadProjectUsers(proj.id);
        }

        bulkAssignStageName = stageName;
        selectedExistingTask = null;

        if (stageSel) stageSel.value = stageName;
        if (subSel) {
          subSel.value = '(All Sub-stages)';
          subSel.disabled = true;
        }

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

        if (assignBtn) assignBtn.textContent = 'Bulk Assign Tasks';
        panel.classList.add('show');
      };

      // Expose function on window for stage/sub rows
      (window as any).openSubstageAssign = openSubstageAssign;
      (window as any).openStageBulkAssign = openStageBulkAssign;

      closeBtn &&
        closeBtn.addEventListener('click', () => {
          panel.classList.remove('show');
        });

      assignBtn &&
        assignBtn.addEventListener('click', async () => {
          // Prevent double-clicks
          if ((assignBtn as HTMLButtonElement).disabled) return;
          (assignBtn as HTMLButtonElement).disabled = true;

          try {
            if (!currentUser) {
              toast('Please login first');
              return;
            }

            const stageName = stageSel?.value || '';
            const subName = subSel?.value || '';
            const dueDate = dueSel?.value || null;
            const priority = prioritySel?.value || 'Medium';

            // Validate due date
            if (!dueDate) {
              toast('Due date is required');
              return;
            }

            if (!canEditProjectLayout(proj)) {
              toast('Only project leads or admins can assign/edit tasks here');
              return;
            }

            // --- BULK ASSIGN LOGIC ---
            if (bulkAssignStageName) {
              const rawPlan = proj.stage_plan || [];
              const plan = Array.isArray(rawPlan) ? rawPlan : [];
              const stage = plan.find((s: any) => (s.stage || s.name) === bulkAssignStageName);

              if (!stage) {
                toast('Stage not found');
                return;
              }

              const subs = stage.subs || stage.sub_stages || [];
              if (subs.length === 0) {
                toast('No sub-stages to assign');
                return;
              }

              const checked = assignList?.querySelectorAll<HTMLInputElement>('.asgU:checked');
              const selectedIds: string[] = [];
              checked?.forEach((c) => selectedIds.push(c.value));

              let updateCount = 0;
              // Iterate all substages and upsert tasks
              for (const sub of subs) {
                const existing = tasks.find(
                  (t) =>
                    t.project_id === proj.id &&
                    (t.stage_id || '') === bulkAssignStageName &&
                    (t.sub_id || '') === sub
                );

                if (existing) {
                  // Update existing task
                  await supabase
                    .from('tasks')
                    .update({ assignee_ids: selectedIds })
                    .eq('id', existing.id);
                  existing.assignee_ids = selectedIds;
                } else {
                  // Create new task
                  const { data } = await supabase
                    .from('tasks')
                    .insert({
                      project_id: proj.id,
                      project_name: proj.name,
                      stage_id: bulkAssignStageName,
                      sub_id: sub,
                      assignee_ids: selectedIds,
                      assignees: selectedIds,
                      status: 'Pending',
                      task: `${bulkAssignStageName} - ${sub}`,
                      due: dueDate,
                      priority: priority,
                      description: '',
                      created_by_id: currentUser.staff_id,
                      created_by_name: currentUser.name,
                    })
                    .select();

                  if (data && data[0]) tasks.push(data[0]);
                }
                updateCount++;
              }

              toast(`Bulk assigned ${updateCount} tasks`);
              panel.classList.remove('show');
              renderProjectStructure(); // Refresh UI

              // Clean up
              bulkAssignStageName = null;
              if (subSel) subSel.disabled = false;
              return;
            }
            // --- END BULK ASSIGN ---

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
                  due: dueDate,
                  priority: priority,
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
          } finally {
            // Re-enable button
            (assignBtn as HTMLButtonElement).disabled = false;
          }
        });

      // Add event delegation for sub-assign buttons
      const stagesBox = el('stagesBox');
      if (stagesBox) {
        // Use a flag to prevent duplicate listeners
        if (!(stagesBox as any)._hasAssignListener) {
          (stagesBox as any)._hasAssignListener = true;
          let isProcessing = false; // Prevent rapid clicks

          stagesBox.addEventListener('click', async (ev) => {
            const target = ev.target as HTMLElement;
            if (!target || !target.classList.contains('sub-assign')) return;

            // Prevent rapid clicks
            if (isProcessing) return;
            isProcessing = true;

            try {
              ev.stopPropagation();
              const stageName = target.getAttribute('data-stage') || '';
              const subName = target.getAttribute('data-sub') || '';
              const taskId = target.getAttribute('data-task-id') || '';

              await openSubstageAssign(stageName, subName, taskId);
            } finally {
              // Small delay to prevent accidental double-clicks
              setTimeout(() => {
                isProcessing = false;
              }, 300);
            }
          });
        }
      }
    }


    // ---------- RENDER PROJECT INFO CARD ----------
    async function renderProjectInfoCard(proj: any) {
      const projectInfoCard = el('projectInfoCard');
      if (!projectInfoCard) return;

      // Calculate task statistics for this project
      const projectTasks = tasks.filter((t) => t.project_id === proj.id);
      const completedTasks = projectTasks.filter((t) => t.status === 'Complete').length;
      const totalTasks = projectTasks.length;

      // Get project leads
      const leadIds = proj.lead_ids || [];
      const leadNames: string[] = [];

      // Fetch lead names from users
      if (leadIds.length > 0) {
        try {
          const { data: leadUsers } = await supabase
            .from('users')
            .select('name, staff_id')
            .in('staff_id', leadIds);

          if (leadUsers) {
            leadNames.push(...leadUsers.map((u) => u.name || u.staff_id));
          }
        } catch (err) {
          console.error('Failed to fetch lead users', err);
        }
      }

      const status = proj.status || proj.project_status || 'Ongoing';
      const createdAt = proj.created_at
        ? new Date(proj.created_at).toLocaleDateString()
        : 'N/A';

      // Calculate completion percentage
      const completionPercentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      projectInfoCard.style.display = '';
      projectInfoCard.innerHTML = `
        <div class="card" style="background:#f8fafc;border:2px solid var(--line-strong);">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            
            <!-- Project Name & Type -->
            <div>
              <div class="small muted" style="text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Project</div>
              <div style="font-weight:700;font-size:16px;margin-bottom:4px;">${esc(proj.name || 'Unnamed Project')}</div>
              <div class="small muted">Type: ${esc(proj.type || 'Not specified')}</div>
            </div>

            <!-- Task Completion -->
            <div>
              <div class="small muted" style="text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Tasks</div>
              <div style="font-weight:700;font-size:20px;color:var(--accent);">${completedTasks}/${totalTasks}</div>
              <div class="small muted">${completionPercentage}% Complete</div>
              <div style="width:100%;height:6px;background:#e5e7eb;border-radius:3px;margin-top:6px;overflow:hidden;">
                <div style="width:${completionPercentage}%;height:100%;background:var(--green);transition:width 0.3s;"></div>
              </div>
            </div>

            <!-- Project Status -->
            <div>
              <div class="small muted" style="text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Status</div>
              <div style="font-weight:700;font-size:16px;">
                <span class="badge" style="${status === 'Complete' ? 'background:#d1fae5;border-color:#10b981;color:#065f46;' :
          status === 'On Hold' ? 'background:#fee2e2;border-color:#ef4444;color:#991b1b;' :
            'background:#dbeafe;border-color:#3b82f6;color:#1e40af;'
        }">${esc(status)}</span>
              </div>
            </div>

            <!-- Project Leads -->
            <div>
              <div class="small muted" style="text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;display:flex;align-items:center;">
                Project Lead${leadNames.length !== 1 ? 's' : ''}
                <button class="btn-icon-sm edit-leads-btn" data-project-id="${esc(proj.id)}" title="Edit Leads" style="border:none;background:none;cursor:pointer;margin-left:6px;padding:0;color:var(--text-muted);display:flex;align-items:center;">
                  <svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 -960 960 960" fill="currentColor">
                     <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                  </svg>
                </button>
              </div>
              <div style="font-weight:600;font-size:14px;">
                ${leadNames.length > 0
          ? leadNames.map(name => `<div style="margin-bottom:2px;">${esc(name)}</div>`).join('')
          : '<span class="muted">No leads assigned</span>'}
              </div>
            </div>

            <!-- Created Date -->
            <div>
              <div class="small muted" style="text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Created</div>
              <div style="font-weight:600;font-size:14px;">${createdAt}</div>
            </div>

          </div>
        </div>
      `;

      // Attach listener for the pencil icon inside this card
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const pencilBtn = projectInfoCard.querySelector('.edit-leads-btn');
        if (pencilBtn) {
          pencilBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pid = pencilBtn.getAttribute('data-project-id');
            if (pid) openEditProjectInfoModal(pid);
          });
        }
      }, 0);
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

        // Fix: Hide project info card when viewing All Projects
        const projectInfoCard = el('projectInfoCard');
        if (projectInfoCard) projectInfoCard.style.display = 'none';

        // Calculate years from project names
        const uniqueYears = Array.from(new Set(projects.map(p => getProjectYear(p.name)).filter(y => y !== 9999))).sort((a, b) => a - b);
        const yearOptions = uniqueYears.map(y => `<option value="${y}" ${projectYearFilter === y.toString() ? 'selected' : ''}>${y}</option>`).join('');

        const sorted = [...projects]
          .filter(p => projectYearFilter === 'All' || getProjectYear(p.name).toString() === projectYearFilter)
          .sort((a, b) => getProjectYear(a.name) - getProjectYear(b.name));

        stagesBox.innerHTML = `
        <div class="card" style="margin-bottom:8px;">
          <div class="row" style="align-items:center;gap:8px;">
            <div class="small muted">All Projects — Set status</div>
            <div style="flex:1;"></div>
            <select id="projYearFilter" class="select" style="max-width:120px; margin-right:8px;">
              <option value="All" ${projectYearFilter === 'All' ? 'selected' : ''}>All Years</option>
              ${yearOptions}
            </select>
            <input
              id="projStatusFilter"
              class="input"
              placeholder="Filter by name..."
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
                        <option value="Ongoing" ${status === 'Ongoing' ? 'selected' : ''
                }>Ongoing</option>
                        <option value="On Hold" ${status === 'On Hold' ? 'selected' : ''
                }>On Hold</option>
                        <option value="Complete" ${status === 'Complete' ? 'selected' : ''
                }>Complete</option>
                      </select>
                    </div>
                    <div>
                      <button class="btn-sm btn-danger proj-delete-btn" data-project-id="${esc(p.id)}" data-project-name="${esc(p.name || '')}" title="Delete project">
                        Delete
                      </button>
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

        const yearSelect = stagesBox.querySelector<HTMLSelectElement>('#projYearFilter');
        if (yearSelect) {
          yearSelect.addEventListener('change', (ev) => {
            projectYearFilter = (ev.target as HTMLSelectElement).value;
            renderProjectStructure();
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

        // Add delete button event listeners
        stagesBox
          .querySelectorAll<HTMLButtonElement>('.proj-delete-btn')
          .forEach((btn) => {
            btn.addEventListener('click', async () => {
              if (!isAdmin()) {
                toast('Only admins can delete projects');
                return;
              }

              const projId = btn.getAttribute('data-project-id');
              const projName = btn.getAttribute('data-project-name');

              if (!projId || !projName) return;

              const confirmed = confirm(
                `Are you sure you want to delete project "${projName}"?\n\n` +
                `This will permanently delete:\n` +
                `- The project itself\n` +
                `- All associated tasks\n` +
                `- All task history\n\n` +
                `This action cannot be undone!`
              );

              if (!confirmed) return;

              try {
                // Delete project (this should cascade delete tasks due to foreign key constraints)
                const { error } = await supabase
                  .from('projects')
                  .delete()
                  .eq('id', projId);

                if (error) {
                  console.error('Failed to delete project', error);
                  toast('Failed to delete project');
                  return;
                }

                toast('Project deleted successfully');

                // Remove from local projects array
                const index = projects.findIndex((p) => p.id === projId);
                if (index !== -1) {
                  projects.splice(index, 1);
                }

                // Refresh UI
                await loadDataAfterLogin();
                renderProjectStructure();
              } catch (e) {
                console.error('Exception deleting project', e);
                toast('Failed to delete project');
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

        // Hide project info card when no project selected
        const projectInfoCard = el('projectInfoCard');
        if (projectInfoCard) projectInfoCard.style.display = 'none';

        return;
      }

      // Render project info card
      renderProjectInfoCard(proj);

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
                           ${isDone
                      ? '<span class="tick-done" style="color:#16a34a;font-weight:700;font-size:14px;margin-right:4px;">✔</span>'
                      : ''
                    }
                           <strong>${esc(primary.task || '')}</strong>
                           ${(primary.assignees || []).length
                      ? ' — <span class="assignee-label">' +
                      esc(
                        (primary.assignees || []).join(', '),
                      ) +
                      '</span>'
                      : ' — <span class="assignee-label assignee-unassigned">Unassigned</span>'
                    }
                           ${primary.due
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
                                  data-stage="${esc(stageName)}"
                                  data-sub="${esc(subName)}"
                                  data-task-id="${primary ? esc(primary.id) : ''}">
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
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                 <div><strong>${esc(stName)}</strong></div>
                 ${canEdit ? `<button class="btn-xs stage-bulk-assign" data-stage="${esc(stName)}" style="padding:2px 8px;font-size:11px;background:var(--bg-hover);">Bulk Assign</button>` : ''}
              </div>
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

        // Wire up Bulk Assign buttons
        stagesBox.querySelectorAll<HTMLElement>('.stage-bulk-assign').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const stage = btn.getAttribute('data-stage');
            if (stage && (window as any).openStageBulkAssign) {
              (window as any).openStageBulkAssign(stage);
            }
          });
        });
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
          toast('Only admins can edit project layout');
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
        if (userManagementEntry) userManagementEntry.style.display = 'none';
        return;
      }

      if (isAdmin()) {
        btnNewProject.style.display = '';
        btnAddUser.style.display = '';
        btnNewTask.style.display = '';
        if (userManagementEntry) userManagementEntry.style.display = '';
      } else {
        btnNewProject.style.display = 'none';
        btnAddUser.style.display = 'none';
        btnNewTask.style.display = userIsLeadAnywhere() ? '' : 'none';
        if (userManagementEntry) userManagementEntry.style.display = 'none';
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

    // Try to restore session
    const restoredUser = restoreSession();
    if (restoredUser) {
      currentUser = restoredUser;
      if (who) who.textContent = `${currentUser.name} [${currentUser.access_level || 'User'}]`;
      if (btnLogin) btnLogin.style.display = 'none';
      if (btnLogout) btnLogout.style.display = '';
      const notificationBell = el('notificationBell');
      if (notificationBell) notificationBell.style.display = '';
      refreshRoleUI();
      loadDataAfterLogin(); // Load data immediately
      loadNotifications(); // Load notifications on session restore
    }

    // Cleanup
    return () => {
      document.removeEventListener('keydown', keyHandler);
      activityEvents.forEach(evt => document.removeEventListener(evt, handleActivity));
    };
  }, []);

  // React just provides a container; DOM is driven by our staticHtml + JS
  return <div ref={containerRef} />;
}
