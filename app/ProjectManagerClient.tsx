// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- PHASE 3: HANDLER IMPORTS ---
import {
  // Types
  Task, Project, User, AssignState,

  // Utilities
  esc, formatDate, getProjectYear, isAdmin,

  // Task Handlers
  createTask, updateTask, deleteTask, bulkDeleteTasks, bulkAssignTasks,

  // Project Handlers
  fetchProjects, sortProjectsByYear, filterProjectsByYear,

  // User Handlers
  loginUser, loadSession, saveSession, clearSession,
  getAssignableUsers
} from './handlers';

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

          <!-- Workload tab (fourth, admin only) -->
          <button id="tabWorkload" class="tab" aria-selected="false" style="display:none;">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" class="tab-icon" viewBox="0 -960 960 960">
              <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm-240 0q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm480 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400Z"/>
            </svg>
            Workload Analysis
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
              <option value="Needs Revision">Needs Revision</option>
              <option value="Complete">Completed</option>
              <option value="All">All</option>
            </select>
            <div style="display:flex;align-items:center;gap:8px;">
              <label class="small muted" style="white-space:nowrap;">Due Date:</label>
              <input id="filterDateFrom" class="input" type="date" placeholder="From" style="min-width:140px;">
              <span class="small muted">to</span>
              <input id="filterDateTo" class="input" type="date" placeholder="To" style="min-width:140px;">
            </div>
            <button id="printReportBtn" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;">
              <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M640-640v-120H320v120h-80v-200h480v200h-80Zm-480 80h640-640Zm560 100q17 0 28.5-11.5T760-500q0-17-11.5-28.5T720-540q-17 0-28.5 11.5T680-500q0 17 11.5 28.5T720-460Zm-80 260v-160H320v160h320Zm80 80H240v-160H80v-240q0-51 35-85.5t85-34.5h560q51 0 85.5 34.5T880-520v240H720v160Zm80-240v-160q0-17-11.5-28.5T760-560H200q-17 0-28.5 11.5T160-520v160h80v-80h480v80h80Z"/>
              </svg>
              Print Report
            </button>
            <div class="spacer"></div>
            <button id="btnBulkDelete" class="btn btn-danger" style="display:none;" title="Delete selected tasks (Admin only)">
              Delete Selected (<span id="selectedCount">0</span>)
            </button>
            <div id="projectContext" class="small muted"></div>
          </div>

          <div style="height:12px"></div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:40px;" id="selectAllHeader"><input type="checkbox" id="selectAllTasks" title="Select all tasks" style="cursor:pointer;"></th>
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
              <option value="Needs Revision">Needs Revision</option>
              <option value="Complete">Completed</option>
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
            <div class="kcol" data-status="Pending">
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
            <div class="kcol" data-status="In Progress">
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
            <div class="kcol" data-status="Complete">
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
            <div class="kcol" data-status="Needs Revision">
              <div class="khead">
                <div class="khead-title">
                  <span class="kchip hi" title="High"></span>
                  <span class="kchip med" title="Medium"></span>
                  <span class="kchip low" title="Low"></span>
                  Needs Revision
                </div>
                <span class="kcount" id="countRevision">0</span>
              </div>
              <div id="colRevision" class="kdrop" data-status="Needs Revision"></div>
            </div>
          </div>
        </section>

        <!-- Project Structure -->
        <section id="viewStages" class="card" style="display:none">
          <div class="row" id="layoutActions" style="margin-bottom:12px;display:none">
            <button id="btnEditLayout" class="btn">✎ Edit Layout</button>
          </div>
          <div id="projectInfoCard" style="display:none;margin-bottom:16px;"></div>
          <div id="stagesBox"></div>
        </section>

        <!-- Workload Analysis -->
        <section id="viewWorkload" class="card" style="display:none">
          <div id="workloadHeader" style="margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
            <div style="flex: 1; min-width: 250px;">
              <h2 style="margin:0;font-size:20px;color:var(--accent);">Smart Workload Analysis</h2>
              <p class="small muted" style="margin:0; margin-top:2px;">Workload distribution and performance metrics for all employees.</p>
            </div>
            <div style="display:flex; gap:12px; align-items:center; flex-shrink: 0; flex-wrap: wrap;">
              <div class="search-wrap" style="width:240px; margin:0; flex-shrink: 0;">
                <span class="icon" style="top:50%; transform:translateY(-50%);">
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="var(--muted)">
                    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
                  </svg>
                </span>
                <input id="workloadSearch" type="text" placeholder="Search workers..." autocomplete="off" style="width:100%; padding: 8px 8px 8px 36px; border: 2px solid var(--line-hair); border-radius: 4px; height:40px;">
              </div>
              <div style="flex-shrink: 0;">
                <select id="workloadSort" class="select" style="width:180px; margin:0; height: 40px; display:block;">
                  <option value="load">Highest Load Score</option>
                  <option value="tasks">Most Active Tasks</option>
                  <option value="overdue">Most Overdue</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
          <div id="workloadContent" class="workload-dashboard">
            <!-- Dynamically populated -->
            <div class="loading-state" style="padding:40px;text-align:center;color:var(--muted);">
              Gathering data and analyzing workload...
            </div>
          </div>
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
            <option>Designer</option>
            <option>Team Leader</option>
            <option>Admin</option>
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

  <!-- REVISION REQUEST MODAL -->
  <div id="revisionModal" class="modal">
    <div class="mc" style="max-width:480px">
      <h3 style="margin:0 0 8px 0">Request Revision</h3>
      <div id="revisionTaskInfo" class="small muted" style="margin-bottom:12px"></div>
      
      <label class="small muted">What needs to be changed? *</label>
      <textarea id="revisionComments" class="input" style="height:120px" 
                placeholder="Explain what needs to be revised..."></textarea>
      
      <div class="right" style="margin-top:16px">
        <button id="revisionCancel" class="btn">Cancel</button>
        <button id="revisionOK" class="btn btn-primary">Request Revision</button>
      </div>
    </div>
  </div>

  <!-- REVIEW MODAL -->
  <!-- STATUS UPDATE -->
  <div id="statusModal" class="modal">
    <div class="mc" style="max-width:480px">
      <h3 style="margin:0 0 8px 0">Update Status</h3>
      <label class="small muted">New status</label>
      <select id="stSel" class="select">
        <option>Pending</option>
        <option>In Progress</option>
        <option>Needs Revision</option>
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

  <!-- PRINT WIZARD MODAL -->
  <div id="printWizardModal" class="modal">
    <div class="mc" style="max-width:580px">
      <h3 style="margin:0 0 16px 0">
        <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 -960 960 960" fill="currentColor" style="vertical-align:middle;margin-right:8px;">
          <path d="M640-640v-120H320v120h-80v-200h480v200h-80Zm-480 80h640-640Zm560 100q17 0 28.5-11.5T760-500q0-17-11.5-28.5T720-540q-17 0-28.5 11.5T680-500q0 17 11.5 28.5T720-460Zm-80 260v-160H320v160h320Zm80 80H240v-160H80v-240q0-51 35-85.5t85-34.5h560q51 0 85.5 34.5T880-520v240H720v160Zm80-240v-160q0-17-11.5-28.5T760-560H200q-17 0-28.5 11.5T160-520v160h80v-80h480v80h80Z"/>
        </svg>
        Print Report Wizard
      </h3>
      
      <!-- Step 1: Report Type -->
      <div style="margin-bottom:16px; background:#f9fafb; padding:12px; border-radius:8px; border:1px solid #e5e7eb;">
        <div style="display:flex; align-items:center; margin-bottom:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 -960 960 960" fill="#6366f1" style="margin-right:6px;">
            <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/>
          </svg>
          <label class="small" style="font-weight:600; color:#374151;">1. Choose Report Layout</label>
        </div>
        <select id="pwReportType" class="select">
          <option value="tasklist">Simple Task List</option>
          <option value="projectstructure">Project Structure (Grouped)</option>
          <option value="kanban">Kanban Board View</option>
        </select>
      </div>

      <!-- Step 2: Filter Mode -->
      <div id="pwFilterModeSection" style="margin-bottom:16px; background:#f9fafb; padding:12px; border-radius:8px; border:1px solid #e5e7eb;">
        <div style="display:flex; align-items:center; margin-bottom:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 -960 960 960" fill="#6366f1" style="margin-right:6px;">
            <path d="M400-240v-80h160v80H400ZM240-440v-80h480v80H240ZM120-640v-80h720v80H120Z"/>
          </svg>
          <label class="small" style="font-weight:600; color:#374151;">2. Select Filter Mode</label>
        </div>
        <select id="pwFilterMode" class="select" style="font-weight:500;">
          <option value="assigned">Assigned Tasks (during time period)</option>
          <option value="completed">Completed Tasks (during time period)</option>
          <option value="all">All Tasks (assigned OR completed during period)</option>
        </select>
        <div id="pwFilterModeDesc" class="small muted" style="margin-top:6px; padding:8px; background:#fff; border-radius:4px; font-style:italic;">
          Shows all tasks that were assigned (created) during the selected date range. Excludes completed tasks.
        </div>
      </div>

      <!-- Step 3: Date Range -->
      <div id="pwDateRangeSection" style="margin-bottom:16px; background:#f9fafb; padding:12px; border-radius:8px; border:1px solid #e5e7eb;">
        <div style="display:flex; align-items:center; margin-bottom:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 -960 960 960" fill="#6366f1" style="margin-right:6px;">
            <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z"/>
          </svg>
          <label class="small" style="font-weight:600; color:#374151;">3. Choose Timeframe</label>
        </div>
        <select id="pwDatePreset" class="select">
          <option value="7days">Last 7 Days</option>
          <option value="today">Today</option>
          <option value="30days">Last 30 Days</option>
          <option value="month">Current Month</option>
          <option value="all">All Time</option>
          <option value="custom">Custom Range...</option>
        </select>
        <div id="pwCustomDates" style="display:none; margin-top:8px;" class="grid2">
          <div><label class="small muted">From</label><input id="pwDateFrom" class="input" type="date"></div>
          <div><label class="small muted">To</label><input id="pwDateTo" class="input" type="date"></div>
        </div>
      </div>

      <!-- Project Selector (Dynamic Step) -->
      <div id="pwProjectSelector" style="display:none; margin-bottom:16px; background:#f9fafb; padding:12px; border-radius:8px; border:1px solid #e5e7eb;">
        <div style="display:flex; align-items:center; margin-bottom:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 -960 960 960" fill="#6366f1" style="margin-right:6px;">
             <path d="M120-120v-320h240v320H120Zm0-400v-320h240v320H120Zm320 400v-320h400v320H440Zm0-400v-320h400v320H440Z"/>
          </svg>
          <label class="small" style="font-weight:600; color:#374151;">Select Projects</label>
        </div>
        <div id="pwProjectList" style="max-height:150px; overflow:auto; border:1px solid #e5e7eb; padding:6px; margin-top:4px; background:#fff; border-radius:4px;">
          <!-- Project checkboxes will be populated dynamically -->
        </div>
      </div>

      <!-- Advanced Filters (Collapsible) -->
      <div style="margin-bottom:16px;">
        <button id="pwToggleAdvanced" class="btn" style="width:100%; display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #e5e7eb;">
          <span style="display:flex; align-items:center;">
            <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 -960 960 960" fill="currentColor" style="margin-right:6px;">
              <path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z"/>
            </svg>
            Advanced Filters
          </span>
          <svg id="pwAdvancedIcon" xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
          </svg>
        </button>
        
        <div id="pwAdvancedSection" style="display:none; margin-top:12px; padding:12px; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
          <!-- Employee Filter -->
          <div style="margin-bottom:12px;">
            <label class="small muted">Filter by Employee</label>
            <select id="pwEmployeeFilter" class="select" style="margin-top:4px;">
              <option value="">All Employees</option>
              <!-- Populated dynamically -->
            </select>
          </div>



          <!-- Status Filters -->
          <div id="pwStatusSection" style="margin-bottom:12px">
            <label class="small muted">Statuses to Include</label>
            <div id="pwStatusList" class="grid2" style="margin-top:4px;">
              <label class="small"><input type="checkbox" value="Pending" checked> Pending</label>
              <label class="small"><input type="checkbox" value="In Progress" checked> In Progress</label>
              <label class="small"><input type="checkbox" value="Needs Revision" checked> Needs Revision</label>
              <label class="small"><input type="checkbox" value="Complete" checked> Completed</label>
            </div>
          </div>

          <!-- Report Options -->
          <div>
            <label class="small muted">Report Options</label>
            <div style="margin-top:4px;">
              <label class="small" style="display:block; margin-bottom:4px;">
                <input type="checkbox" id="pwShowStats" checked> Include Statistics Summary
              </label>
              <label class="small" style="display:block; margin-bottom:4px;">
                <input type="checkbox" id="pwShowDesc"> Show Task Descriptions
              </label>
              <label class="small" style="display:block;">
                <input type="checkbox" id="pwShowRemarks"> Show Remarks & Metadata
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Export Format -->
      <div style="margin-bottom:16px;">
        <label class="small muted">Export Format</label>
        <select id="pwExportFormat" class="select">
          <option value="print">Print (Browser)</option>
          <option value="pdf">PDF Download</option>
          <option value="excel">Excel Download</option>
        </select>
      </div>

      <div class="right" style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">
        <button id="pwCancel" class="btn">Cancel</button>
        <button id="pwPrint" class="btn btn-primary" style="display:flex; align-items:center; gap:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M640-640v-120H320v120h-80v-200h480v200h-80Zm-480 80h640-640Zm560 100q17 0 28.5-11.5T760-500q0-17-11.5-28.5T720-540q-17 0-28.5 11.5T680-500q0 17 11.5 28.5T720-460Zm-80 260v-160H320v160h320Zm80 80H240v-160H80v-240q0-51 35-85.5t85-34.5h560q51 0 85.5 34.5T880-520v240H720v160Zm80-240v-160q0-17-11.5-28.5T760-560H200q-17 0-28.5 11.5T160-520v160h80v-80h480v80h80Z"/>
          </svg>
          Generate Report
        </button>
      </div>
    </div>
  </div>

  <!-- WORKLOAD DETAIL MODAL -->
  <div id="workloadDetailModal" class="modal">
    <div class="mc" style="max-width:850px; width:95%; max-height:85vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">
      <div id="wdHeader" style="padding:20px; border-bottom:1px solid var(--line-hair); background:#f8fafc; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div id="wdAvatar" style="width:48px; height:48px; background:var(--accent); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:20px;">?</div>
          <div>
            <h3 id="wdName" style="margin:0; font-size:20px; color:var(--accent);">Worker Name</h3>
            <div id="wdLevel" style="font-size:12px; color:var(--muted); margin-top:2px;">Position Info</div>
          </div>
        </div>
        <button id="wdClose" class="btn" style="border:none; background:transparent; font-size:24px; cursor:pointer; color:var(--muted);">&times;</button>
      </div>

      <div id="wdBody" style="flex:1; overflow-y:auto; padding:24px;">
        <div id="wdSummary" class="stats-grid" style="margin-bottom:32px;">
          <!-- Metrics injected here -->
        </div>

        <div style="margin-bottom:16px;">
          <h4 style="margin:0 0 16px 0; font-size:13px; text-transform:uppercase; letter-spacing:0.8px; color:var(--muted); font-weight:700;">Task Breakdown & Assignment Details</h4>
          <div id="wdTaskGroupList" style="display:flex; flex-direction:column; gap:20px;">
            <!-- Grouped tasks injected here -->
          </div>
        </div>
      </div>
      
      <div style="padding:16px 24px; background:#f8fafc; border-top:1px solid var(--line-hair); display:flex; justify-content:flex-end;">
        <button id="wdCloseBtn" class="btn">Close Analysis</button>
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

  <!-- PRINT REPORT SECTION (Hidden, only visible when printing) -->
  <div id="printReport" style="display:none;">
    <div class="report-header">
      <h1 style="margin:0 0 8px 0;">Task Report</h1>
      <div class="report-meta" style="margin-bottom:20px;">
        <p><strong>Generated:</strong> <span id="reportDate"></span></p>
        <p><strong>Filters Applied:</strong></p>
        <ul id="reportFilters" style="margin:0;padding-left:20px;"></ul>
      </div>
    </div>
    
    <table class="report-table" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:8px;background:#f0f0f0;">Project</th>
          <th style="border:1px solid #000;padding:8px;background:#f0f0f0;">Task</th>
          <th style="border:1px solid #000;padding:8px;background:#f0f0f0;">Assignees</th>
          <th style="border:1px solid #000;padding:8px;background:#f0f0f0;">Due Date</th>
          <th style="border:1px solid #000;padding:8px;background:#f0f0f0;">Priority</th>
          <th style="border:1px solid #000;padding:8px;background:#f0f0f0;">Status</th>
          <th style="border:1px solid #000;padding:8px;background:#f0f0f0;">Completed</th>
          <th style="border:1px solid #000;padding:8px;background:#f0f0f0;">Description</th>
        </tr>
      </thead>
      <tbody id="reportTableBody">
        <!-- Generated rows -->
      </tbody>
    </table>
    
    <div class="report-footer" style="margin-top:20px;padding-top:10px;border-top:1px solid #000;">
      <p><strong>Total Tasks:</strong> <span id="reportTotal"></span></p>
      <div id="reportStats"></div>
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


