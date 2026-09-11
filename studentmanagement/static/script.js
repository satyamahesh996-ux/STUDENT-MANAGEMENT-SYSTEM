// =========================================================
// STATE & DOM ELEMENTS
// =========================================================
let allStudents = [];

const pageTitle = document.getElementById("pageTitle");
const pageDescription = document.getElementById("pageDescription");
const studentModal = document.getElementById("studentModal");
const studentForm = document.getElementById("studentForm");
const notification = document.getElementById("notification");

const pageMetadata = {
  dashboard: {
    title: "Dashboard",
    description: "Overview of your student management system",
  },
  students: {
    title: "Student Records",
    description: "Add, edit, search and manage student records",
  },
  academic: {
    title: "Academic Overview",
    description: "Student distribution by department and year",
  },
  settings: {
    title: "System Settings",
    description: "Manage application preferences",
  },
};

// =========================================================
// INITIALIZATION
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupEventListeners();
  loadDashboardData();
  loadStudents();
  loadAcademicData();

  // Load Dark Mode state from LocalStorage
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
  }
});

// =========================================================
// NAVIGATION & PAGE SWITCHING
// =========================================================
function setupNavigation() {
  const navButtons = document.querySelectorAll(".nav-item");

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetPage = button.getAttribute("data-page");
      showPage(targetPage);
    });
  });
}

function showPage(pageId) {
  // Update sidebar active states
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-page") === pageId
    );
  });

  // Update page view visibility
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.remove("active");
  });

  const targetSection = document.getElementById(`${pageId}Page`);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Update Header Metadata
  if (pageMetadata[pageId]) {
    pageTitle.textContent = pageMetadata[pageId].title;
    pageDescription.textContent = pageMetadata[pageId].description;
  }

  // Refresh data on navigation
  if (pageId === "dashboard") loadDashboardData();
  if (pageId === "students") loadStudents();
  if (pageId === "academic") loadAcademicData();
}

// =========================================================
// EVENT LISTENERS
// =========================================================
function setupEventListeners() {
  // Form submission (Add / Edit)
  studentForm.addEventListener("submit", handleFormSubmit);

  // Search and Filter Listeners
  document
    .getElementById("searchInput")
    ?.addEventListener("input", filterStudents);
  document
    .getElementById("departmentFilter")
    ?.addEventListener("change", filterStudents);
  document
    .getElementById("yearFilter")
    ?.addEventListener("change", filterStudents);

  // Dark mode button
  document
    .getElementById("darkModeBtn")
    ?.addEventListener("click", toggleDarkMode);
}

// =========================================================
// API DATA FETCHING & RENDERING
// =========================================================

// Load Dashboard Cards and Recent Students
async function loadDashboardData() {
  try {
    const res = await fetch("/api/dashboard");
    const data = await res.json();

    document.getElementById("totalStudents").textContent = data.total || 0;
    document.getElementById("maleStudents").textContent = data.male || 0;
    document.getElementById("femaleStudents").textContent = data.female || 0;
    document.getElementById("departmentCount").textContent =
      data.departments || 0;

    renderRecentStudents(data.recent || []);
  } catch (err) {
    showNotification("Failed to fetch dashboard data", "error");
  }
}

