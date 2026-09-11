let allStudents = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    fetchStudents();
});

// Page Navigation
function switchPage(pageId, element) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    document.getElementById(`page-${pageId}`).classList.add('active');
    if (element) element.classList.add('active');

    // Title Updates
    const titles = {
        dashboard: { title: 'Dashboard', sub: 'System overview and key analytics' },
        students: { title: 'Students Directory', sub: 'Manage and search student records' },
        academics: { title: 'Academics Analytics', sub: 'Departmental breakdown and trends' },
        settings: { title: 'System Settings', sub: 'Preferences and application info' }
    };

    if (titles[pageId]) {
        document.getElementById('pageTitle').innerText = titles[pageId].title;
        document.getElementById('pageSubtitle').innerText = titles[pageId].sub;
    }

    // Close Mobile Nav if open
    document.getElementById('sidebarNav').classList.remove('mobile-open');
}

// Fetch Students from API
async function fetchStudents() {
    try {
        const response = await fetch('/api/students');
        if (!response.ok) throw new Error('Failed to fetch students');
        
        allStudents = await response.json();
        renderDashboard();
        renderStudentTable(allStudents);
        renderAcademics();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Render Dashboard Data
function renderDashboard() {
    document.getElementById('dash-total-students').innerText = allStudents.length;
    
    const depts = new Set(allStudents.map(s => s.department)).size;
    document.getElementById('dash-total-depts').innerText = depts;

    const avgAge = allStudents.length > 0 
        ? (allStudents.reduce((acc, s) => acc + Number(s.age || 0), 0) / allStudents.length).toFixed(1)
        : 0;
    document.getElementById('dash-avg-age').innerText = avgAge;

    // Recent 5 Students
    const recent = [...allStudents].reverse().slice(0, 5);
    const tbody = document.getElementById('dashRecentTable');
    tbody.innerHTML = recent.length === 0 
        ? `<tr><td colspan="5" class="empty-msg">No students registered yet.</td></tr>`
        : recent.map(s => `
            <tr>
                <td><strong>${s.student_id}</strong></td>
                <td>${s.name}</td>
                <td><span class="badge dept">${s.department}</span></td>
                <td>${s.year}</td>
                <td>${s.email || '-'}</td>
            </tr>
        `).join('');
}

// Render Full Student Table
function renderStudentTable(students) {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = students.length === 0 
        ? `<tr><td colspan="8" class="empty-msg">No records found.</td></tr>`
        : students.map(s => `
            <tr>
                <td><strong>${s.student_id}</strong></td>
                <td>${s.name}</td>
                <td>${s.age}</td>
                <td>${s.gender}</td>
                <td><span class="badge dept">${s.department}</span></td>
                <td>${s.year}</td>
                <td>${s.email || s.phone || '-'}</td>
                <td class="action-cell">
                    <button class="action-btn" onclick="editStudent('${s.id}')" title="Edit">✏️</button>
                    <button class="action-btn" onclick="deleteStudent('${s.id}')" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
}

// Render Academics Progress Bars
function renderAcademics() {
    const container = document.getElementById('deptProgressContainer');
    if (allStudents.length === 0) {
        container.innerHTML = `<p class="empty-msg">No student data available.</p>`;
        return;
    }

    const counts = {};
    allStudents.forEach(s => {
        counts[s.department] = (counts[s.department] || 0) + 1;
    });

    container.innerHTML = Object.entries(counts).map(([dept, count]) => {
        const percent = Math.round((count / allStudents.length) * 100);
        return `
            <div class="stat-progress-item">
                <div class="stat-progress-header">
                    <span>${dept}</span>
                    <strong>${count} (${percent}%)</strong>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%;"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter Students Function
function filterStudents() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const dept = document.getElementById('deptFilter').value;

    const filtered = allStudents.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search) ||
                              s.student_id.toLowerCase().includes(search) ||
                              (s.email && s.email.toLowerCase().includes(search));
        const matchesDept = dept === '' || s.department === dept;
        return matchesSearch && matchesDept;
    });

    renderStudentTable(filtered);
}

// Save Student (Create/Update)
async function saveStudent(e) {
    e.preventDefault();
    
    const dbId = document.getElementById('studentDbId').value;
    const payload = {
        student_id: document.getElementById('studentId').value,
        name: document.getElementById('name').value,
        age: parseInt(document.getElementById('age').value),
        gender: document.getElementById('gender').value,
        department: document.getElementById('department').value,
        year: document.getElementById('year').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value
    };

    const url = dbId ? `/api/students/${dbId}` : '/api/students';
    const method = dbId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to save student.');

        showNotification(dbId ? 'Student updated successfully!' : 'Student added successfully!', 'success');
        closeModal();
        fetchStudents();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Edit Student Modal Populate
function editStudent(id) {
    const student = allStudents.find(s => s.id == id);
    if (!student) return;

    document.getElementById('modalTitle').innerText = 'Edit Student';
    document.getElementById('studentDbId').value = student.id;
    document.getElementById('studentId').value = student.student_id;
    document.getElementById('name').value = student.name;
    document.getElementById('age').value = student.age;
    document.getElementById('gender').value = student.gender;
    document.getElementById('department').value = student.department;
    document.getElementById('year').value = student.year;
    document.getElementById('email').value = student.email || '';
    document.getElementById('phone').value = student.phone || '';

    openModal();
}

// Delete Student
async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
        const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete student.');

        showNotification('Student record deleted.', 'success');
        fetchStudents();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// CSV Export
function exportToCSV() {
    if (allStudents.length === 0) {
        showNotification('No student data available to export.', 'error');
        return;
    }

    const headers = ["Student ID", "Name", "Age", "Gender", "Department", "Year", "Email", "Phone"];
    const rows = allStudents.map(s => [
        `"${s.student_id || ''}"`,
        `"${s.name || ''}"`,
        `"${s.age || ''}"`,
        `"${s.gender || ''}"`,
        `"${s.department || ''}"`,
        `"${s.year || ''}"`,
        `"${s.email || ''}"`,
        `"${s.phone || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Student_Records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('Student records exported successfully!', 'success');
}

// UI Helpers
function openModal() {
    document.getElementById('studentModal').classList.add('active');
}

function closeModal() {
    document.getElementById('studentModal').classList.remove('active');
    document.getElementById('studentForm').reset();
    document.getElementById('studentDbId').value = '';
    document.getElementById('modalTitle').innerText = 'Add New Student';
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
}

function toggleMobileNav() {
    document.getElementById('sidebarNav').classList.toggle('mobile-open');
}

function showNotification(msg, type = 'success') {
    const toast = document.getElementById('notification');
    toast.innerText = msg;
    toast.className = `show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}