// ------------ HELPERS imported from handlers ------------
// esc and formatDate are imported from './handlers'

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

    // --- ASSIGNMENT STATE (Global to effect) ---
    const assignState = {
      proj: null as any,
      stage: '',
      sub: '',
      taskId: '',
      isBulk: false,
      bulkStage: ''
    };

    // --- PHASE 1 FIX: Global debouncing flag to prevent duplicate operations ---
    let isAssignmentInProgress = false;
    let handlersInitialized = false;
    let stagesBoxListenerAttached = false;

    // --- PHASE 1 FIX: Single consolidated assignment handler ---
    // Removed duplicate setTimeout blocks that were causing multiple handler registrations
    function initializeAssignmentHandlers() {
      if (handlersInitialized) {
        console.log('[HANDLERS] Already initialized, skipping');
        return;
      }
      handlersInitialized = true;
      console.log('[HANDLERS] Initializing assignment handlers');

      const btn = container.querySelector('#stAssignBtn') as HTMLButtonElement;
      if (btn) {
        // Use addEventListener instead of onclick to prevent overwriting
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          // --- PHASE 1 FIX: Global debouncing ---
          if (isAssignmentInProgress) {
            console.log('[ASSIGN] Assignment already in progress, ignoring click');
            return;
          }
          if (btn.disabled) return;

          isAssignmentInProgress = true;
          btn.disabled = true;

          try {
            if (!currentUser) {
              toast('Please login first');
              return;
            }

            // Capture state snapshot
            const state = assignState;

            // --- PHASE 1 FIX: Get fresh project reference at execution time ---
            // Instead of using stale closure reference, look up current project
            let proj = state.proj;
            if (!proj && activeProjectName) {
              proj = projects.find(p => p.name === activeProjectName);
              if (proj) {
                console.log('[ASSIGN] Resolved project from activeProjectName:', activeProjectName);
              }
            }

            if (!proj) {
              toast('No project context - please select a project first');
              return;
            }

            // --- PHASE 1 FIX: Validate project still matches active context ---
            if (activeProjectName && proj.name !== activeProjectName) {
              console.warn('[ASSIGN] Project context mismatch, refreshing');
              proj = projects.find(p => p.name === activeProjectName);
              if (!proj) {
                toast('Project context changed - please try again');
                return;
              }
              state.proj = proj;
            }

            // UI Elements - dynamically queried to ensure freshness
            const stageSel = document.getElementById('stAssignStageSel') as HTMLInputElement;
            const subSel = document.getElementById('stAssignSubSel') as HTMLInputElement;
            const dueSel = document.getElementById('stAssignDue') as HTMLInputElement;
            const prioritySel = document.getElementById('stAssignPriority') as HTMLSelectElement;
            const assignList = document.getElementById('stAssignUserMulti');
            const panel = document.getElementById('stAssignPanel');

            const stageName = stageSel?.value || '';
            const subName = subSel?.value || '';
            const dueDate = dueSel?.value || null;
            const priority = prioritySel?.value || 'Medium';

            if (!dueDate) {
              toast('Due date is required');
              return;
            }

            // Permission Check
            const isLead = (proj.lead_ids || []).includes(currentUser.staff_id);
            if (!isAdmin() && !isLead) {
              toast('Only project leads or admins can assign/edit tasks');
              return;
            }

            // --- BULK ASSIGN LOGIC ---
            if (state.isBulk && state.bulkStage) {
              const checked = assignList?.querySelectorAll<HTMLInputElement>('.asgU:checked');
              const assigneeIds: string[] = [];
              checked?.forEach((c) => assigneeIds.push(c.value));
              const assigneeNames = assigneeIds.map(id => {
                const u = (projectUsersCache[proj.id] || []).find(x => x.staff_id === id);
                return u?.name || id;
              });

              if (assigneeIds.length === 0) {
                toast('Select at least one assignee');
                return;
              }

              const result = await bulkAssignTasks(supabase, {
                project: proj,
                stageName: state.bulkStage,
                dueDate: dueDate,
                priority: priority,
                assigneeIds: assigneeIds,
                assigneeNames: assigneeNames,
                currentUser: currentUser,
                existingTasks: tasks // Pass in-memory tasks for dedup check
              });

              if (result.success) {
                // Update local state with new tasks
                result.tasks.forEach(newTask => {
                  const existingIdx = tasks.findIndex(t => t.id === newTask.id);
                  if (existingIdx >= 0) {
                    tasks[existingIdx] = newTask;
                  } else {
                    tasks.push(newTask);
                  }
                });

                toast(`Created ${result.createdCount}, updated ${result.updatedCount} tasks`);
                if (result.skippedCount > 0) {
                  console.warn(`Skipped ${result.skippedCount} invalid sub-stages`);
                }

                if (panel) panel.classList.remove('show');
                state.bulkStage = '';
                state.isBulk = false;
                renderProjectStructure();
              } else {
                toast(result.error || 'Bulk assignment failed');
              }
              return;
            }

            // --- SINGLE / MODIFY LOGIC ---
            if (subName === '(All Sub-stages)' || !subName.trim()) {
              toast('Please select a specific sub-stage');
              return;
            }

            const checked = assignList?.querySelectorAll<HTMLInputElement>('.asgU:checked');
            const assigneeIds: string[] = [];

            checked?.forEach(c => {
              assigneeIds.push(c.value);
            });
            const assigneeNames = assigneeIds.map(id => {
              const u = (projectUsersCache[proj.id] || []).find(x => x.staff_id === id);
              return u?.name || id;
            });

            if (assigneeIds.length === 0 && !state.taskId) {
              toast('Select at least one assignee');
              return;
            }

            if (state.taskId) {
              // UPDATE EXISTING
              const result = await updateTask(supabase, {
                taskId: state.taskId,
                assigneeIds: assigneeIds,
                assigneeNames: assigneeNames,
                dueDate: dueDate,
                priority: priority
              });

              if (result.success) {
                const t = tasks.find(x => x.id === state.taskId);
                if (t) {
                  t.assignee_ids = assigneeIds;
                  t.assignees = assigneeNames;
                  t.due = dueDate;
                  t.priority = priority;
                }
                toast('Task updated');
                if (panel) panel.classList.remove('show');
                renderProjectStructure();
              } else {
                toast('Failed to update task: ' + result.error);
              }
            } else {
              // CREATE NEW
              const title = `${stageName} - ${subName}`;
              const result = await createTask(supabase, {
                projectId: proj.id,
                projectName: proj.name,
                stageId: stageName,
                subId: subName,
                taskTitle: title,
                dueDate: dueDate,
                priority: priority,
                assigneeIds: assigneeIds,
                assigneeNames: assigneeNames,
                createdById: currentUser.staff_id,
                createdByName: currentUser.name
              });

              if (result.success && result.task) {
                tasks.push(result.task);
                toast('Task created');
                if (panel) panel.classList.remove('show');
                renderProjectStructure();
              } else {
                toast('Failed to create task: ' + (result.error || 'Unknown error'));
              }
            }

          } catch (err) {
            console.error('Assign handler error', err);
            toast('Error processing request');
          } finally {
            btn.disabled = false;
            // --- PHASE 1 FIX: Add delay before allowing next operation ---
            setTimeout(() => {
              isAssignmentInProgress = false;
            }, 500);
          }
        });
      }

      // --- PHASE 1 FIX: Global Event Delegation for Sub-Stage Assignment Buttons ---
      // Only attach once to prevent duplicate handlers
      if (!stagesBoxListenerAttached) {
        const stagesBox = container.querySelector('#stagesBox');
        if (stagesBox) {
          stagesBoxListenerAttached = true;
          let isProcessing = false;

          stagesBox.addEventListener('click', async (ev) => {
            const target = ev.target as HTMLElement;
            // Traverse up in case click was on an icon inside the button
            const clickedBtn = target.closest('.sub-assign');
            if (!clickedBtn) return;

            ev.stopPropagation();

            if (isProcessing) {
              console.log('[DELEGATION] Already processing, skipping');
              return;
            }
            isProcessing = true;

            try {
              const stageName = clickedBtn.getAttribute('data-stage') || '';
              const subName = clickedBtn.getAttribute('data-sub') || '';
              const taskId = clickedBtn.getAttribute('data-task-id') || '';

              console.log('[DELEGATION] Opening substage assign:', { stageName, subName, taskId });

              if ((window as any).openSubstageAssign) {
                await (window as any).openSubstageAssign(stageName, subName, taskId);
              } else {
                console.error('openSubstageAssign not ready');
              }
            } catch (e) {
              console.error(e);
            } finally {
              setTimeout(() => { isProcessing = false; }, 300);
            }
          });
        }
      }
    }

    // Initialize handlers after a short delay to ensure DOM is ready
    setTimeout(initializeAssignmentHandlers, 100);

    // ---------- HELPERS ----------
    const el = (id: string) => container.querySelector<HTMLElement>(`#${id}`);

    const STAGE_ORDER = [
      'Preliminary',
      'Municipal',
      'Preliminary BOQ',
      'Architectural Drawings',
      'Structural Drawings',
      'Electrical Drawings',
      'Sanitary Drawings',
      'Site Development Drawing',
      'Outsourcing',
      'Final BOQ'
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

        // Use API route to create notifications (bypasses RLS)
        const response = await fetch('/api/notifications/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifications }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Create task assignment notification error:', error);
        }
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

        // Use API route to create notifications (bypasses RLS)
        const response = await fetch('/api/notifications/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifications }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[NOTIFICATION] Successfully created', result.created || 0, 'notifications');
        } else {
          const error = await response.json();
          console.error('[NOTIFICATION] Insert failed:', error);
        }
      } catch (error) {
        console.error('Create task status notification error:', error);
      }
    }

    // Notify assignees when revisions are requested
    async function notifyAssigneesOfRevision(task: any, revisionComments: string, reviewerName: string) {
      console.log('[NOTIFICATION] notifyAssigneesOfRevision called:', { taskName: task?.task, reviewerName });
      if (!task || !task.assignee_ids || task.assignee_ids.length === 0) return;

      try {
        // Get assignee IDs, excluding the reviewer
        const notifyUsers = task.assignee_ids.filter(
          (id: string) => id !== currentUser?.staff_id
        );

        if (notifyUsers.length === 0) return;

        // Create notifications for each assignee
        const notifications = notifyUsers.map((staffId: string) => ({
          user_id: staffId,
          type: 'TASK_REVISION_REQUESTED',
          title: `Revision requested: ${task.task || 'Untitled'}`,
          body: `${reviewerName} requested revisions for your task in "${task.project_name || 'Unknown'}". Feedback: ${revisionComments}`,
          link_url: `/tasks/${task.id}`,
        }));

        console.log('[NOTIFICATION] Creating revision notifications for assignees:', notifyUsers);
        console.log('[NOTIFICATION] Notification data:', notifications);

        // Use API route to create notifications
        const response = await fetch('/api/notifications/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifications }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[NOTIFICATION] Successfully created', result.created || 0, 'revision notifications');
        } else {
          const error = await response.json();
          console.error('[NOTIFICATION] Revision notification insert failed:', error);
        }
      } catch (error) {
        console.error('Create revision notification error:', error);
      }
    }

    // Notify assignees when task is rejected
    async function notifyAssigneesOfRejection(task: any, rejectionReason: string, reviewerName: string) {
      console.log('[NOTIFICATION] notifyAssigneesOfRejection called:', { taskName: task?.task, reviewerName });
      if (!task || !task.assignee_ids || task.assignee_ids.length === 0) return;

      try {
        // Get assignee IDs, excluding the reviewer
        const notifyUsers = task.assignee_ids.filter(
          (id: string) => id !== currentUser?.staff_id
        );

        if (notifyUsers.length === 0) return;

        // Create notifications for each assignee
        const notifications = notifyUsers.map((staffId: string) => ({
          user_id: staffId,
          type: 'TASK_REJECTED',
          title: `Task rejected: ${task.task || 'Untitled'}`,
          body: `${reviewerName} rejected your task in "${task.project_name || 'Unknown'}". Reason: ${rejectionReason}`,
          link_url: `/tasks/${task.id}`,
        }));

        console.log('[NOTIFICATION] Creating rejection notifications for assignees:', notifyUsers);
        console.log('[NOTIFICATION] Notification data:', notifications);

        // Use API route to create notifications
        const response = await fetch('/api/notifications/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifications }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[NOTIFICATION] Successfully created', result.created || 0, 'rejection notifications');
        } else {
          const error = await response.json();
          console.error('[NOTIFICATION] Rejection notification insert failed:', error);
        }
      } catch (error) {
        console.error('Create rejection notification error:', error);
      }
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
    const kanbanUpdatingTasks = new Set<string>(); // Prevent double updates

    async function changeTaskStatusFromKanban(taskId: string, newStatus: string) {
      // Prevent concurrent updates to same task
      if (kanbanUpdatingTasks.has(taskId)) {
        console.log('Task update already in progress:', taskId);
        return;
      }

      const task = tasks.find((t) => String(t.id) === String(taskId));
      if (!task) return;

      // Skip if status is the same
      if (task.status === newStatus) return;

      kanbanUpdatingTasks.add(taskId);

      if (!currentUser) {
        toast('Please login first');
        kanbanUpdatingTasks.delete(taskId);
        return;
      }

      if (!isAssignee(task.assignee_ids) && !isAdmin() && !isProjectLeadFor(task.project_id || '')) {
        toast('Only assignees, leads or admins can move this task');
        kanbanUpdatingTasks.delete(taskId);
        return;
      }

      // If moving to "Needs Revision", prompt for comments
      if (newStatus === 'Needs Revision') {
        kanbanUpdatingTasks.delete(taskId);

        // Set selected task and open revision modal
        selectedTask = task;
        if (revisionComments) revisionComments.value = '';
        if (revisionTaskInfo) {
          revisionTaskInfo.innerHTML = `
            <strong>Project:</strong> ${esc(task.project_name)}<br>
            <strong>Task:</strong> ${esc(task.task)}<br>
            <strong>Assignees:</strong> ${esc((task.assignees || []).join(', '))}
          `;
        }
        showModal(revisionModal);
        renderKanban(); // Reset UI in case drag didn't complete
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
        kanbanUpdatingTasks.delete(taskId);
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

      // Re-render Kanban board and Task List immediately
      renderKanban();
      renderTasks();
      updateKanbanCounts();

      // Release the lock
      kanbanUpdatingTasks.delete(taskId);
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
    const tabWorkload = el('tabWorkload');
    const viewWorkload = el('viewWorkload');
    const workloadContent = el('workloadContent');
    const viewTasks = el('viewTasks');
    const viewKanban = el('viewKanban');
    const viewStages = el('viewStages');

    const workloadSearch = el('workloadSearch') as HTMLInputElement | null;
    const workloadSort = el('workloadSort') as HTMLSelectElement | null;

    function selectTab(which: 'tasks' | 'kanban' | 'stages' | 'workload') {
      const map: Record<
        string,
        { tab: HTMLElement | null; view: HTMLElement | null }
      > = {
        tasks: { tab: tabTasks, view: viewTasks },
        kanban: { tab: tabKanban, view: viewKanban },
        stages: { tab: tabStages, view: viewStages },
        workload: { tab: tabWorkload, view: viewWorkload },
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
      if (which === 'workload') renderWorkloadAnalysis();
    }

    tabTasks && tabTasks.addEventListener('click', () => selectTab('tasks'));
    tabKanban && tabKanban.addEventListener('click', () => selectTab('kanban'));
    tabStages && tabStages.addEventListener('click', () => selectTab('stages'));
    tabWorkload && tabWorkload.addEventListener('click', () => selectTab('workload'));

    workloadSearch && workloadSearch.addEventListener('input', () => renderWorkloadAnalysis());
    workloadSort && workloadSort.addEventListener('change', () => renderWorkloadAnalysis());

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
    const reportsEntry = el('reportsEntry');
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

    reportsEntry &&
      reportsEntry.addEventListener('click', () => {
        window.location.href = '/reports';
      });

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
          // Update the passcode (stored as plain text 4-digit PIN)
          const { error } = await supabase
            .from('users')
            .update({ passcode: newPassword })
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
      // Capture current values
      const currentFilterVal = filterAssignee ? filterAssignee.value : '';
      const currentKbFilterVal = kbFilterAssignee ? kbFilterAssignee.value : '';

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

      const html = options.join('');

      if (filterAssignee) {
        filterAssignee.innerHTML = html;
        // Restore value if it exists in the new options
        if (currentFilterVal && (currentFilterVal === '' || names.has(currentFilterVal))) {
          filterAssignee.value = currentFilterVal;
        }
      }
      if (kbFilterAssignee) {
        kbFilterAssignee.innerHTML = html;
        // Restore value if it exists in the new options
        if (currentKbFilterVal && (currentKbFilterVal === '' || names.has(currentKbFilterVal))) {
          kbFilterAssignee.value = currentKbFilterVal;
        }
      }
    }

    // ---------- SMART WORKLOAD ANALYSIS ----------
    function renderWorkloadAnalysis() {
      if (!workloadContent) return;
      workloadContent.innerHTML = '';

      if (!isAdmin()) {
        workloadContent.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;font-weight:600;">Access Denied: Only Admins can view workload analysis.</div>`;
        return;
      }

      // 1. Calculate stats by employee
      const empStats: Record<string, any> = {};

      // Initialize with all users
      allUsers.forEach(u => {
        if (u.status === 'deactivated') return;
        empStats[u.name || u.staff_id] = {
          name: u.name || u.staff_id,
          level: u.level || 'Staff',
          totalTasks: 0,
          pending: 0,
          inProgress: 0,
          revision: 0,
          complete: 0,
          highPrio: 0,
          overdue: 0,
          projects: new Set()
        };
      });

      // Aggregate task data
      const now = new Date();
      tasks.forEach(task => {
        const assignees = task.assignees || [];
        assignees.forEach((name: string) => {
          if (!empStats[name]) {
            // Fallback for names not in users list
            empStats[name] = {
              name: name,
              level: 'Member',
              totalTasks: 0,
              pending: 0,
              inProgress: 0,
              revision: 0,
              complete: 0,
              highPrio: 0,
              overdue: 0,
              projects: new Set()
            };
          }

          const stats = empStats[name];
          stats.totalTasks++;

          if (task.status === 'Complete') stats.complete++;
          else if (task.status === 'In Progress') stats.inProgress++;
          else if (task.status === 'Needs Revision') stats.revision++;
          else stats.pending++;

          if (task.priority === 'High') stats.highPrio++;

          if (task.status !== 'Complete' && task.due && new Date(task.due) < now) {
            stats.overdue++;
          }

          if (task.project_id) stats.projects.add(task.project_id);
        });
      });

      // Calculate aggregate data for top cards
      const activeTasksList = tasks.filter(t => t.status !== 'Complete');
      const allActiveTasks = activeTasksList.length;
      const totalCapacity = allUsers.filter(u => u.status !== 'deactivated').length * 10; // Simple baseline
      const workloadPercentage = totalCapacity > 0 ? Math.round((allActiveTasks / totalCapacity) * 100) : 0;

      // 2. Render Top Summary Cards
      const summaryHtml = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${allActiveTasks}</div>
            <div class="stat-label">Total Active Tasks</div>
          </div>
          <div class="stat-card" style="border-left-color: ${workloadPercentage > 81 ? '#ef4444' : '#10b981'};">
            <div class="stat-value">${workloadPercentage}%</div>
            <div class="stat-label">Studio Capacity Load</div>
          </div>
          <div class="stat-card" style="border-left-color: #f59e0b;">
            <div class="stat-value">${tasks.filter(t => t.status !== 'Complete' && t.due && new Date(t.due) < now).length}</div>
            <div class="stat-label">Overdue Tasks</div>
          </div>
          <div class="stat-card" style="border-left-color: #3b82f6;">
            <div class="stat-value">${projects.filter(p => !p.project_status || p.project_status === 'Ongoing' || p.project_status === 'Active').length}</div>
            <div class="stat-label">Active Projects</div>
          </div>
        </div>
      `;

      // 3. Render Employee Cards
      const employeeGrid = document.createElement('div');
      employeeGrid.className = 'employee-workload-grid';

      const query = (workloadSearch?.value || '').toLowerCase().trim();
      const sortBy = workloadSort?.value || 'load';

      const filteredStats = Object.values(empStats).filter((s: any) => {
        if (!query) return true;
        return s.name.toLowerCase().includes(query) || s.level.toLowerCase().includes(query);
      });

      if (filteredStats.length === 0) {
        employeeGrid.innerHTML = `<div style="grid-column: 1 / -1; padding: 60px; text-align: center; background: #f8fafc; border-radius: 8px; border: 1px dashed var(--line-hair);">
          <div style="font-size: 16px; font-weight: 600; color: var(--muted);">No workers found matching "${esc(query)}"</div>
          <p class="small muted" style="margin-top: 4px;">Try a different name or level (e.g. Designer, Admin).</p>
        </div>`;
      } else {
        filteredStats
          .sort((a: any, b: any) => {
            const aActive = a.inProgress + a.pending + a.revision;
            const bActive = b.inProgress + b.pending + b.revision;

            if (sortBy === 'tasks') return bActive - aActive;
            if (sortBy === 'overdue') return b.overdue - a.overdue;
            if (sortBy === 'name') return a.name.localeCompare(b.name);

            // default: load score
            const aScore = (aActive * 1.5) + (a.highPrio * 2) + (a.overdue * 3);
            const bScore = (bActive * 1.5) + (b.highPrio * 2) + (b.overdue * 3);
            return bScore - aScore;
          })
          .forEach((stats: any) => {
            const activeCount = stats.inProgress + stats.pending + stats.revision;
            // Heuristic for load score
            const loadScore = (activeCount * 1.5) + (stats.highPrio * 2) + (stats.overdue * 3);
            const loadStatus = loadScore > 15 ? 'High' : loadScore > 8 ? 'Moderate' : 'Optimal';
            const loadClass = loadScore > 15 ? 'load-high' : loadScore > 8 ? 'load-med' : 'load-low';
            const loadWidth = Math.min((loadScore / 25) * 100, 100);

            const card = document.createElement('div');
            card.className = 'workload-card';
            card.innerHTML = `
              <div class="workload-card-header">
                <div class="emp-name">${esc(stats.name)}</div>
                <div class="emp-level">${esc(stats.level)}</div>
              </div>
              <div class="workload-card-body">
                <div class="workload-metric">
                  <div class="metric-header">
                    <span>Capacity: <strong>${loadStatus}</strong></span>
                    <span>${activeCount} Active Tasks</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill ${loadClass}" style="width: ${loadWidth}%"></div>
                  </div>
                </div>

                <div class="status-pills">
                  <div class="status-pill pill-pending">Pending: ${stats.pending}</div>
                  <div class="status-pill pill-progress">Progress: ${stats.inProgress}</div>
                  <div class="status-pill pill-revision">Revision: ${stats.revision}</div>
                  <div class="status-pill pill-complete">Completed: ${stats.complete}</div>
                </div>

                <div style="margin-top:16px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                   <div style="background:#f8fafc; padding:8px; border-radius:4px; text-align:center;">
                      <div style="font-size:16px; font-weight:800; color:#ef4444;">${stats.overdue}</div>
                      <div style="font-size:9px; text-transform:uppercase; color:var(--muted); font-weight:700;">Overdue</div>
                   </div>
                   <div style="background:#f8fafc; padding:8px; border-radius:4px; text-align:center;">
                      <div style="font-size:16px; font-weight:800; color:#3b82f6;">${stats.projects.size}</div>
                      <div style="font-size:9px; text-transform:uppercase; color:var(--muted); font-weight:700;">Active Proj</div>
                   </div>
                </div>
              </div>
              <div class="workload-card-footer" style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center;">
                  <svg xmlns="http://www.w3.org/2000/svg" height="12" width="12" viewBox="0 -960 960 960" fill="currentColor" style="vertical-align:middle;margin-right:2px;">
                    <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                  </svg>
                  ${stats.highPrio} high priority
                </div>
                <div style="text-decoration:underline; font-weight:700; color:var(--accent);">View Details &rarr;</div>
              </div>
            `;
            card.style.cursor = 'pointer';
            card.onclick = () => openWorkloadDetailModal(stats.name);
            employeeGrid.appendChild(card);
          });
      }

      workloadContent.innerHTML = summaryHtml;
      workloadContent.appendChild(employeeGrid);
    }

    function openWorkloadDetailModal(name: string) {
      if (!workloadDetailModal) return;

      const stats = calculateIndividualStats(name);
      renderWorkloadDetails(stats);
      showModal(workloadDetailModal);
    }

    function calculateIndividualStats(name: string) {
      const user = allUsers.find(u => u.name === name || u.staff_id === name);
      const userTasks = tasks.filter(t => (t.assignees || []).includes(name));
      const now = new Date();

      const stats = {
        name: name,
        level: user?.level || 'Staff',
        total: userTasks.length,
        pending: userTasks.filter(t => t.status === 'Pending' || !t.status).length,
        inProgress: userTasks.filter(t => t.status === 'In Progress').length,
        revision: userTasks.filter(t => t.status === 'Needs Revision').length,
        complete: userTasks.filter(t => t.status === 'Complete').length,
        overdue: userTasks.filter(t => t.status !== 'Complete' && t.due && new Date(t.due) < now).length,
        highPrio: userTasks.filter(t => t.priority === 'High' && t.status !== 'Complete').length,
        tasksByProject: {} as Record<string, any[]>
      };

      userTasks.forEach(t => {
        const pName = t.project_name || 'Unassigned';
        if (!stats.tasksByProject[pName]) stats.tasksByProject[pName] = [];
        stats.tasksByProject[pName].push(t);
      });

      return stats;
    }

    function renderWorkloadDetails(stats: any) {
      if (!wdName || !wdLevel || !wdAvatar || !wdSummary || !wdTaskGroupList) return;

      wdName.textContent = stats.name;
      wdLevel.textContent = stats.level;
      wdAvatar.textContent = stats.name.charAt(0).toUpperCase();

      const activeCount = stats.pending + stats.inProgress + stats.revision;
      const completionRate = stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0;

      wdSummary.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${activeCount}</div>
          <div class="stat-label">Active Tasks</div>
        </div>
        <div class="stat-card" style="border-left-color:#ef4444;">
          <div class="stat-value">${stats.overdue}</div>
          <div class="stat-label">Overdue Items</div>
        </div>
        <div class="stat-card" style="border-left-color:#10b981;">
          <div class="stat-value">${completionRate}%</div>
          <div class="stat-label">Overall Completion</div>
        </div>
        <div class="stat-card" style="border-left-color:#3b82f6;">
          <div class="stat-value">${Object.keys(stats.tasksByProject).length}</div>
          <div class="stat-label">Total Projects</div>
        </div>
      `;

      let groupsHtml = '';
      Object.entries(stats.tasksByProject).forEach(([pName, pTasks]) => {
        const activeProjTasks = (pTasks as any[]).filter(t => t.status !== 'Complete');
        if (activeProjTasks.length === 0) return; // Only show projects with active tasks in detail? Or all? Let's show all for now.

        const tasksHtml = (pTasks as any[]).map(t => {
          const isOverdue = t.status !== 'Complete' && t.due && new Date(t.due) < new Date();
          const statusClass = t.status === 'Complete' ? 'pill-complete' :
            t.status === 'In Progress' ? 'pill-progress' :
              t.status === 'Needs Revision' ? 'pill-revision' : 'pill-pending';

          return `
            <div class="wd-task-row" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9;">
              <div style="flex:1;">
                <div style="font-size:12px; font-weight:600; color:var(--accent);">${esc(t.task)}</div>
                <div style="font-size:10px; color:var(--muted); margin-top:2px;">
                  Due: <span style="${isOverdue ? 'color:#ef4444;font-weight:700;' : ''}">${esc(formatDate(t.due))}</span>
                  ${t.priority === 'High' ? ' | <span style="color:#ef4444;font-weight:700;">HIGH PRIORITY</span>' : ''}
                </div>
              </div>
              <div class="status-pill ${statusClass}">${esc(t.status || 'Pending')}</div>
            </div>
          `;
        }).join('');

        groupsHtml += `
          <div class="card" style="padding:12px; border:1px solid #e2e8f0; background:white;">
            <h5 style="margin:0 0 10px 0; font-size:12px; color:var(--accent); display:flex; justify-content:space-between;">
              <span>Project: <strong>${esc(pName)}</strong></span>
              <span class="small muted">${(pTasks as any[]).length} total tasks</span>
            </h5>
            <div style="display:flex; flex-direction:column;">
              ${tasksHtml}
            </div>
          </div>
        `;
      });

      wdTaskGroupList.innerHTML = groupsHtml || '<div class="small muted" style="text-align:center; padding:20px;">No active tasks found for this employee.</div>';
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

        // Normalize status (UI 'Completed' -> DB 'Complete')
        const targetStatus = statusFilter === 'Completed' ? 'Complete' : statusFilter;
        const taskStatus = t.status || 'Pending';

        return taskStatus === targetStatus;
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
          ${isAdmin() ? `<td style="text-align:center;"><input type="checkbox" class="task-checkbox" data-task-id="${esc(t.id)}" style="cursor:pointer;"></td>` : ''}
          <td>${esc(t.project_name || '')}</td>
          <td>
            ${esc(t.task)}
            ${t.current_status
              ? `<div class="small muted">${esc(t.current_status)}</div>`
              : ''
            }
          </td>
          <td>${assigneesHtml}</td>
          <td>
            ${t.status === 'Complete'
              ? `<div>Due: ${esc(dueStr)}</div><div class="small" style="color:#10b981;">Completed on: ${esc(formatDate(t.completed_at || ''))}</div>`
              : esc(dueStr)
            }
          </td>
          <td>${esc(t.priority || '')}</td>
          <td>
            ${esc(t.description || '')}
            <div class="small muted" style="margin-top:2px">${esc(t.status || 'Pending')}</div>
          </td>
          <td style="text-align:right; display:flex; gap:4px; justify-content:flex-end; flex-wrap:wrap;">

            <button class="btn-sm act-status" data-id="${esc(t.id)}">Status</button>
            <button class="btn-sm act-reschedule" data-id="${esc(
              t.id,
            )}">Resched</button>
            ${
            // Show appropriate action button based on status and role
            t.status === 'Needs Revision' && isAssignee(t.assignee_ids)
              ? `<button class="btn-sm act-complete" data-id="${esc(t.id)}">Resubmit</button>`
              : t.status !== 'Complete' && t.status !== 'Rejected' && isAssignee(t.assignee_ids)
                ? `<button class="btn-sm act-complete" data-id="${esc(t.id)}">Mark Complete</button>`
                : t.status === 'Complete'
                  ? '<span class="small success">✓ Completed</span>'
                  : t.status === 'Rejected'
                    ? '<span class="small" style="color:#ef4444;">✗ Rejected</span>'
                    : t.status === 'Needs Revision'
                      ? '<span class="small" style="color:#f59e0b;">🔄 Needs Revision</span>'
                      : ''
            }
            <button class="btn-sm act-edit" data-id="${esc(t.id)}">Edit</button>
            <button class="btn-sm act-history" data-id="${esc(t.id)}">Log</button>
            ${isAdmin() ? `<button class="btn-sm btn-danger act-delete" data-id="${esc(t.id)}" title="Delete task (Admin only)">Delete</button>` : ''}
          </td>
        `;

          body.appendChild(tr);
        });
    }

    // ---------- RENDER KANBAN ----------
    function renderKanban() {
      const colPending = el('colPending');
      const colProgress = el('colProgress');
      const colRevision = el('colRevision');
      const colDone = el('colDone');
      if (!colPending || !colProgress || !colRevision || !colDone) return;

      colPending.innerHTML = '';
      colProgress.innerHTML = '';
      colRevision.innerHTML = '';
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
        if (statusFilter === 'Needs Revision') return t.status === 'Needs Revision';
        if (statusFilter === 'Rejected') return t.status === 'Rejected';
        if (statusFilter === 'Pending') {
          return t.status === 'Pending' || (!t.status);
        }
        return t.status === statusFilter;
      });

      filtered.forEach((t) => {
        const card = document.createElement('div');
        card.className = 'kcard';
        card.dataset.id = t.id;
        card.dataset.priority = t.priority || 'Medium';
        card.draggable = true;

        const dueStr = formatDate(t.due);

        card.innerHTML = `
        <div class="kcard-content">
          <div class="kcard-main">
            <div class="kcard-title">${esc(t.task)}</div>
            <div class="kcard-project">${esc(t.project_name || '')}</div>
            
            <div class="assignee-line">
              ${(t.assignees || [])
            .map(nm => `<span class="chip chip-assignee">${esc(nm)}</span>`)
            .join('')}
            </div>

            <div class="kcard-footer">
              <span class="kcard-date">
                <svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 -960 960 960" fill="currentColor">
                  <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-840h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z"/>
                </svg>
                ${t.status === 'Complete'
            ? `Due: ${esc(dueStr)} | Completed on: ${esc(formatDate(t.completed_at || ''))}`
            : esc(dueStr)
          }
              </span>
              <span class="badge badge-prio-${t.priority?.toLowerCase() || 'medium'}">${esc(t.priority || 'Medium')}</span>
            </div>

            ${t.status === 'Needs Revision'
            ? `<div class="kcard-revision">
                  <strong>Revision:</strong> ${esc(t.review_comments || '')}
                 </div>`
            : ''}
          </div>
        </div>
      `;

        const status = t.status || 'Pending';
        if (status === 'Complete') colDone.appendChild(card);
        else if (status === 'Needs Revision') colRevision.appendChild(card);
        else if (status === 'In Progress') colProgress.appendChild(card);
        else colPending.appendChild(card);

        card.addEventListener('dragstart', (ev) => {
          ev.dataTransfer?.setData('text/plain', String(t.id));
          if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
          card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
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
    function updateKanbanCounts() {
      const countPending = el('countPending');
      const countProgress = el('countProgress');
      const countReview = el('countReview');
      const countDone = el('countDone');

      if (countPending) {
        const pendingCards = container.querySelectorAll('#colPending .kcard').length;
        countPending.textContent = pendingCards.toString();
      }
      if (countProgress) {
        const progressCards = container.querySelectorAll('#colProgress .kcard').length;
        countProgress.textContent = progressCards.toString();
      }
      if (countReview) {
        const revisionCards = container.querySelectorAll('#colRevision .kcard').length;
        countReview.textContent = reviewCards.toString();
      }
      if (countDone) {
        const doneCards = container.querySelectorAll('#colDone .kcard').length;
        countDone.textContent = doneCards.toString();
      }
    }

    // Setup Kanban Drop Listeners (Run once on mount)
    function setupKanbanListeners() {
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
    setupKanbanListeners();

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
                const wasUnread = item.classList.contains('unread');

                // Optimistic UI update - immediately mark as read visually
                if (wasUnread) {
                  item.classList.remove('unread');

                  // Update badge count immediately
                  if (notificationBadge) {
                    const currentCount = parseInt(notificationBadge.textContent || '0', 10);
                    const newCount = Math.max(0, currentCount - 1);
                    if (newCount === 0) {
                      notificationBadge.style.display = 'none';
                    } else {
                      notificationBadge.textContent = newCount.toString();
                    }
                  }
                }

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

                // Close dropdown
                if (notificationDropdown) {
                  notificationDropdown.style.display = 'none';
                }

                // Handle navigation within SPA
                if (link && link.startsWith('/tasks/')) {
                  // Extract task ID from link like "/tasks/uuid"
                  const taskId = link.replace('/tasks/', '');

                  // Switch to Tasks tab
                  selectTab('tasks');

                  // Find and highlight the task (brief flash effect)
                  setTimeout(() => {
                    const taskRow = container.querySelector(`tr[data-id="${taskId}"]`);
                    if (taskRow) {
                      taskRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      taskRow.classList.add('highlight-flash');
                      setTimeout(() => taskRow.classList.remove('highlight-flash'), 2000);
                    } else {
                      // Task might be filtered out - clear filters and try again
                      const filterStatusEl = el('filterStatus') as HTMLSelectElement | null;
                      const filterSearchEl = el('filterSearch') as HTMLInputElement | null;

                      if (filterStatusEl) filterStatusEl.value = '';
                      if (filterSearchEl) filterSearchEl.value = '';

                      renderTasks();

                      setTimeout(() => {
                        const retryRow = container.querySelector(`tr[data-id="${taskId}"]`);
                        if (retryRow) {
                          retryRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          retryRow.classList.add('highlight-flash');
                          setTimeout(() => retryRow.classList.remove('highlight-flash'), 2000);
                        } else {
                          toast('Task not found or may have been deleted');
                        }
                      }, 100);
                    }
                  }, 100);
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

        // Optimistic UI update - immediately update badge and items
        if (notificationBadge) {
          notificationBadge.textContent = '0';
          notificationBadge.style.display = 'none';
        }

        // Remove unread class from all items immediately
        if (notificationList) {
          notificationList.querySelectorAll('.notification-item.unread').forEach((item) => {
            item.classList.remove('unread');
          });
        }

        try {
          const response = await fetch('/api/notifications/mark-all-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.staff_id }),
          });

          if (!response.ok) {
            console.error('Mark all as read failed:', response.status);
            // Reload to get actual state on error
            await loadNotifications();
          }
        } catch (error) {
          console.error('Mark all as read error:', error);
          // Reload to get actual state on error
          await loadNotifications();
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
          div.setAttribute('draggable', 'true');
          div.innerHTML = `
            <span class="drag-handle sub-drag" title="Drag to reorder">
              <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor"><path d="M360-160q-33 0-56.5-23.5T280-240q0-33 23.5-56.5T360-320q33 0 56.5 23.5T440-240q0 33-23.5 56.5T360-160Zm240 0q-33 0-56.5-23.5T520-240q0-33 23.5-56.5T600-320q33 0 56.5 23.5T680-240q0 33-23.5 56.5T600-160ZM360-400q-33 0-56.5-23.5T280-480q0-33 23.5-56.5T360-560q33 0 56.5 23.5T440-480q0 33-23.5 56.5T360-400Zm240 0q-33 0-56.5-23.5T520-480q0-33 23.5-56.5T600-560q33 0 56.5 23.5T680-480q0 33-23.5 56.5T600-400ZM360-640q-33 0-56.5-23.5T280-720q0-33 23.5-56.5T360-800q33 0 56.5 23.5T440-720q0 33-23.5 56.5T360-640Zm240 0q-33 0-56.5-23.5T520-720q0-33 23.5-56.5T600-800q33 0 56.5 23.5T680-720q0 33-23.5 56.5T600-640Z"/></svg>
            </span>
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

          // Wire drag events for this new sub-stage
          wireSubRowDrag(div, subList);

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

      // ===== DRAG AND DROP FOR STAGES =====
      const stageDragHandle = row.querySelector<HTMLElement>('.stage-drag');

      if (stageDragHandle) {
        let isDragging = false;

        stageDragHandle.addEventListener('mousedown', () => {
          isDragging = true;
        });

        row.addEventListener('dragstart', (e) => {
          if (!isDragging) {
            e.preventDefault();
            return;
          }
          row.classList.add('dragging');
          e.dataTransfer?.setData('text/plain', 'stage');
          e.dataTransfer!.effectAllowed = 'move';
        });

        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          isDragging = false;
          // Remove all drag-over classes
          document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          const dragging = document.querySelector('.editor-stage-card.dragging') as HTMLElement;
          if (dragging && dragging !== row) {
            row.classList.add('drag-over');
          }
        });

        row.addEventListener('dragleave', () => {
          row.classList.remove('drag-over');
        });

        row.addEventListener('drop', (e) => {
          e.preventDefault();
          row.classList.remove('drag-over');
          const dragging = document.querySelector('.editor-stage-card.dragging') as HTMLElement;
          if (dragging && dragging !== row) {
            const parent = row.parentElement;
            if (parent) {
              // Determine if we should insert before or after
              const rect = row.getBoundingClientRect();
              const midY = rect.top + rect.height / 2;
              if (e.clientY < midY) {
                parent.insertBefore(dragging, row);
              } else {
                parent.insertBefore(dragging, row.nextSibling);
              }
            }
          }
        });
      }

      // ===== DRAG AND DROP FOR SUB-STAGES =====
      if (subList) {
        subList.querySelectorAll<HTMLElement>('.editor-sub-row').forEach((subRow) => {
          wireSubRowDrag(subRow, subList);
        });
      }
    }

    // Wire drag events for a sub-stage row
    function wireSubRowDrag(subRow: HTMLElement, subList: HTMLElement) {
      const subDragHandle = subRow.querySelector<HTMLElement>('.sub-drag');
      if (!subDragHandle) return;

      let isDragging = false;

      subDragHandle.addEventListener('mousedown', () => {
        isDragging = true;
      });

      subRow.addEventListener('dragstart', (e) => {
        e.stopPropagation(); // Prevent triggering stage drag
        if (!isDragging) {
          e.preventDefault();
          return;
        }
        subRow.classList.add('dragging');
        e.dataTransfer?.setData('text/plain', 'substage');
        e.dataTransfer!.effectAllowed = 'move';
      });

      subRow.addEventListener('dragend', () => {
        subRow.classList.remove('dragging');
        isDragging = false;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });

      subRow.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dragging = subList.querySelector('.editor-sub-row.dragging') as HTMLElement;
        if (dragging && dragging !== subRow) {
          subRow.classList.add('drag-over');
        }
      });

      subRow.addEventListener('dragleave', () => {
        subRow.classList.remove('drag-over');
      });

      subRow.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        subRow.classList.remove('drag-over');
        const dragging = subList.querySelector('.editor-sub-row.dragging') as HTMLElement;
        if (dragging && dragging !== subRow) {
          const rect = subRow.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const addBtn = subList.querySelector('.sub-add');
          if (e.clientY < midY) {
            subList.insertBefore(dragging, subRow);
          } else {
            subList.insertBefore(dragging, subRow.nextSibling === addBtn ? addBtn : subRow.nextSibling);
          }
        }
      });
    }

    // Helper to create the DOM structure for a stage row
    function createStageRowDOM(stageName = '', subStages: string[] = []) {
      const subsHtml = subStages
        .map(
          (s) => `
            <div class="editor-sub-row" draggable="true">
              <span class="drag-handle sub-drag" title="Drag to reorder">
                <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor"><path d="M360-160q-33 0-56.5-23.5T280-240q0-33 23.5-56.5T360-320q33 0 56.5 23.5T440-240q0 33-23.5 56.5T360-160Zm240 0q-33 0-56.5-23.5T520-240q0-33 23.5-56.5T600-320q33 0 56.5 23.5T680-240q0 33-23.5 56.5T600-160ZM360-400q-33 0-56.5-23.5T280-480q0-33 23.5-56.5T360-560q33 0 56.5 23.5T440-480q0 33-23.5 56.5T360-400Zm240 0q-33 0-56.5-23.5T520-480q0-33 23.5-56.5T600-560q33 0 56.5 23.5T680-480q0 33-23.5 56.5T600-400ZM360-640q-33 0-56.5-23.5T280-720q0-33 23.5-56.5T360-800q33 0 56.5 23.5T440-720q0 33-23.5 56.5T360-640Zm240 0q-33 0-56.5-23.5T520-720q0-33 23.5-56.5T600-800q33 0 56.5 23.5T680-720q0 33-23.5 56.5T600-640Z"/></svg>
              </span>
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
      div.setAttribute('draggable', 'true');
      div.innerHTML = `
        <div class="editor-stage-header">
          <span class="drag-handle stage-drag" title="Drag to reorder">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M360-160q-33 0-56.5-23.5T280-240q0-33 23.5-56.5T360-320q33 0 56.5 23.5T440-240q0 33-23.5 56.5T360-160Zm240 0q-33 0-56.5-23.5T520-240q0-33 23.5-56.5T600-320q33 0 56.5 23.5T680-240q0 33-23.5 56.5T600-160ZM360-400q-33 0-56.5-23.5T280-480q0-33 23.5-56.5T360-560q33 0 56.5 23.5T440-480q0 33-23.5 56.5T360-400Zm240 0q-33 0-56.5-23.5T520-480q0-33 23.5-56.5T600-560q33 0 56.5 23.5T680-480q0 33-23.5 56.5T600-400ZM360-640q-33 0-56.5-23.5T280-720q0-33 23.5-56.5T360-800q33 0 56.5 23.5T440-720q0 33-23.5 56.5T360-640Zm240 0q-33 0-56.5-23.5T520-720q0-33 23.5-56.5T600-800q33 0 56.5 23.5T680-720q0 33-23.5 56.5T600-640Z"/></svg>
          </span>
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

        // Use canonical sort
        plan = sortStagesByOrder(plan);

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
          .neq('status', 'deactivated')
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

    // ---------- WORKLOAD DETAIL MODAL ----------
    const workloadDetailModal = el('workloadDetailModal');
    const wdName = el('wdName');
    const wdLevel = el('wdLevel');
    const wdAvatar = el('wdAvatar');
    const wdSummary = el('wdSummary');
    const wdTaskGroupList = el('wdTaskGroupList');
    const wdClose = el('wdClose');
    const wdCloseBtn = el('wdCloseBtn');

    wdClose && wdClose.addEventListener('click', () => hideModal(workloadDetailModal));
    wdCloseBtn && wdCloseBtn.addEventListener('click', () => hideModal(workloadDetailModal));

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
        .order('changed_at', { ascending: true });

      if (error) {
        console.error('Load history error', error);
        historyBody.innerHTML =
          '<div class="small muted">Could not load history.</div>';
        return;
      }

      const creationTs = task.created_at
        ? new Date(task.created_at).toLocaleString()
        : '';
      const creator = task.created_by_name || task.created_by_id || 'Unknown';
      const assignedTo = (task.assignees && task.assignees.length)
        ? task.assignees.join(', ')
        : (task.assignee_ids || []).join(', ');

      const assignedEntry = `
        <div class="history-item" style="background:#f9f9f9; border-bottom:1px solid #eee;">
          <div class="small muted">${esc(creationTs)} — ${esc(creator)}</div>
          <div><strong>Task Assigned</strong> to ${esc(assignedTo)}</div>
        </div>
        <div style="text-align:center; color:#999; margin:8px 0; font-size:18px;">↓</div>
      `;

      if (!data || data.length === 0) {
        historyBody.innerHTML = assignedEntry +
          '<div class="small muted" style="margin-top:10px">No status changes yet.</div>';
        return;
      }

      const uniqueData = (data || []).filter((item, index, self) => {
        if (index === 0) return true;
        const prev = self[index - 1];

        // Round timestamps to nearest second for comparison
        const t1 = Math.floor(new Date(item.changed_at).getTime() / 1000);
        const t2 = Math.floor(new Date(prev.changed_at).getTime() / 1000);

        // Check if this is a duplicate: same action, statuses, actor, and within same second
        const isSame = (item.action === prev.action) &&
          (item.from_status === prev.from_status) &&
          (item.to_status === prev.to_status) &&
          (item.changed_by_id === prev.changed_by_id) &&
          (Math.abs(t1 - t2) <= 1); // Within 1 second (rounded)

        return !isSame;
      });

      const logHtml = uniqueData
        .map((row: any, index: number) => {
          const ts = row.changed_at
            ? new Date(row.changed_at).toLocaleString()
            : '';
          const actor = row.changed_by_name || row.changed_by_id || 'Unknown';
          const from = row.from_status || '-';
          const to = row.to_status || '-';
          const note = row.note || '';

          // Add flow arrow between entries (except after last one)
          const flowArrow = index < uniqueData.length - 1
            ? '<div style="text-align:center; color:#999; margin:8px 0; font-size:18px;">↓</div>'
            : '';

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
          ${flowArrow}
        `;
        })
        .join('');

      historyBody.innerHTML = assignedEntry + logHtml;
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
        } else if (target.classList.contains('act-request-revision')) {
          if (revisionComments) revisionComments.value = '';
          if (revisionTaskInfo) {
            revisionTaskInfo.innerHTML = `
              <strong>Project:</strong> ${esc(task.project_name)}<br>
              <strong>Task:</strong> ${esc(task.task)}<br>
              <strong>Assignees:</strong> ${esc((task.assignees || []).join(', '))}
            `;
          }
          showModal(revisionModal);
        } else if (target.classList.contains('act-review')) {
          if (reviewComments) reviewComments.value = '';
          if (reviewTaskInfo) {
            let infoHtml = `
              <strong>Project:</strong> ${esc(task.project_name)}<br>
              <strong>Task:</strong> ${esc(task.task)}<br>
              <strong>Assignees:</strong> ${esc((task.assignees || []).join(', '))}
            `;

            if (task.reviewed_by) {
              infoHtml += `<br><strong>Last Reviewed By:</strong> ${esc(task.reviewed_by)}`;
            }

            if (task.review_comments && task.status === 'Under Review') {
              infoHtml += `<br><br><div style="padding:8px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:4px;margin-top:8px;">
                <strong>Previous Feedback:</strong><br>
                <span style="font-size:12px;">${esc(task.review_comments)}</span>
              </div>`;
            }

            reviewTaskInfo.innerHTML = infoHtml;
          }
          if (reviewAction) reviewAction.value = 'Approve';
          if (revisionNoteSection) revisionNoteSection.style.display = 'none';
          showModal(reviewModal);
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
        } else if (target.classList.contains('act-delete')) {
          // Delete task - Admin only
          if (!isAdmin()) {
            toast('Only admins can delete tasks');
            return;
          }

          // Confirm deletion
          const confirmMsg = `Are you sure you want to delete this task?\n\nProject: ${task.project_name}\nTask: ${task.task}\n\nThis action cannot be undone.`;
          if (!confirm(confirmMsg)) {
            return;
          }

          // Delete the task
          (async () => {
            const result = await deleteTask(supabase, task.id);

            if (result.success) {
              toast('Task deleted successfully');
              // Remove from local tasks array
              const idx = tasks.findIndex((t) => t.id === task.id);
              if (idx !== -1) {
                tasks.splice(idx, 1);
              }
              // Re-render the task list
              renderTasks();
              renderKanban();
            } else {
              toast('Failed to delete task: ' + (result.error || 'Unknown error'));
            }
          })();
        }
      });

    // ---------- BULK DELETE HANDLERS ----------
    const selectAllCheckbox = el('selectAllTasks') as HTMLInputElement | null;
    const bulkDeleteBtn = el('btnBulkDelete');
    const selectedCountSpan = el('selectedCount');
    const selectAllHeader = el('selectAllHeader');



    // Update selected count and button visibility
    function updateBulkDeleteUI() {
      const checkboxes = document.querySelectorAll('.task-checkbox:checked');
      const count = checkboxes.length;

      if (selectedCountSpan) selectedCountSpan.textContent = count.toString();
      if (bulkDeleteBtn) {
        bulkDeleteBtn.style.display = isAdmin() && count > 0 ? 'inline-block' : 'none';
      }
    }

    // Select all checkbox handler
    selectAllCheckbox && selectAllCheckbox.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      const checkboxes = document.querySelectorAll('.task-checkbox') as NodeListOf<HTMLInputElement>;
      checkboxes.forEach(cb => cb.checked = checked);
      updateBulkDeleteUI();
    });

    // Individual checkbox handler (delegated)
    tasksBody && tasksBody.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('task-checkbox')) {
        updateBulkDeleteUI();

        // Update select all checkbox state
        if (selectAllCheckbox) {
          const allCheckboxes = document.querySelectorAll('.task-checkbox') as NodeListOf<HTMLInputElement>;
          const checkedCheckboxes = document.querySelectorAll('.task-checkbox:checked');
          selectAllCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
          selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;
        }
      }
    });

    // Bulk delete button handler
    bulkDeleteBtn && bulkDeleteBtn.addEventListener('click', async () => {
      if (!isAdmin()) {
        toast('Only admins can delete tasks');
        return;
      }

      const checkedBoxes = document.querySelectorAll('.task-checkbox:checked') as NodeListOf<HTMLInputElement>;
      const taskIds = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-task-id')).filter(id => id) as string[];

      if (taskIds.length === 0) {
        toast('No tasks selected');
        return;
      }

      // Get task details for confirmation
      const selectedTasks = tasks.filter(t => taskIds.includes(t.id));
      const taskList = selectedTasks.slice(0, 5).map(t => `• ${t.project_name} - ${t.task}`).join('\n');
      const moreText = selectedTasks.length > 5 ? `\n... and ${selectedTasks.length - 5} more` : '';

      const confirmMsg = `Are you sure you want to delete ${taskIds.length} task(s)?\n\n${taskList}${moreText}\n\n⚠️ This action cannot be undone.`;

      if (!confirm(confirmMsg)) {
        return;
      }

      // Show loading state
      if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = true;
        bulkDeleteBtn.textContent = 'Deleting...';
      }

      try {
        const result = await bulkDeleteTasks(supabase, taskIds);

        if (result.deletedCount > 0) {
          // Remove deleted tasks from local array
          taskIds.forEach(id => {
            const idx = tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
              tasks.splice(idx, 1);
            }
          });

          // Show result
          if (result.failedCount === 0) {
            toast(`Successfully deleted ${result.deletedCount} task(s)`);
          } else {
            toast(`Deleted ${result.deletedCount} task(s), ${result.failedCount} failed`);
            console.error('Bulk delete errors:', result.errors);
          }

          // Re-render views
          renderTasks();
          renderKanban();

          // Reset checkboxes
          if (selectAllCheckbox) selectAllCheckbox.checked = false;
          updateBulkDeleteUI();
        } else {
          toast('Failed to delete tasks: ' + (result.errors[0] || 'Unknown error'));
        }
      } catch (err: any) {
        toast('Error during bulk delete: ' + (err.message || 'Unknown error'));
        console.error('Bulk delete exception:', err);
      } finally {
        // Restore button state
        if (bulkDeleteBtn) {
          bulkDeleteBtn.disabled = false;
          if (selectedCountSpan) {
            bulkDeleteBtn.innerHTML = `Delete Selected (<span id="selectedCount">0</span>)`;
          }
        }
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

        // Prevent re-submitting already completed tasks
        if (selectedTask.status === 'Complete') {
          toast('This task is already completed');
          return;
        }

        // Prevent resubmitting rejected tasks
        if (selectedTask.status === 'Rejected') {
          toast('Rejected tasks cannot be resubmitted. Please contact an admin.');
          return;
        }

        const remark = doneRemark ? doneRemark.value.trim() : '';
        const prevStatus = selectedTask.status || 'Pending';

        const { error } = await supabase
          .from('tasks')
          .update({
            status: 'Complete',
            completed_at: new Date().toISOString(),
            completed_by: currentUser.name || currentUser.staff_id,
            completion_remarks: remark || null,
          })
          .eq('id', selectedTask.id);

        if (error) {
          console.error('Mark complete error', error);
          toast('Failed to mark as complete');
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
        toast('Task marked as complete');
        await loadDataAfterLogin();
      });

    //     // Review Modal Handlers
    //     const reviewModal = el('reviewModal');
    //     const reviewAction = el('reviewAction') as HTMLSelectElement;
    //     const revisionNoteSection = el('revisionNoteSection');
    //     const reviewComments = el('reviewComments') as HTMLTextAreaElement;
    //     const reviewTaskInfo = el('reviewTaskInfo');
    //     const reviewCancel = el('reviewCancel');
    //     const reviewOK = el('reviewOK');
    // 
    //     reviewAction && reviewAction.addEventListener('change', () => {
    //       if (revisionNoteSection) {
    //         const action = reviewAction.value;
    //         revisionNoteSection.style.display = (action === 'Revise' || action === 'Reject') ? 'block' : 'none';
    // 
    //         // Update label based on action
    //         const label = revisionNoteSection.querySelector('label');
    //         if (label) {
    //           if (action === 'Reject') {
    //             label.textContent = 'Rejection Reason *';
    //           } else if (action === 'Revise') {
    //             label.textContent = 'Revision Comments / Feedback *';
    //           }
    //         }
    // 
    //         // Update placeholder
    //         if (reviewComments) {
    //           if (action === 'Reject') {
    //             reviewComments.placeholder = 'Explain why this task is being rejected...';
    //           } else if (action === 'Revise') {
    //             reviewComments.placeholder = 'Explain what needs to be changed...';
    //           }
    //         }
    //       }
    //     });
    // 
    //     reviewCancel && reviewCancel.addEventListener('click', () => hideModal(reviewModal));
    // 
    //     reviewOK && reviewOK.addEventListener('click', async () => {
    //       if (!selectedTask || !currentUser) return;
    // 
    //       const action = reviewAction.value;
    //       const comments = reviewComments.value.trim();
    // 
    //       if ((action === 'Revise' || action === 'Reject') && !comments) {
    //         toast(action === 'Reject' ? 'Please provide rejection reason' : 'Please provide revision comments');
    //         return;
    //       }
    // 
    //       const newStatus = action === 'Approve' ? 'Complete' : (action === 'Reject' ? 'Rejected' : 'Needs Revision');
    //       const prevStatus = selectedTask.status || 'Under Review';
    // 
    //       const updatePayload: any = {
    //         status: newStatus,
    //         reviewed_by: currentUser.name || currentUser.staff_id,
    //         reviewed_at: new Date().toISOString()
    //       };
    // 
    //       if (action === 'Approve') {
    //         updatePayload.completed_at = new Date().toISOString();
    //         updatePayload.completed_by = currentUser.name || currentUser.staff_id;
    //       } else {
    //         updatePayload.review_comments = comments;
    //       }
    // 
    //       const { error } = await supabase
    //         .from('tasks')
    //         .update(updatePayload)
    //         .eq('id', selectedTask.id);
    // 
    //       if (error) {
    //         console.error('Review processing error', error);
    //         toast('Failed to process review');
    //         return;
    //       }
    // 
    //       await supabase.from('task_status_log').insert([
    //         {
    //           task_id: selectedTask.id,
    //           action: action === 'Approve' ? 'approve' : (action === 'Reject' ? 'reject' : 'request_revision'),
    //           from_status: prevStatus,
    //           to_status: newStatus,
    //           note: comments || (action === 'Approve' ? 'Approved' : null),
    //           changed_by_id: currentUser.staff_id,
    //           changed_by_name: currentUser.name,
    //         },
    //       ]);
    // 
    //       // Notify based on action
    //       if (action === 'Approve') {
    //         // Notify admins and leads about completion
    //         await handleTaskStatusChange(
    //           selectedTask,
    //           prevStatus,
    //           newStatus,
    //           currentUser.name || currentUser.staff_id
    //         );
    //       } else if (action === 'Reject') {
    //         // Notify assignees about rejection
    //         await notifyAssigneesOfRejection(selectedTask, comments, currentUser.name || currentUser.staff_id);
    //       } else {
    //         // Notify assignees about revision request
    //         await notifyAssigneesOfRevision(selectedTask, comments, currentUser.name || currentUser.staff_id);
    //       }
    // 
    //       hideModal(reviewModal);
    //       const successMsg = action === 'Approve' ? 'Task approved and completed' : (action === 'Reject' ? 'Task rejected' : 'Revision requested');
    //       toast(successMsg);
    //       await loadDataAfterLogin();
    //     });


    // Revision Modal Handlers
    const revisionModal = el('revisionModal');
    const revisionComments = el('revisionComments') as HTMLTextAreaElement;
    const revisionTaskInfo = el('revisionTaskInfo');
    const revisionCancel = el('revisionCancel');
    const revisionOK = el('revisionOK');

    revisionCancel && revisionCancel.addEventListener('click', () => hideModal(revisionModal));

    revisionOK && revisionOK.addEventListener('click', async () => {
      if (!selectedTask || !currentUser) return;

      const comments = revisionComments.value.trim();
      if (!comments) {
        toast('Please provide revision feedback');
        return;
      }

      const prevStatus = selectedTask.status || 'Complete';

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'Needs Revision',
          review_comments: comments,
          reviewed_by: currentUser.name || currentUser.staff_id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedTask.id);

      if (error) {
        console.error('Request revision error', error);
        toast('Failed to request revision');
        return;
      }

      await supabase.from('task_status_log').insert([
        {
          task_id: selectedTask.id,
          action: 'request_revision',
          from_status: prevStatus,
          to_status: 'Needs Revision',
          note: comments,
          changed_by_id: currentUser.staff_id,
          changed_by_name: currentUser.name,
        },
      ]);

      // Notify assignees
      await notifyAssigneesOfRevision(selectedTask, comments, currentUser.name || currentUser.staff_id);

      hideModal(revisionModal);
      toast('Revision requested');
      await loadDataAfterLogin();
    });

    // Status update
    stCancel &&
      stCancel.addEventListener('click', () => hideModal(statusModal));
    stOK &&
      stOK.addEventListener('click', async () => {
        if ((stOK as HTMLButtonElement).disabled) return;
        (stOK as HTMLButtonElement).disabled = true;

        try {
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

          const updatePayload: any = {
            status: newStatus,
            current_status: note || null,
          };

          if (newStatus === 'Complete' && prevStatus !== 'Complete') {
            updatePayload.completed_at = new Date().toISOString();
            updatePayload.completed_by = currentUser.name || currentUser.staff_id;
          } else if (newStatus !== 'Complete' && prevStatus === 'Complete') {
            updatePayload.completed_at = null;
            updatePayload.completed_by = null;
          }

          const { error } = await supabase
            .from('tasks')
            .update(updatePayload)
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

          // Optimistic update
          selectedTask.status = newStatus;
          if (note) selectedTask.current_status = note;

          hideModal(statusModal);
          toast('Status updated');

          renderTasks();
          renderKanban();
          updateKanbanCounts();

        } finally {
          (stOK as HTMLButtonElement).disabled = false;
        }
      });

    //  ---------- PROJECT STRUCTURE TAB ----------
    const stagesBox = el('stagesBox');
    const layoutActions = el('layoutActions');
    const btnEditLayout = el('btnEditLayout');


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
    // --- PHASE 1 FIX: Modified to get fresh project reference at execution time ---
    function wireSubstageAssignUI(proj: any) {
      if (!proj) return;

      const panel = el('stAssignPanel');
      if (!panel) return;

      const stageSel = el('stAssignStageSel') as HTMLInputElement;
      const subSel = el('stAssignSubSel') as HTMLInputElement;
      const dueSel = el('stAssignDue') as HTMLInputElement;
      const prioritySel = el('stAssignPriority') as HTMLSelectElement;
      const assignList = el('stAssignUserMulti');
      const assignBtn = el('stAssignBtn');
      const closeBtn = el('stAssignClose');

      // --- PHASE 1 FIX: Get fresh project reference at execution time ---
      const getCurrentProject = () => {
        // First try to use activeProjectName for fresh lookup
        if (activeProjectName) {
          const freshProj = projects.find(p => p.name === activeProjectName);
          if (freshProj) {
            return freshProj;
          }
        }
        // Fall back to the proj passed in (for initial render)
        return proj;
      };

      const openSubstageAssign = async (stageName: string, subName: string, existingTaskId?: string) => {
        // --- PHASE 1 FIX: Get fresh project reference ---
        const currentProj = getCurrentProject();
        if (!currentProj) {
          toast('Please select a project first');
          return;
        }

        console.log('[openSubstageAssign] Project:', currentProj.name, 'Stage:', stageName, 'Sub:', subName);

        assignState.proj = currentProj;
        assignState.stage = stageName;
        assignState.sub = subName;
        assignState.taskId = existingTaskId || '';
        assignState.isBulk = false;
        assignState.bulkStage = '';

        // UI Setup
        if (subSel) subSel.disabled = false;
        if (stageSel) stageSel.value = stageName;
        if (subSel) subSel.value = subName;
        if (dueSel) dueSel.value = '';
        if (prioritySel) prioritySel.value = 'Medium';

        // Load users if needed
        if (!projectUsersCache[currentProj.id]) {
          await loadProjectUsers(currentProj.id);
        }

        // Render users
        if (assignList) assignList.innerHTML = '';
        const users = projectUsersCache[currentProj.id] || [];
        if (assignList) {
          users.forEach(u => {
            assignList.innerHTML += `
                    <label class="chk-line">
                      <input type="checkbox" class="asgU" value="${esc(u.staff_id)}" data-name="${esc(u.name || '')}">
                      <span>${esc(u.name || '')} [${esc(u.staff_id)}]</span>
                    </label>
                 `;
          });
        }

        // Pre-fill existing
        if (existingTaskId) {
          const t = tasks.find(x => x.id === existingTaskId);
          if (t) {
            if (dueSel && t.due) dueSel.value = t.due;
            if (prioritySel && t.priority) prioritySel.value = t.priority;
            const ids = t.assignee_ids || [];
            assignList?.querySelectorAll<HTMLInputElement>('.asgU').forEach(c => {
              if (ids.includes(c.value)) c.checked = true;
            });
            if (assignBtn) assignBtn.textContent = 'Update Task';
          }
        } else {
          if (assignBtn) assignBtn.textContent = 'Create Task';
        }

        panel?.classList.add('show');
      };

      const openStageBulkAssign = async (stageName: string) => {
        // --- PHASE 1 FIX: Get fresh project reference ---
        const currentProj = getCurrentProject();
        if (!currentProj) {
          toast('Please select a project first');
          return;
        }

        console.log('[openStageBulkAssign] Project:', currentProj.name, 'Stage:', stageName);

        // --- PHASE 1 FIX: Validate this is the correct project context ---
        if (activeProjectName && currentProj.name !== activeProjectName) {
          console.warn('[openStageBulkAssign] Context mismatch! Active:', activeProjectName, 'Got:', currentProj.name);
          toast('Project context changed - please try again');
          return;
        }

        assignState.proj = currentProj;
        assignState.stage = stageName;
        assignState.sub = '(All Sub-stages)'; // Display only - actual logic iterates through real subs
        assignState.taskId = '';
        assignState.isBulk = true;
        assignState.bulkStage = stageName;

        if (!projectUsersCache[currentProj.id]) {
          await loadProjectUsers(currentProj.id);
        }

        if (stageSel) stageSel.value = stageName;
        if (subSel) {
          subSel.value = '(All Sub-stages)';
          subSel.disabled = true;
        }
        if (dueSel) dueSel.value = '';
        if (prioritySel) prioritySel.value = 'Medium';

        if (assignList) assignList.innerHTML = '';
        const users = projectUsersCache[currentProj.id] || [];
        if (assignList) {
          users.forEach(u => {
            assignList.innerHTML += `
                      <label class="chk-line">
                        <input type="checkbox" class="asgU" value="${esc(u.staff_id)}" data-name="${esc(u.name || '')}">
                        <span>${esc(u.name || '')} [${esc(u.staff_id)}]</span>
                      </label>
                   `;
          });
        }

        if (assignBtn) assignBtn.textContent = 'Bulk Assign Tasks';
        panel?.classList.add('show');
      };

      (window as any).openSubstageAssign = openSubstageAssign;
      (window as any).openStageBulkAssign = openStageBulkAssign;

      if (closeBtn) {
        closeBtn.onclick = () => panel?.classList.remove('show');
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

    // Sort stages according to predefined order (uses STAGE_ORDER defined above)
    // Sort stages according to predefined order (uses STAGE_ORDER defined above)
    function sortStagesByOrder(stages: any[]): any[] {
      return [...stages].sort((a, b) => {
        const aName = (a.stage || a.name || '').trim().toUpperCase();
        const bName = (b.stage || b.name || '').trim().toUpperCase();

        const aIndex = STAGE_ORDER_MAP.has(aName) ? STAGE_ORDER_MAP.get(aName)! : 999;
        const bIndex = STAGE_ORDER_MAP.has(bName) ? STAGE_ORDER_MAP.get(bName)! : 999;

        if (aIndex !== bIndex) return aIndex - bIndex;

        return (a.stage || a.name || '').localeCompare(b.stage || b.name || '');
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

          return;
        }

        // Sort stages according to predefined order
        const sortedPlan = sortStagesByOrder(planArray);

        const html = sortedPlan
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

        // Sort stages in edit mode as well
        const sortedNormalizedPlan = sortStagesByOrder(normalizedPlan);

        renderStagePlanEditor(sortedNormalizedPlan, stagesBox);
        if (btnEditLayout) btnEditLayout.textContent = '💾 Save Layout';

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
          toast('Only admins or project leads can edit project layout');
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
              .neq('status', 'deactivated')
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




    // ---------- ROLE UI & ESC HANDLER ----------
    function userIsLeadAnywhere() {
      if (!currentUser) return false;
      return projects.some((p) =>
        (p.lead_ids || []).includes(currentUser.staff_id),
      );
    }

    function refreshRoleUI() {
      if (!btnNewProject || !btnAddUser || !btnNewTask) return;

      const selectAllHeader = el('selectAllHeader');

      if (!currentUser) {
        btnNewProject.style.display = 'none';
        btnAddUser.style.display = 'none';
        btnNewTask.style.display = 'none';
        if (userManagementEntry) userManagementEntry.style.display = 'none';
        if (reportsEntry) reportsEntry.style.display = 'none';
        if (tabWorkload) tabWorkload.style.display = 'none';
        if (selectAllHeader) selectAllHeader.style.display = 'none';
        return;
      }

      if (isAdmin()) {
        btnNewProject.style.display = '';
        btnAddUser.style.display = '';
        btnNewTask.style.display = '';
        if (userManagementEntry) userManagementEntry.style.display = '';
        if (reportsEntry) reportsEntry.style.display = '';
        if (tabWorkload) tabWorkload.style.display = '';
        if (tabWorkload) tabWorkload.style.display = 'flex';
        if (selectAllHeader) selectAllHeader.style.display = '';
      } else {
        btnNewProject.style.display = 'none';
        btnAddUser.style.display = 'none';
        btnNewTask.style.display = userIsLeadAnywhere() ? '' : 'none';
        if (userManagementEntry) userManagementEntry.style.display = 'none';
        if (reportsEntry) reportsEntry.style.display = 'none';
        if (tabWorkload) tabWorkload.style.display = 'none';
        if (selectAllHeader) selectAllHeader.style.display = 'none';
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

    // Print Report Handler - Open Wizard
    const printReportBtn = el('printReportBtn');
    const printWizardModal = el('printWizardModal');
    if (printReportBtn && printWizardModal) {
      printReportBtn.addEventListener('click', () => {
        printWizardModal.classList.add('show');

        // Populate employee filter
        const pwEmployeeFilter = el('pwEmployeeFilter') as HTMLSelectElement;
        if (pwEmployeeFilter) {
          pwEmployeeFilter.innerHTML = '<option value="">All Employees</option>';


          // Collect unique assignees with names from tasks
          const assigneeMap = new Map<string, string>();
          tasks.forEach(t => {
            if (t.assignee_ids && t.assignees) {
              t.assignee_ids.forEach((id: string, index: number) => {
                if (!assigneeMap.has(id) && t.assignees && t.assignees[index]) {
                  assigneeMap.set(id, t.assignees[index]);
                }
              });
            }
          });

          // Sort by name and add to dropdown
          Array.from(assigneeMap.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .forEach(([staffId, displayName]) => {
              const option = document.createElement('option');
              option.value = staffId;
              option.textContent = displayName;
              pwEmployeeFilter.appendChild(option);
            });
        }

        // Trigger report type change to set initial UI state
        const pwReportType = el('pwReportType') as HTMLSelectElement;
        if (pwReportType) {
          pwReportType.dispatchEvent(new Event('change'));
        }
      });
    }

    // Print Wizard Handlers
    const pwCancel = el('pwCancel');
    const pwPrint = el('pwPrint');
    const pwDatePreset = el('pwDatePreset') as HTMLSelectElement;
    const pwCustomDates = el('pwCustomDates');
    const pwReportType = el('pwReportType') as HTMLSelectElement;
    const pwFilterMode = el('pwFilterMode') as HTMLSelectElement;
    const pwProjectSelector = el('pwProjectSelector');
    const pwProjectList = el('pwProjectList');
    const pwFilterModeDesc = el('pwFilterModeDesc');
    const pwStatusSection = el('pwStatusSection');

    if (pwCancel && printWizardModal) {
      pwCancel.addEventListener('click', () => {
        printWizardModal.classList.remove('show');
      });
    }

    // FILTER MODE HANDLER - Updates description and status checkboxes
    if (pwFilterMode && pwFilterModeDesc && pwStatusSection) {
      const updateFilterModeState = () => {
        const mode = pwFilterMode.value;
        const statusCheckboxes = container.querySelectorAll('#pwStatusList input[type="checkbox"]');
        const setStatus = (val: string, checked: boolean) => {
          const cb = Array.from(statusCheckboxes).find((c: any) => c.value === val) as HTMLInputElement;
          if (cb) cb.checked = checked;
        };

        if (mode === 'assigned') {
          pwFilterModeDesc.textContent = 'Shows all tasks that were assigned (created) during the selected date range. Excludes completed tasks.';
          // Uncheck completed, check others
          setStatus('Pending', true);
          setStatus('In Progress', true);
          setStatus('Needs Revision', true);
          setStatus('Rejected', true);
          setStatus('Complete', false);
        } else if (mode === 'completed') {
          pwFilterModeDesc.textContent = 'Shows all tasks that were completed during the selected date range.';
          // Only completed
          setStatus('Pending', false);
          setStatus('In Progress', false);
          setStatus('Needs Revision', false);
          setStatus('Rejected', false);
          setStatus('Complete', true);
        } else if (mode === 'all') {
          pwFilterModeDesc.textContent = 'Shows all tasks that were either assigned OR completed during the selected date range.';
          // All statuses
          setStatus('Pending', true);
          setStatus('In Progress', true);
          setStatus('Needs Revision', true);
          setStatus('Rejected', true);
          setStatus('Complete', true);
        }
      };

      pwFilterMode.addEventListener('change', updateFilterModeState);
      // Initialize on load
      updateFilterModeState();
    }

    // Advanced Filters Toggle Handler
    const pwToggleAdvanced = el('pwToggleAdvanced');
    const pwAdvancedSection = el('pwAdvancedSection');
    const pwAdvancedIcon = el('pwAdvancedIcon');
    if (pwToggleAdvanced && pwAdvancedSection && pwAdvancedIcon) {
      pwToggleAdvanced.addEventListener('click', () => {
        const isHidden = pwAdvancedSection.style.display === 'none' || !pwAdvancedSection.style.display;
        pwAdvancedSection.style.display = isHidden ? 'block' : 'none';
        pwAdvancedIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        pwAdvancedIcon.style.transition = 'transform 0.2s ease';
      });
    }

    // Report type change handler
    const pwFilterModeSection = el('pwFilterModeSection');
    const pwDateRangeSection = el('pwDateRangeSection');

    if (pwReportType && pwProjectSelector && pwProjectList) {
      const updateReportTypeUI = () => {
        const isStructure = pwReportType.value === 'projectstructure';

        // Toggle visibility
        pwProjectSelector.style.display = isStructure ? 'block' : 'none';
        if (pwFilterModeSection) pwFilterModeSection.style.display = isStructure ? 'none' : 'block';
        if (pwDateRangeSection) pwDateRangeSection.style.display = isStructure ? 'none' : 'block';

        if (isStructure) {
          // Populate project list if empty
          if (pwProjectList.children.length === 0) {
            const uniqueProjects = Array.from(new Set(projects.map(p => p.name))).sort();
            pwProjectList.innerHTML = '';

            // Add "Select All" option
            const selectAllLabel = document.createElement('label');
            selectAllLabel.className = 'small';
            selectAllLabel.style.display = 'block';
            selectAllLabel.style.marginBottom = '4px';
            selectAllLabel.innerHTML = `<input type="checkbox" id="pwSelectAllProjects" checked> <strong>Select All</strong>`;
            pwProjectList.appendChild(selectAllLabel);

            // Add individual projects
            uniqueProjects.forEach(projectName => {
              const label = document.createElement('label');
              label.className = 'small';
              label.style.display = 'block';
              label.style.marginBottom = '4px';
              label.innerHTML = `<input type="checkbox" class="pwProjectCheckbox" value="${esc(projectName)}" checked> ${esc(projectName)}`;
              pwProjectList.appendChild(label);
            });

            // Handle "Select All" checkbox
            const selectAllCheckbox = el('pwSelectAllProjects') as HTMLInputElement;
            if (selectAllCheckbox) {
              selectAllCheckbox.addEventListener('change', () => {
                const checkboxes = container.querySelectorAll('.pwProjectCheckbox') as NodeListOf<HTMLInputElement>;
                checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
              });
            }
          }
        }
      };

      pwReportType.addEventListener('change', updateReportTypeUI);
      // Trigger once on initialization if needed in open handler
      // But open handler initializes state.
      // We should check where printReportBtn listener is and call updateReportTypeUI there too if possible, 
      // or simplify.




    }

    // Date preset change handler
    if (pwDatePreset && pwCustomDates) {
      pwDatePreset.addEventListener('change', () => {
        if (pwDatePreset.value === 'custom') {
          pwCustomDates.style.display = '';
        } else {
          pwCustomDates.style.display = 'none';
        }
      });
    }

    // Print button handler
    if (pwPrint && printWizardModal) {
      pwPrint.addEventListener('click', () => {
        // Get report type
        const reportType = (el('pwReportType') as HTMLSelectElement)?.value || 'tasklist';

        // Calculate date range based on preset
        let dateFrom = '';
        let dateTo = '';
        const today = new Date();

        const preset = (el('pwDatePreset') as HTMLSelectElement)?.value || 'all';

        if (preset === 'today') {
          dateFrom = dateTo = today.toISOString().split('T')[0];
        } else if (preset === '7days') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateFrom = weekAgo.toISOString().split('T')[0];
          dateTo = today.toISOString().split('T')[0];
        } else if (preset === '30days') {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          dateFrom = monthAgo.toISOString().split('T')[0];
          dateTo = today.toISOString().split('T')[0];
        } else if (preset === 'month') {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          dateFrom = firstDay.toISOString().split('T')[0];
          dateTo = today.toISOString().split('T')[0];
        } else if (preset === 'custom') {
          dateFrom = (el('pwDateFrom') as HTMLInputElement)?.value || '';
          dateTo = (el('pwDateTo') as HTMLInputElement)?.value || '';
        }

        // Get selected projects
        const projectCheckboxes = container.querySelectorAll('#pwProjectList input[type="checkbox"]:checked');
        const selectedProjectNames = Array.from(projectCheckboxes).map((cb: any) => cb.value);

        // Get date filter type
        const filterMode = (el('pwFilterMode') as HTMLSelectElement)?.value || 'all';

        // Get selected statuses
        const statusCheckboxes = container.querySelectorAll('#pwStatusList input[type="checkbox"]:checked');
        const selectedStatuses = Array.from(statusCheckboxes).map((cb: any) => cb.value);

        // Get report options
        const showStats = (el('pwShowStats') as HTMLInputElement)?.checked || false;
        const showDesc = (el('pwShowDesc') as HTMLInputElement)?.checked || false;
        const showRemarks = (el('pwShowRemarks') as HTMLInputElement)?.checked || false;

        // Get employee filter
        const selectedEmployee = (el('pwEmployeeFilter') as HTMLSelectElement)?.value || '';

        // Filter tasks based on filter mode
        const filteredTasks = tasks.filter((t) => {
          const status = t.status || 'Pending';
          const isComplete = status === 'Complete';

          // 0. Project Filter (Apply to ALL report types if projects are selected)
          if (selectedProjectNames.length > 0 && !selectedProjectNames.includes(t.project_name)) {
            return false;
          }

          // SPECIAL CASE: Project Structure Report
          // Show ALL data for the selected project(s), ignoring other filters
          if (reportType === 'projectstructure') {
            return true;
          }

          // Employee filter (if selected)
          if (selectedEmployee && !(t.assignee_ids || []).includes(selectedEmployee)) {
            return false;
          }

          // Status filter (First pass)
          if (selectedStatuses.length > 0 && !selectedStatuses.includes(status)) {
            return false;
          }

          // Apply date filtering based on filter mode
          if (filterMode === 'assigned') {
            // Assigned Tasks Mode: Filter by created_at, exclude completed
            if (isComplete) return false; // Skip completed tasks

            if (dateFrom || dateTo) {
              if (t.created_at) {
                const assignedDate = new Date(t.created_at);
                if (dateFrom && assignedDate < new Date(dateFrom)) return false;
                if (dateTo && assignedDate > new Date(dateTo + 'T23:59:59')) return false;
                return true;
              }
              return false; // No created_at? Exclude
            }
            return true; // No date filter, include all non-completed
          }
          else if (filterMode === 'completed') {
            // Completed Tasks Mode: Filter by completed_at, only completed
            if (!isComplete) return false; // Only completed tasks

            if (dateFrom || dateTo) {
              if (t.completed_at) {
                const completedDate = new Date(t.completed_at);
                if (dateFrom && completedDate < new Date(dateFrom)) return false;
                if (dateTo && completedDate > new Date(dateTo + 'T23:59:59')) return false;
                return true;
              }
              return false; // No completed_at? Exclude
            }
            return true; // No date filter, include all completed
          }
          else if (filterMode === 'all') {
            // All Tasks Mode: Show tasks assigned OR completed in the range
            if (dateFrom || dateTo) {
              let inRange = false;

              // Check if assigned in range
              if (t.created_at) {
                const assignedDate = new Date(t.created_at);
                if ((!dateFrom || assignedDate >= new Date(dateFrom)) &&
                  (!dateTo || assignedDate <= new Date(dateTo + 'T23:59:59'))) {
                  inRange = true;
                }
              }

              // Check if completed in range
              if (!inRange && t.completed_at) {
                const completedDate = new Date(t.completed_at);
                if ((!dateFrom || completedDate >= new Date(dateFrom)) &&
                  (!dateTo || completedDate <= new Date(dateTo + 'T23:59:59'))) {
                  inRange = true;
                }
              }

              return inRange;
            }
            return true; // No date filter, include all
          }

          return true;
        });


        // Get export format
        const exportFormat = (el('pwExportFormat') as HTMLSelectElement)?.value || 'print';

        // Handle different export formats
        if (exportFormat === 'excel') {
          // Export to Excel
          exportToExcel(filteredTasks, {
            reportType,
            dateFrom,
            dateTo,
            filterMode,
            statuses: selectedStatuses,
            showStats,
            showDesc,
            showRemarks,
            showRemarks,
            selectedProjects: selectedProjectNames
          });
          printWizardModal.classList.remove('show');
        } else if (exportFormat === 'pdf') {
          // Export to PDF
          exportToPDF(filteredTasks, {
            reportType,
            dateFrom,
            dateTo,
            filterMode,
            statuses: selectedStatuses,
            showStats,
            showDesc,
            showRemarks,
            showRemarks,
            selectedProjects: selectedProjectNames
          });
          printWizardModal.classList.remove('show');
        } else {
          // Generate appropriate report for printing
          if (reportType === 'kanban') {
            // Kanban board view
            generateKanbanBoardReport(filteredTasks, {
              dateFrom,
              dateTo,
              filterMode,
              statuses: selectedStatuses,
              showStats,
              showDesc,
              showRemarks
            });
          } else if (reportType === 'projectstructure') {
            // Get selected projects
            const selectedProjectCheckboxes = container.querySelectorAll('.pwProjectCheckbox:checked') as NodeListOf<HTMLInputElement>;
            const selectedProjects = Array.from(selectedProjectCheckboxes).map(cb => cb.value);

            generateProjectStructureReport(filteredTasks, {
              dateFrom,
              dateTo,
              filterMode,
              statuses: selectedStatuses,
              showStats,
              showDesc,
              showRemarks,
              selectedProjects
            });
          } else {
            // Simple task list
            generatePrintReportWithOptions(filteredTasks, {
              dateFrom,
              dateTo,
              filterMode,
              statuses: selectedStatuses,
              showStats,
              showDesc,
              showRemarks
            });
          }

          // Close wizard and trigger print
          printWizardModal.classList.remove('show');
          setTimeout(() => {
            window.print();
          }, 300);
        }
      });
    }

    function generatePrintReportWithOptions(tasksToPrint: Task[], options: any) {
      // Helper function to get status indicator HTML
      function getStatusIndicator(task: Task): string {
        const status = task.status || 'Pending';
        const isOverdue = task.due && new Date(task.due) < new Date() && status !== 'Complete';

        let statusClass = '';
        if (isOverdue) {
          statusClass = 'overdue';
        } else if (status === 'Complete') {
          statusClass = 'complete';
        } else if (status === 'In Progress') {
          statusClass = 'in-progress';
        } else if (status === 'Needs Revision') {
          statusClass = 'needs-revision';
        } else if (status === 'Rejected') {
          statusClass = 'rejected';
        } else {
          statusClass = 'pending';
        }

        return `<div class="status-indicator ${statusClass}"></div>`;
      }

      // Populate report header
      const reportDate = el('reportDate');
      if (reportDate) {
        reportDate.textContent = new Date().toLocaleString();
      }

      // Show applied filters
      const filtersList = el('reportFilters');
      if (filtersList) {
        filtersList.innerHTML = '';
        if (options.statuses && options.statuses.length > 0) {
          const li = document.createElement('li');
          li.textContent = `Statuses: ${options.statuses.join(', ')}`;
          filtersList.appendChild(li);
        }
        if (options.dateFrom || options.dateTo) {
          const li = document.createElement('li');
          const filterModeLabel = options.filterMode === 'assigned' ? 'Assignment Date' :
            options.filterMode === 'completed' ? 'Completion Date' : 'Due Date';
          li.textContent = `${filterModeLabel}: ${options.dateFrom || 'Start'} to ${options.dateTo || 'End'}`;
          filtersList.appendChild(li);
        }
        if (filtersList.children.length === 0) {
          const li = document.createElement('li');
          li.textContent = 'No filters applied';
          filtersList.appendChild(li);
        }
      }

      // Generate table rows
      const tbody = el('reportTableBody');
      if (tbody) {
        tbody.innerHTML = '';

        tasksToPrint.forEach(task => {
          const row = document.createElement('tr');

          // Build row HTML based on showDesc option
          let taskCellContent = esc(task.task);

          if (options.showRemarks) {
            const metadata = [];
            if (task.created_by_name) metadata.push(`Created by: ${task.created_by_name}`);
            if (task.completion_remarks) metadata.push(`Completion Note: ${task.completion_remarks}`);
            if (task.reschedule_remarks) metadata.push(`Reschedule Note: ${task.reschedule_remarks}`);

            if (metadata.length > 0) {
              taskCellContent += `<div style="font-size:6.5pt;color:#4b5563;font-style:italic;margin-top:2px;">${esc(metadata.join(' | '))}</div>`;
            }
          }

          let rowHTML = `
            <td style="border:1px solid #000;padding:3px;">${getStatusIndicator(task)}</td>
            <td style="border:1px solid #000;padding:3px;">${esc(task.project_name || '')}</td>
            <td style="border:1px solid #000;padding:3px;">${taskCellContent}</td>
            <td style="border:1px solid #000;padding:3px;">${esc((task.assignees || []).join(', '))}</td>
            <td style="border:1px solid #000;padding:3px;">${esc(formatDate(task.due))}</td>
            <td style="border:1px solid #000;padding:3px;">${esc(task.priority || '')}</td>
            <td style="border:1px solid #000;padding:3px;">${esc(task.status || '')}</td>
            <td style="border:1px solid #000;padding:3px;">${task.completed_at ? esc(formatDate(task.completed_at)) : '-'}</td>
          `;

          if (options.showDesc) {
            rowHTML += `<td style="border:1px solid #000;padding:3px;">${esc(task.description || '')}</td>`;
          }

          row.innerHTML = rowHTML;
          tbody.appendChild(row);
        });

        // Update table header based on showDesc option
        const thead = container.querySelector('.report-table thead tr');
        if (thead) {
          if (options.showDesc) {
            thead.innerHTML = `
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;width:20px;"></th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Project</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Task</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Assignees</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Due</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Priority</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Status</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Completed</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Description</th>
            `;
          } else {
            thead.innerHTML = `
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;width:20px;"></th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Project</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Task</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Assignees</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Due</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Priority</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Status</th>
              <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Completed</th>
            `;
          }
        }
      }

      // Show total and stats
      const reportTotal = el('reportTotal');
      if (reportTotal) {
        reportTotal.textContent = tasksToPrint.length.toString();
      }

      // Calculate statistics for completed tasks (if enabled)
      const reportStats = el('reportStats');
      if (reportStats) {
        if (options.showStats) {
          const completed = tasksToPrint.filter(t => t.status === 'Complete');
          if (completed.length > 0) {
            const onTime = completed.filter(t => {
              const due = new Date(t.due);
              const done = new Date(t.completed_at || '');
              return done <= due;
            });

            reportStats.innerHTML = `
              <p><strong>Completion Statistics:</strong></p>
              <ul style="margin:0;padding-left:20px;">
                <li>Completed: ${completed.length} tasks</li>
                <li>On Time: ${onTime.length} tasks</li>
                <li>Late: ${completed.length - onTime.length} tasks</li>
              </ul>
            `;
          } else {
            reportStats.innerHTML = '';
          }
        } else {
          reportStats.innerHTML = '';
        }
      }
    }

    function generateProjectStructureReport(tasksToPrint: Task[], options: any) {
      // Helper function to get status checkbox
      function getStatusCheckbox(task: Task): string {
        const status = task.status || 'Pending';
        const isComplete = status === 'Complete';
        const checkbox = isComplete ? '☑' : '☐';
        return checkbox;
      }

      // Helper function to get status indicator HTML
      function getStatusIndicator(task: Task): string {
        const status = task.status || 'Pending';
        const isOverdue = task.due && new Date(task.due) < new Date() && status !== 'Complete';

        let statusClass = '';
        if (isOverdue) {
          statusClass = 'overdue';
        } else if (status === 'Complete') {
          statusClass = 'complete';
        } else if (status === 'In Progress') {
          statusClass = 'in-progress';
        } else if (status === 'Needs Revision') {
          statusClass = 'needs-revision';
        } else if (status === 'Rejected') {
          statusClass = 'rejected';
        } else {
          statusClass = 'pending';
        }

        return `<div class="status-indicator ${statusClass}"></div>`;
      }

      // Populate report header
      const reportDate = el('reportDate');
      if (reportDate) {
        reportDate.textContent = new Date().toLocaleString();
      }

      // Update report title
      const reportTitle = container.querySelector('.report-header h1');
      if (reportTitle) {
        reportTitle.textContent = 'Project Structure Report';
      }

      // Show applied filters
      const filtersList = el('reportFilters');
      if (filtersList) {
        filtersList.innerHTML = '';
        if (options.selectedProjects && options.selectedProjects.length > 0) {
          const li = document.createElement('li');
          li.textContent = `Projects: ${options.selectedProjects.join(', ')}`;
          filtersList.appendChild(li);
        }
        if (options.statuses && options.statuses.length > 0) {
          const li = document.createElement('li');
          li.textContent = `Statuses: ${options.statuses.join(', ')}`;
          filtersList.appendChild(li);
        }
        if (options.dateFrom || options.dateTo) {
          const li = document.createElement('li');
          const filterModeLabel = options.filterMode === 'assigned' ? 'Assignment Date' :
            options.filterMode === 'completed' ? 'Completion Date' : 'Due Date';
          li.textContent = `${filterModeLabel}: ${options.dateFrom || 'Start'} to ${options.dateTo || 'End'}`;
          filtersList.appendChild(li);
        }
        if (filtersList.children.length === 0) {
          const li = document.createElement('li');
          li.textContent = 'No filters applied';
          filtersList.appendChild(li);
        }
      }

      // Filter projects by selection
      const selectedProjectNames = options.selectedProjects || [];
      const selectedProjectsData = selectedProjectNames.length > 0
        ? projects.filter(p => selectedProjectNames.includes(p.name))
        : projects;

      // Build hierarchical structure
      const tbody = el('reportTableBody');
      const thead = container.querySelector('.report-table thead tr');

      if (tbody && thead) {
        tbody.innerHTML = '';

        // Add Legend to filters if not already present
        if (filtersList && !filtersList.querySelector('.repo-legend')) {
          const legendLi = document.createElement('li');
          legendLi.className = 'repo-legend';
          legendLi.style.cssText = 'margin-top:4px; border-top:1px solid #e5e7eb; padding-top:4px;';
          legendLi.innerHTML = `
            <strong>Legend:</strong> 
            <span style="color:#059669;font-weight:bold;margin-left:6px;">✔</span> Completed
            <span style="color:#dc2626;font-weight:bold;margin-left:6px;">!</span> Overdue
            <span style="color:#6b7280;font-style:italic;margin-left:6px;">Name (Unassigned)</span> Pending
          `;
          filtersList.appendChild(legendLi);
        }

        // Update header for checklist format with assignment and completion dates
        thead.innerHTML = `
          <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;width:30px;text-align:center;">✓</th>
          <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;">Task / Stage</th>
          <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;width:120px;">Assignees</th>
          <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;width:80px;">Assigned</th>
          <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;width:80px;">Due</th>
          <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;width:80px;">Completed</th>
          <th style="border:1px solid #000;padding:4px 3px;background:#f0f0f0;width:80px;">Status</th>
        `;

        // Generate rows for each selected project
        selectedProjectsData.forEach(project => {
          // Track matched tasks to find orphans later
          const matchedTaskIds = new Set<string>();

          // Project header row with metadata
          const projectRow = document.createElement('tr');
          const leadNames = (project.lead_ids || []).join(', '); // In a real app we'd map IDs to names
          const projectMeta = [];
          if (project.type) projectMeta.push(project.type);
          if (project.project_status) projectMeta.push(project.project_status);
          if (leadNames) projectMeta.push(`Lead: ${leadNames}`);

          projectRow.innerHTML = `
            <td colspan="7" style="border:1px solid #000;padding:6px 3px;background:#1f2937;color:white;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:bold;font-size:9pt;">${esc(project.name)}</span>
                <span style="font-size:7pt;font-weight:normal;opacity:0.9;">${esc(projectMeta.join(' | '))}</span>
              </div>
            </td>
          `;
          tbody.appendChild(projectRow);

          // Get stages for this project
          // Get stages for this project (fallback to stage_plan if stages alias missing)
          const projectStages = project.stage_plan || project.stages || [];

          // Iterate stages from plan
          projectStages.forEach(stage => {
            // Stage name property is 'stage' in the database/editor
            const stageName = typeof stage === 'string' ? stage : (stage.stage || stage.name || stage.title || 'Unknown Stage');
            const stageRow = document.createElement('tr');
            stageRow.innerHTML = `
              <td colspan="7" style="border:1px solid #000;padding:5px 3px 5px 12px;background:#e5e7eb;font-weight:bold;font-size:8pt;">
                ${esc(stageName)}
              </td>
            `;
            tbody.appendChild(stageRow);

            // Sub-stages are stored in 'subs' array
            const subStages = stage.subs || stage.sub_stages || stage.steps || [];
            subStages.forEach(subStage => {
              const subStageName = typeof subStage === 'string' ? subStage : (subStage.name || subStage.title || 'Unknown Sub-stage');
              // Sub-stage header row
              const subStageRow = document.createElement('tr');
              subStageRow.innerHTML = `
                <td colspan="7" style="border:1px solid #000;padding:4px 3px 4px 24px;background:#f3f4f6;font-weight:600;font-size:7.5pt;">
                  ${esc(subStageName)}
                </td>
              `;
              tbody.appendChild(subStageRow);

              // Match tasks using stage_id and sub_id metadata for accuracy
              const subStageTasks = tasksToPrint.filter(t =>
                t.project_id === project.id &&
                (
                  (t.stage_id === stageName && t.sub_id === subStageName) ||
                  (t.task && t.task.startsWith(subStageName))
                )
              );

              if (subStageTasks.length > 0) {
                subStageTasks.forEach(task => {
                  matchedTaskIds.add(task.id); // Track this task as matched

                  const row = document.createElement('tr');

                  // Construct task details
                  let taskDetails = `${getStatusIndicator(task)} ${esc(task.task.replace(subStageName + ' - ', ''))}`;

                  // Add description
                  if (options.showDesc && task.description) {
                    taskDetails += `<div style="font-size:7pt;color:#666;margin-top:2px;margin-left:14px;">${esc(task.description)}</div>`;
                  }

                  // Add remarks and metadata
                  if (options.showRemarks) {
                    const metadata = [];
                    if (task.created_by_name) metadata.push(`Created by: ${task.created_by_name}`);
                    if (task.completion_remarks) metadata.push(`Completion Note: ${task.completion_remarks}`);
                    if (task.reschedule_remarks) metadata.push(`Reschedule Note: ${task.reschedule_remarks}`);

                    if (metadata.length > 0) {
                      taskDetails += `<div style="font-size:6.5pt;color:#4b5563;font-style:italic;margin-top:2px;margin-left:14px;">${esc(metadata.join(' | '))}</div>`;
                    }
                  }

                  row.innerHTML = `
                    <td style="border:1px solid #000;padding:3px;text-align:center;font-size:12pt;">${getStatusCheckbox(task)}</td>
                    <td style="border:1px solid #000;padding:3px;padding-left:36px;">${taskDetails}</td>
                    <td style="border:1px solid #000;padding:3px;font-size:7pt;">${esc((task.assignees || []).join(', '))}</td>
                    <td style="border:1px solid #000;padding:3px;font-size:7pt;">${task.created_at ? esc(formatDate(task.created_at)) : '-'}</td>
                    <td style="border:1px solid #000;padding:3px;font-size:7pt;">${esc(formatDate(task.due))}</td>
                    <td style="border:1px solid #000;padding:3px;font-size:7pt;${task.completed_at ? 'font-weight:600;color:#059669;' : ''}">${task.completed_at ? esc(formatDate(task.completed_at)) : '-'}</td>
                    <td style="border:1px solid #000;padding:3px;font-size:7pt;">${esc(task.status || 'Pending')}</td>
                  `;
                  tbody.appendChild(row);
                });
              } else {
                // Show empty sub-stage as "Unassigned" task placeholder
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                  <td style="border:1px solid #000;padding:3px;text-align:center;">☐</td>
                  <td style="border:1px solid #000;padding:3px;padding-left:36px;font-style:italic;color:#6b7280;">
                    ${esc(subStageName)} <span style="font-size:7pt;color:#9ca3af;">(Unassigned)</span>
                  </td>
                  <td style="border:1px solid #000;padding:3px;text-align:center;color:#9ca3af;">-</td>
                  <td style="border:1px solid #000;padding:3px;text-align:center;color:#9ca3af;">-</td>
                  <td style="border:1px solid #000;padding:3px;text-align:center;color:#9ca3af;">-</td>
                  <td style="border:1px solid #000;padding:3px;text-align:center;color:#9ca3af;">-</td>
                  <td style="border:1px solid #000;padding:3px;font-size:7pt;color:#9ca3af;">Pending Assignment</td>
                `;
                tbody.appendChild(emptyRow);
              }
            });
          });

          // FALLBACK: Display unmatched tasks for this project
          const unmatchedTasks = tasksToPrint.filter(t =>
            t.project_name === project.name && !matchedTaskIds.has(t.id)
          );

          if (unmatchedTasks.length > 0) {
            // Add "Other Tasks" section header
            const otherTasksRow = document.createElement('tr');
            otherTasksRow.innerHTML = `
              <td colspan="7" style="border:1px solid #000;padding:5px 3px 5px 12px;background:#f9fafb;font-weight:bold;font-size:8pt;color:#6b7280;">
                Other Tasks
              </td>
            `;
            tbody.appendChild(otherTasksRow);

            // Display unmatched tasks
            unmatchedTasks.forEach(task => {
              const row = document.createElement('tr');

              // Construct task details
              let taskDetails = `${getStatusIndicator(task)} ${esc(task.task)}`;

              // Add description
              if (options.showDesc && task.description) {
                taskDetails += `<div style="font-size:7pt;color:#666;margin-top:2px;margin-left:14px;">${esc(task.description)}</div>`;
              }

              // Add remarks and metadata
              if (options.showRemarks) {
                const metadata = [];
                if (task.created_by_name) metadata.push(`Created by: ${task.created_by_name}`);
                if (task.completion_remarks) metadata.push(`Completion Note: ${task.completion_remarks}`);
                if (task.reschedule_remarks) metadata.push(`Reschedule Note: ${task.reschedule_remarks}`);

                if (metadata.length > 0) {
                  taskDetails += `<div style="font-size:6.5pt;color:#4b5563;font-style:italic;margin-top:2px;margin-left:14px;">${esc(metadata.join(' | '))}</div>`;
                }
              }

              row.innerHTML = `
                <td style="border:1px solid #000;padding:3px;text-align:center;font-size:12pt;">${getStatusCheckbox(task)}</td>
                <td style="border:1px solid #000;padding:3px;padding-left:12px;">${taskDetails}</td>
                <td style="border:1px solid #000;padding:3px;font-size:7pt;">${esc((task.assignees || []).join(', '))}</td>
                <td style="border:1px solid #000;padding:3px;font-size:7pt;">${task.created_at ? esc(formatDate(task.created_at)) : '-'}</td>
                <td style="border:1px solid #000;padding:3px;font-size:7pt;">${esc(formatDate(task.due))}</td>
                <td style="border:1px solid #000;padding:3px;font-size:7pt;${task.completed_at ? 'font-weight:600;color:#059669;' : ''}">${task.completed_at ? esc(formatDate(task.completed_at)) : '-'}</td>
                <td style="border:1px solid #000;padding:3px;font-size:7pt;">${esc(task.status || 'Pending')}</td>
              `;
              tbody.appendChild(row);
            });
          }
        });
      }

      // Show total
      const reportTotal = el('reportTotal');
      if (reportTotal) {
        reportTotal.textContent = tasksToPrint.length.toString();
      }

      // Calculate statistics (if enabled)
      const reportStats = el('reportStats');
      if (reportStats) {
        if (options.showStats) {
          const completed = tasksToPrint.filter(t => t.status === 'Complete');
          if (completed.length > 0) {
            const onTime = completed.filter(t => {
              const due = new Date(t.due);
              const done = new Date(t.completed_at || '');
              return done <= due;
            });

            reportStats.innerHTML = `
                <p><strong>Completion Statistics:</strong></p>
                  <ul style="margin:0;padding-left:20px;">
                    <li>Completed: ${completed.length} tasks</li>
                    <li>On Time: ${onTime.length} tasks</li>
                    <li>Late: ${completed.length - onTime.length} tasks</li>
                  </ul>
              `;
          } else {
            reportStats.innerHTML = '';
          }
        } else {
          reportStats.innerHTML = '';
        }
      }
    }

    function generateKanbanBoardReport(tasksToPrint: Task[], options: any) {
      // Update report title
      const reportTitle = container.querySelector('.report-header h1');
      if (reportTitle) {
        reportTitle.textContent = 'Kanban Board Report';
      }

      // Populate report header
      const reportDate = el('reportDate');
      if (reportDate) {
        reportDate.textContent = new Date().toLocaleString();
      }

      // Show applied filters
      const filtersList = el('reportFilters');
      if (filtersList) {
        filtersList.innerHTML = '';
        if (options.statuses && options.statuses.length > 0) {
          const li = document.createElement('li');
          li.textContent = `Statuses: ${options.statuses.join(', ')} `;
          filtersList.appendChild(li);
        }
        if (options.dateFrom || options.dateTo) {
          const li = document.createElement('li');
          const filterModeLabel = options.filterMode === 'assigned' ? 'Assignment Date' :
            options.filterMode === 'completed' ? 'Completion Date' : 'Due Date';
          li.textContent = `${filterModeLabel}: ${options.dateFrom || 'Start'} to ${options.dateTo || 'End'} `;
          filtersList.appendChild(li);
        }
        if (filtersList.children.length === 0) {
          const li = document.createElement('li');
          li.textContent = 'No filters applied';
          filtersList.appendChild(li);
        }
      }

      // Build kanban board HTML
      const tbody = el('reportTableBody');
      const thead = container.querySelector('.report-table thead tr');

      // Create kanban-style layout (define outside if block for stats)
      const statuses = ['Pending', 'In Progress', 'Needs Revision', 'Rejected', 'Complete'];
      const statusColors = {
        'Pending': '#f59e0b',
        'In Progress': '#3b82f6',
        'Needs Revision': '#8b5cf6',
        'Rejected': '#ef4444',
        'Complete': '#10b981'
      };

      // Count tasks per status
      const statusCounts: { [key: string]: number } = {};
      statuses.forEach(status => {
        statusCounts[status] = tasksToPrint.filter(t => (t.status || 'Pending') === status).length;
      });

      if (tbody && thead) {
        tbody.innerHTML = '';

        // Update header for kanban format with counts
        // Update header for kanban format with counts - Print Friendly Styles
        thead.innerHTML = statuses.map(status => {
          const count = statusCounts[status];
          const color = statusColors[status as keyof typeof statusColors];
          // Use colored top border instead of background color for better printing
          return `<th style="border:1px solid #e5e7eb; border-top: 4px solid ${color}; padding:10px 6px; background:#f9fafb; color:#1f2937; vertical-align:top; width:${100 / statuses.length}%; font-weight:700; font-size:8pt; text-transform: uppercase;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span>${esc(status)}</span>
                  <span style="background:#e5e7eb; color:#374151; padding:2px 8px; border-radius:12px; font-size:7pt;">${count}</span>
                </div>
          </th>`;
        }).join('');

        // Create a row with columns for each status
        const kanbanRow = document.createElement('tr');
        // Allow the kanban row to break across pages if it's too tall
        kanbanRow.style.pageBreakInside = 'auto';
        kanbanRow.style.breakInside = 'auto';

        statuses.forEach(status => {
          const statusTasks = tasksToPrint.filter(t => (t.status || 'Pending') === status);
          const cell = document.createElement('td');
          cell.style.cssText = 'border:1px solid #ddd;padding:6px;vertical-align:top;background:#fafafa;';

          if (statusTasks.length === 0) {
            cell.innerHTML = '<div style="text-align:center;color:#999;padding:16px;font-style:italic;font-size:7pt;">No tasks</div>';
          } else {
            // Group by project
            const byProject: { [key: string]: Task[] } = {};
            statusTasks.forEach(task => {
              const projectName = task.project_name || 'Unknown';
              if (!byProject[projectName]) byProject[projectName] = [];
              byProject[projectName].push(task);
            });

            let html = '';
            Object.keys(byProject).sort().forEach(projectName => {
              const projectTasks = byProject[projectName];

              // Project header (avoid break after header so it sticks to first task)
              html += `<div style="break-after: avoid; page-break-after: avoid; margin-bottom:6px;padding:4px;background:#f3f4f6;border-radius:3px;border:1px solid #e5e7eb;">
                <strong style="font-size:7.5pt;color:#111827;">${esc(projectName)}</strong>
                <span style="font-size:6.5pt;color:#6b7280;margin-left:4px;">(${projectTasks.length})</span>
              </div>`;

              projectTasks.forEach(task => {
                const isOverdue = task.due && new Date(task.due) < new Date() && status !== 'Complete';
                const priorityColor = task.priority === 'High' ? '#dc2626' :
                  task.priority === 'Medium' ? '#f59e0b' : '#6b7280';

                // Card background based on status and overdue
                let cardBg = '#ffffff';
                let borderColor = statusColors[status as keyof typeof statusColors];
                if (isOverdue) {
                  cardBg = '#fef2f2';
                  borderColor = '#dc2626';
                }

                html += `
                  <div style="break-inside: avoid; page-break-inside: avoid; background:${cardBg};border-left:3px solid ${borderColor};padding:6px;margin-bottom:6px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,0.05);border:1px solid #e5e7eb; border-left-width:3px;">
                    <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:3px;">
                      <div style="font-weight:600;font-size:7.5pt;color:#111827;flex:1;">${esc(task.task)}</div>
                      ${task.priority ? `<div style="background:${priorityColor};color:white;font-size:5.5pt;padding:1px 4px;border-radius:2px;margin-left:4px;white-space:nowrap; print-color-adjust: exact;-webkit-print-color-adjust: exact;">${esc(task.priority)}</div>` : ''}
                    </div>
                    <div style="font-size:6.5pt;color:#6b7280;line-height:1.4;">
                      ${task.assignees && task.assignees.length > 0 ? `
                        <div style="margin-bottom:2px;">
                          <svg xmlns="http://www.w3.org/2000/svg" height="8" width="8" viewBox="0 -960 960 960" fill="currentColor" style="vertical-align:middle;margin-right:2px;">
                            <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z"/>
                          </svg>
                          ${esc((task.assignees || []).join(', '))}
                        </div>
                      ` : ''}
                      ${task.due ? `
                        <div style="${isOverdue ? 'color:#dc2626;font-weight:600;' : ''}">
                          <svg xmlns="http://www.w3.org/2000/svg" height="8" width="8" viewBox="0 -960 960 960" fill="currentColor" style="vertical-align:middle;margin-right:2px;">
                            <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Z"/>
                          </svg>
                          ${esc(formatDate(task.due))}${isOverdue ? ' (OVERDUE)' : ''}
                        </div>
                      ` : ''}
                      ${status === 'Complete' && task.completed_at ? `
                        <div style="color:#059669;font-weight:600;margin-top:2px;">
                          <svg xmlns="http://www.w3.org/2000/svg" height="8" width="8" viewBox="0 -960 960 960" fill="currentColor" style="vertical-align:middle;margin-right:2px;">
                            <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
                          </svg>
                          ${esc(formatDate(task.completed_at))}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              });
              // Add spacing after project group
              html += `<div style="height:6px;"></div>`;
            });

            cell.innerHTML = html;
          }

          kanbanRow.appendChild(cell);
        });

        tbody.appendChild(kanbanRow);
      }

      // Show total with breakdown
      const reportTotal = el('reportTotal');
      if (reportTotal) {
        reportTotal.textContent = tasksToPrint.length.toString();
      }

      // Show status breakdown instead of completion stats
      if (reportStats) {
        const statusBreakdown = statuses.map(status => {
          const count = statusCounts[status];
          return `<li>${status}: ${count} tasks</li>`;
        }).join('');

        reportStats.innerHTML = `
                  <p><strong>Status Breakdown:</strong></p>
                  <ul style="margin:0;padding-left:20px;">
                    ${statusBreakdown}
                  </ul>
              `;
      }
    }


    // Export to Excel function
    function exportToExcel(tasksToPrint: Task[], options: any) {
      const dateTypeLabel = options.dateFilterType === 'completed' ? 'Completion Date' :
        options.dateFilterType === 'created' ? 'Created Date' : 'Due Date';

      // Prepare data for Excel
      const excelData = tasksToPrint.map(task => ({
        'Project': task.project_name || '',
        'Task': task.task || '',
        'Assignees': (task.assignees || []).join(', '),
        'Due Date': formatDate(task.due),
        'Priority': task.priority || '',
        'Status': task.status || 'Pending',
        'Completed': task.completed_at ? formatDate(task.completed_at) : '-',
        ...(options.showDesc ? { 'Description': task.description || '' } : {})
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 25 }, // Project
        { wch: 40 }, // Task
        { wch: 20 }, // Assignees
        { wch: 12 }, // Due Date
        { wch: 10 }, // Priority
        { wch: 15 }, // Status
        { wch: 12 }, // Completed
        ...(options.showDesc ? [{ wch: 50 }] : []) // Description
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Task_Report_${timestamp}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);

      toast('Excel report downloaded successfully!', 'success');
    }

    // Export to PDF function
    function exportToPDF(tasksToPrint: Task[], options: any) {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

      const dateTypeLabel = options.dateFilterType === 'completed' ? 'Completion Date' :
        options.dateFilterType === 'created' ? 'Created Date' : 'Due Date';

      // Add title
      doc.setFontSize(16);
      doc.text('Task Report', 14, 15);

      // Add metadata
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()} `, 14, 22);

      let yPos = 28;
      if (options.statuses && options.statuses.length > 0) {
        doc.text(`Statuses: ${options.statuses.join(', ')} `, 14, yPos);
        yPos += 5;
      }
      if (options.dateFrom || options.dateTo) {
        doc.text(`${dateTypeLabel}: ${options.dateFrom || 'Start'} to ${options.dateTo || 'End'} `, 14, yPos);
        yPos += 5;
      }

      // Prepare table data
      const headers = [
        ['Project', 'Task', 'Assignees', 'Due Date', 'Priority', 'Status', 'Completed']
      ];

      if (options.showDesc) {
        headers[0].push('Description');
      }

      const tableData = tasksToPrint.map(task => {
        const row = [
          task.project_name || '',
          task.task || '',
          (task.assignees || []).join(', '),
          formatDate(task.due),
          task.priority || '',
          task.status || 'Pending',
          task.completed_at ? formatDate(task.completed_at) : '-'
        ];

        if (options.showDesc) {
          row.push(task.description || '');
        }

        return row;
      });

      // Add table
      autoTable(doc, {
        head: headers,
        body: tableData,
        startY: yPos + 5,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [31, 41, 55], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 35 }, // Project
          1: { cellWidth: 50 }, // Task
          2: { cellWidth: 30 }, // Assignees
          3: { cellWidth: 20 }, // Due Date
          4: { cellWidth: 15 }, // Priority
          5: { cellWidth: 20 }, // Status
          6: { cellWidth: 20 }, // Completed
          ...(options.showDesc ? { 7: { cellWidth: 'auto' } } : {})
        },
        margin: { left: 14, right: 14 }
      });

      // Add statistics if enabled
      if (options.showStats) {
        const completed = tasksToPrint.filter(t => t.status === 'Complete');
        if (completed.length > 0) {
          const onTime = completed.filter(t => {
            const due = new Date(t.due);
            const done = new Date(t.completed_at || '');
            return done <= due;
          });

          const finalY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(10);
          doc.text('Completion Statistics:', 14, finalY);
          doc.setFontSize(9);
          doc.text(`Total Tasks: ${tasksToPrint.length} `, 14, finalY + 6);
          doc.text(`Completed: ${completed.length} `, 14, finalY + 11);
          doc.text(`On Time: ${onTime.length} `, 14, finalY + 16);
          doc.text(`Late: ${completed.length - onTime.length} `, 14, finalY + 21);
        }
      }

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Task_Report_${timestamp}.pdf`;

      // Download
      doc.save(filename);

      toast('PDF report downloaded successfully!', 'success');
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