function renderRecentStudents(recentList) {
  const tbody = document.getElementById("recentStudents");
  if (!tbody) return;

  if (recentList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">No recent student records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = recentList
    .map(
      (stu) => `
        <tr>
            <td><strong>${escapeHtml(stu.student_id)}</strong></td>
            <td>${escapeHtml(stu.name)}</td>
            <td><span class="badge dept">${escapeHtml(stu.department || "N/A")}</span></td>
            <td>${escapeHtml(stu.year || "N/A")}</td>
            <td>${escapeHtml(stu.gender || "N/A")}</td>
        </tr>
    `
    )
    .join("");
}

// Load Main Students Table
async function loadStudents() {
  try {
    const res = await fetch("/api/students");
    allStudents = await res.json();
    filterStudents();
  } catch (err) {
    showNotification("Failed to fetch student list", "error");
  }
}

function renderStudentsTable(students) {
  const tbody = document.getElementById("studentTable");
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-msg">No students found matching your criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = students
    .map(
      (stu, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(stu.student_id)}</strong></td>
            <td>${escapeHtml(stu.name)}</td>
            <td>${stu.age || "N/A"}</td>
            <td>${escapeHtml(stu.gender || "N/A")}</td>
            <td><span class="badge dept">${escapeHtml(stu.department || "N/A")}</span></td>
            <td><span class="badge year">${escapeHtml(stu.year || "N/A")}</span></td>
            <td>${escapeHtml(stu.email || "N/A")}</td>
            <td>${escapeHtml(stu.phone || "N/A")}</td>
            <td class="action-cells">
                <button class="btn-icon edit" onclick="editStudent(${stu.id})" title="Edit">✏️</button>
                <button class="btn-icon delete" onclick="deleteStudent(${stu.id})" title="Delete">🗑️</button>
            </td>
        </tr>
    `
    )
    .join("");
}

// Search and Filter Logic
function filterStudents() {
  const query = document
    .getElementById("searchInput")
    ?.value.toLowerCase()
    .trim();
  const deptFilter = document.getElementById("departmentFilter")?.value;
  const yearFilter = document.getElementById("yearFilter")?.value;

  const filtered = allStudents.filter((stu) => {
    const matchesQuery =
      !query ||
      stu.student_id.toLowerCase().includes(query) ||
      stu.name.toLowerCase().includes(query) ||
      (stu.department && stu.department.toLowerCase().includes(query)) ||
      (stu.email && stu.email.toLowerCase().includes(query));

    const matchesDept = !deptFilter || stu.department === deptFilter;
    const matchesYear = !yearFilter || stu.year === yearFilter;

    return matchesQuery && matchesDept && matchesYear;
  });

  renderStudentsTable(filtered);
}

// Load Academic Tab Statistics
async function loadAcademicData() {
  try {
    const res = await fetch("/api/academic");
    const data = await res.json();

    document.getElementById("academicTotal").textContent = data.total || 0;
    document.getElementById("academicDepartments").textContent =
      Object.keys(data.departments || {}).length;
    document.getElementById("academicYears").textContent = Object.keys(
      data.years || {}
    ).length;

    renderStatBars("departmentStats", data.departments, data.total);
    renderStatBars("yearStats", data.years, data.total);
  } catch (err) {
    showNotification("Failed to fetch academic analytics", "error");
  }
}

function renderStatBars(elementId, statsObj, total) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (!statsObj || Object.keys(statsObj).length === 0 || total === 0) {
    container.innerHTML = `<p class="empty-msg">No statistics available yet.</p>`;
    return;
  }

  container.innerHTML = Object.entries(statsObj)
    .map(([key, count]) => {
      const percentage = Math.round((count / total) * 100);
      return `
            <div class="stat-progress-item">
                <div class="stat-progress-label">
                    <span>${escapeHtml(key)}</span>
                    <strong>${count} (${percentage}%)</strong>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    })
    .join("");
}

// =========================================================
// FORM ACTIONS & MODAL HANDLERS
// =========================================================

function openModal() {
  document.getElementById("modalTitle").textContent = "Add Student";
  document.getElementById("editId").value = "";
  studentForm.reset();
  studentModal.classList.add("active");
}

function closeModal() {
  studentModal.classList.remove("active");
  studentForm.reset();
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById("editId").value;

  const payload = {
    student_id: document.getElementById("student_id").value.trim(),
    name: document.getElementById("name").value.trim(),
    age: document.getElementById("age").value
      ? parseInt(document.getElementById("age").value)
      : null,
    gender: document.getElementById("gender").value,
    department: document.getElementById("department").value,
    year: document.getElementById("year").value,
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
  };

  const url = editId ? `/api/students/${editId}` : "/api/students";
  const method = editId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      showNotification(data.error || "Failed to save record", "error");
      return;
    }

    showNotification(data.message || "Student saved successfully!", "success");
    closeModal();
    loadStudents();
    loadDashboardData();
  } catch (err) {
    showNotification("An unexpected error occurred.", "error");
  }
}

async function editStudent(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    const data = await res.json();

    if (!res.ok) {
      showNotification("Could not load student details", "error");
      return;
    }

    document.getElementById("modalTitle").textContent = "Edit Student";
    document.getElementById("editId").value = data.id;
    document.getElementById("student_id").value = data.student_id || "";
    document.getElementById("name").value = data.name || "";
    document.getElementById("age").value = data.age || "";
    document.getElementById("gender").value = data.gender || "";
    document.getElementById("department").value = data.department || "";
    document.getElementById("year").value = data.year || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("phone").value = data.phone || "";

    studentModal.classList.add("active");
  } catch (err) {
    showNotification("Failed to load student data", "error");
  }
}

async function deleteStudent(id) {
  if (!confirm("Are you sure you want to delete this student?")) return;

  try {
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      showNotification(data.message, "success");
      loadStudents();
      loadDashboardData();
    } else {
      showNotification(data.error || "Failed to delete student", "error");
    }
  } catch (err) {
    showNotification("Server error during deletion", "error");
  }
}

async function clearAllStudents() {
  if (
    !confirm(
      "⚠️ WARNING: This will permanently delete ALL student records from the database. Are you sure?"
    )
  )
    return;

  try {
    const res = await fetch("/api/students/clear", { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      showNotification("All student records cleared!", "success");
      loadStudents();
      loadDashboardData();
      loadAcademicData();
    } else {
      showNotification(data.error || "Failed to clear records", "error");
    }
  } catch (err) {
    showNotification("Server error while clearing data", "error");
  }
}

// =========================================================
// UTILITIES & THEME TOGGLE
// =========================================================
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

function showNotification(msg, type = "success") {
  if (!notification) return;

  notification.textContent = msg;
  notification.className = `show ${type}`;

  setTimeout(() => {
    notification.className = "";
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}