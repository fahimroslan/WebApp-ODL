import { qs } from '../utils/dom.js';
import { formatDecimal, formatDate } from '../utils/format.js';

const STUDENT_PLACEHOLDER = '<div class="slip-surface"><p class="muted" style="text-align:center;">Search for a record to preview the transcript.</p></div>';
const ADMIN_PLACEHOLDER = '<div class="slip-surface"><p class="muted" style="text-align:center;">Select a student from the directory to view the transcript.</p></div>';

export function initSlipView() {
    const studentMount = qs('#student-slip-output');
    const adminMount = qs('#admin-slip-output');
    const printable = qs('#printable-slip');

    resetStudent();
    resetAdmin();

    function renderSlip(student, activeSession) {
        if (!student) return '';
        const sessionLabel = activeSession || student.SemesterData?.[0]?.SessionLabel || 'Session N/A';
        const semestersHtml = buildSemesterHtml(student);
        return `
            <div class="slip-surface">
                <div class="slip-header">
                    <div class="slip-address">
                        <strong>Innovative University College</strong><br>
                        Centre for Digital Learning Learning<br>
                        Unit GL35, Main Lobby Block C, <br>
                        Kelana Square, Jalan SS 7/26, <br>
                        47301 Petaling Jaya, Selangor, Malaysia<br>
                        Tel: +603-2726 2436
                    </div>
                    <div style="text-align:right; font-size:0.85rem;">
                        <p style="margin:0;">Generated on ${formatDate()}</p>
                        <p style="margin:4px 0 0;">Session: <strong>${sessionLabel}</strong></p>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:6px;">
                    <h2 style="margin:0;">Academic Record</h2>
                    <div style="text-align:right;">
                        <p class="eyebrow" style="margin:0;">Student ID</p>
                        <p style="margin:0; font-size:1.1rem; font-weight:700;">${student.ID}</p>
                    </div>
                </div>
                <div class="slip-meta">
                    <div><strong>Name</strong>${student.Name || 'N/A'}</div>
                    <div><strong>IC / Passport</strong>${student.IC || '-'}</div>
                    <div><strong>Intake</strong>${student.Intake || '-'}</div>
                    <div><strong>Total Credits Earned</strong>${student.TotalCreditsEarned || 0}</div>
                </div>
                <div style="margin-top:8px; display:flex; flex-direction:column; gap:10px;">${semestersHtml}</div>
                <div style="border-top:1px solid #cbd5f5; margin-top:12px; padding-top:10px; display:flex; justify-content:space-between; font-weight:600; font-size:0.95rem;">
                    <span>CGPA: ${student.CGPA || '0.00'}</span>
                    <span>Verified via ODL Transcript Workspace</span>
                </div>
                <p style="margin-top:8px; text-align:center; font-size:0.75rem; color:#64748b;">Computer generated document. No signature required.</p>
            </div>`;
    }

    function mount(target, html) {
        if (target) target.innerHTML = html;
        if (printable) printable.innerHTML = html;
    }

    function buildSemesterHtml(student) {
        const semesters = (student.SemesterData || []).slice().sort((a, b) => a.Semester - b.Semester);
        if (!semesters.length) {
            return '<p style="text-align:center; color:#94a3b8;">No academic activity recorded.</p>';
        }
        return semesters.map(semester => {
            const rows = (semester.Courses || []).map(course => `
                <tr>
                    <td>${course.Code || '-'}</td>
                    <td>${course.Title || '-'}</td>
                    <td>${course.Mark ?? '-'}</td>
                    <td>${course.Letter || '-'}</td>
                    <td>${formatDecimal(course.Credits)}</td>
                    <td>${formatDecimal(course.GradePoints)}</td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center; padding:8px; color:#94a3b8;">No courses for this semester.</td></tr>';
            return `
                <div class="slip-semester">
                    <div class="slip-semester-title">
                        <span>Semester ${semester.Semester}${semester.SessionLabel ? ` / ${semester.SessionLabel}` : ''}</span>
                        <span>GPA ${semester.GPA || '0.00'}</span>
                    </div>
                    <table class="slip-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th style="width:55%;">Course</th>
                                <th>Mark</th>
                                <th>Grade</th>
                                <th>Credits</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <div class="slip-semester-summary">
                        Credits Earned: ${formatDecimal(semester.TotalCreditsEarned)} / Points: ${formatDecimal(semester.TotalPoints)}
                    </div>
                </div>
            `;
        }).join('');
    }

    function resetStudent() {
        if (studentMount) studentMount.innerHTML = STUDENT_PLACEHOLDER;
        if (printable) printable.innerHTML = '';
    }

    function resetAdmin() {
        if (adminMount) adminMount.innerHTML = ADMIN_PLACEHOLDER;
    }

    return {
        renderStudent(student, sessionLabel) {
            if (!student) return;
            mount(studentMount, renderSlip(student, sessionLabel));
        },
        renderAdmin(student, sessionLabel) {
            if (!student) return;
            mount(adminMount, renderSlip(student, sessionLabel));
        },
        resetStudent,
        resetAdmin,
        clearPrintable() {
            if (printable) printable.innerHTML = '';
        }
    };
}
