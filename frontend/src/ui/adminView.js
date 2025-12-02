import { DEFAULT_PAGE_SIZE } from '../config.js';
import {
    appendResults,
    getSession,
    getStats,
    getStudentTranscript,
    importHistory,
    importStudentProfiles,
    listStudentProfiles,
    listStudents,
    setSession
} from '../data/dataStore.js';
import { parseWorkbook } from '../services/importService.js';
import { qs, qsa, on, show, hide, setText } from '../utils/dom.js';
import { formatDecimal } from '../utils/format.js';
import { initTableView } from './tableView.js';

export function initAdminView({ slipView, authView }) {
    const accessForm = qs('#adminAccessForm');
    const codeInput = qs('#adminCodeInput');
    const inlineError = qs('#admin-inline-error');
    const loginCard = qs('#admin-login-card');
    const workspace = qs('#admin-workspace');
    const welcomeName = qs('#adminWelcomeEmail');
    const logoutBtn = qs('#adminLogoutBtn');
    const statusBox = qs('#admin-status');
    const statusIcon = qs('#admin-status-icon');
    const statusText = qs('#admin-status-text');
    const catalogStat = qs('#catalogStat');
    const studentStat = qs('#studentStat');
    const sessionInput = qs('#setSessionInput');
    const saveSessionBtn = qs('#saveSessionBtn');
    const historyFile = qs('#historyFile');
    const historyFileName = qs('#historyFileName');
    const historyBtn = qs('#processHistoryBtn');
    const appendFile = qs('#appendFile');
    const appendFileName = qs('#appendFileName');
    const appendBtn = qs('#appendMarksBtn');
    const appendCourseCodeInput = qs('#appendCourseCode');
    const appendCourseTitleInput = qs('#appendCourseTitle');
    const appendCourseCreditsInput = qs('#appendCourseCredits');
    const directoryCard = qs('#admin-directory-card');
    const detailCard = qs('#admin-detail-card');
    const backBtn = qs('#backToDirectoryBtn');
    const printBtn = qs('#printAdminSlip');
    const refreshCoursesBtn = qs('#refreshCoursesBtn');
    const courseTableBody = qs('#courseTableBody');
    const courseTotalStat = qs('#courseTotalStat');
    const courseEnrollmentStat = qs('#courseEnrollmentStat');
    const summaryOutput = qs('#admin-summary-output');
    const detailName = qs('#detailStudentName');
    const detailId = qs('#detailStudentId');
    const intakeSelect = qs('#intakeFilter');
    const detailTabButtons = qsa('.detail-tab');
    const detailPanels = qsa('.detail-panel');
    const directoryTabs = qsa('.directory-tab');
    const directoryListPanel = qs('#directory-list-panel');
    const directoryUploadPanel = qs('#directory-upload-panel');
    const addStudentIntakeInput = qs('#addStudentIntakeInput');
    const addStudentFile = qs('#addStudentFile');
    const addStudentFileName = qs('#addStudentFileName');
    const addStudentUploadBtn = qs('#addStudentUploadBtn');
    const addStudentStatus = qs('#addStudentStatus');

    const tableView = initTableView({
        onFilter: handleFilterChange,
        onIntakeChange: handleIntakeChange,
        onPageChange: handlePageChange,
        onRowSelect: handleRowSelect
    });

    const state = {
        loggedIn: false,
        table: { page: 1, size: DEFAULT_PAGE_SIZE, filter: '', intake: '' },
        detailTab: 'overview',
        directoryPanel: 'list'
    };

    initialize();

    async function initialize() {
        const session = await getSession();
        if (sessionInput) sessionInput.value = session || '';
        await refreshStats();
        await refreshIntakeOptions();
        await refreshTable();
        resetDetailView();
        switchDirectoryPanel('list');
        showDirectory();
    }

    detailTabButtons.forEach(button => {
        on(button, 'click', () => switchDetailPanel(button.dataset.detail));
    });

    directoryTabs.forEach(tab => {
        on(tab, 'click', () => switchDirectoryPanel(tab.dataset.panel));
    });

    setupFileWatcher(historyFile, historyFileName);
    setupFileWatcher(appendFile, appendFileName);
    setupFileWatcher(addStudentFile, addStudentFileName);

    on(accessForm, 'submit', async (event) => {
        event.preventDefault();
        const email = (codeInput?.value || '').trim();
        const passwordInput = qs('#adminPasswordInput');
        const password = (passwordInput?.value || '').trim();

        if (!email || !password) {
            return showInlineError('Enter email and password to continue.');
        }

        try {
            const { user, error } = await authView.signIn?.(email, password) || {};
            if (error) {
                return showInlineError(error);
            }

            showInlineError('');
            state.loggedIn = true;
            if (accessForm) accessForm.reset();
            hide(loginCard);
            show(workspace);
            setText(welcomeName, email);
            setStatus('success', 'Connected to Supabase. You can now manage student data.');
        } catch (error) {
            showInlineError(error?.message || 'Authentication failed');
        }
    });

    on(logoutBtn, 'click', async () => {
        try {
            await authView.signOut?.();
        } catch (error) {
            console.error('Logout error:', error);
        }
        state.loggedIn = false;
        show(loginCard);
        hide(workspace);
        showDirectory();
        slipView.resetAdmin();
        resetDetailView();
    });

    on(saveSessionBtn, 'click', async () => {
        const value = (sessionInput?.value || '').trim();
        if (!value) {
            return setStatus('error', 'Enter a session label.');
        }
        try {
            await setSession(value);
            setStatus('success', `Active session set to ${value}.`);
        } catch (error) {
            setStatus('error', error?.message || 'Unable to save session.');
        }
    });

    on(historyBtn, 'click', async () => {
        if (!historyFile?.files?.length) {
            return setStatus('error', 'Select a file to import.');
        }
        try {
            setStatus('info', 'Reading file...');
            const rows = await parseWorkbook(historyFile, 'Joined');
            const result = await importHistory(rows);
            historyFile.value = '';
            resetFileLabel(historyFileName);
            await refreshStats();
            await refreshIntakeOptions();
            await refreshTable();
            slipView.resetAdmin();
            resetDetailView();
            showDirectory();
            const extra = result.skipped ? ` Skipped ${result.skipped} rows without IDs.` : '';
            setStatus('success', `Imported ${result.imported} students from ${result.processedRows} rows.${extra}`);
        } catch (error) {
            setStatus('error', error?.message || 'Unable to parse the file.');
        }
    });

    on(appendBtn, 'click', async () => {
        if (!appendFile?.files?.length) {
            return setStatus('error', 'Select a file to append.');
        }
        const courseCode = (appendCourseCodeInput?.value || '').trim().toUpperCase();
        const courseTitle = (appendCourseTitleInput?.value || '').trim().toUpperCase();
        const creditsRaw = (appendCourseCreditsInput?.value || '').trim();
        const creditsValue = parseFloat(creditsRaw);
        if (appendCourseCodeInput) appendCourseCodeInput.value = courseCode;
        if (appendCourseTitleInput) appendCourseTitleInput.value = courseTitle;
        if (appendCourseCreditsInput && creditsRaw) appendCourseCreditsInput.value = creditsRaw;
        if (!courseCode || !courseTitle) {
            return setStatus('error', 'Set both course code and title (uppercase) before uploading.');
        }
        if (!Number.isFinite(creditsValue) || creditsValue <= 0) {
            return setStatus('error', 'Enter a valid credit hour (greater than 0).');
        }
        try {
            setStatus('info', 'Reading append file...');
            const rows = await parseWorkbook(appendFile);
            const result = await appendResults(rows, { courseCode, courseTitle, credits: creditsValue });
            appendFile.value = '';
            resetFileLabel(appendFileName);
            await refreshStats();
            await refreshIntakeOptions();
            await refreshTable();
            const extra = result.skipped ? ` ${result.skipped} entries were skipped.` : '';
            setStatus('success', `Appended marks for ${result.updated} students.${extra}`);
        } catch (error) {
            setStatus('error', error?.message || 'Unable to append marks.');
        }
    });

    on(backBtn, 'click', () => {
        showDirectory();
        slipView.resetAdmin();
        resetDetailView();
    });

    on(printBtn, 'click', () => window.print());

    on(addStudentUploadBtn, 'click', async () => {
        const intakeValue = (addStudentIntakeInput?.value || '').trim();
        if (!/^\d{2}-\d{4}$/.test(intakeValue)) {
            return setAddStudentStatus('error', 'Enter intake in mm-yyyy format.');
        }
        if (!addStudentFile?.files?.length) {
            return setAddStudentStatus('error', 'Select a .xlsx file to upload.');
        }
        try {
            setAddStudentStatus('info', 'Reading file...');
            const rows = await parseWorkbook(addStudentFile);
            const result = await importStudentProfiles(rows, intakeValue);
            addStudentFile.value = '';
            resetFileLabel(addStudentFileName);
            setAddStudentStatus('success', `Created ${result.created} students, updated ${result.updated}, skipped ${result.skipped}.`);
            await refreshStats();
            await refreshIntakeOptions();
            await refreshTable();
        } catch (error) {
            setAddStudentStatus('error', error?.message || 'Unable to add students.');
        }
    });

    function showInlineError(message) {
        if (!inlineError) return;
        if (!message) {
            hide(inlineError);
            inlineError.textContent = '';
            return;
        }
        inlineError.textContent = message;
        show(inlineError);
    }

    async function refreshStats() {
        try {
            const stats = await getStats();
            setText(catalogStat, stats.catalog);
            setText(studentStat, stats.students);
        } catch {
            setText(catalogStat, '0');
            setText(studentStat, '0');
        }
    }

    async function refreshTable() {
        try {
            const data = await listStudents(state.table);
            state.table.page = data.page;
            state.table.size = data.size || state.table.size;
            tableView.render(data);
        } catch (error) {
            console.warn('Unable to render table', error);
            tableView.reset();
        }
    }

    async function refreshIntakeOptions() {
        if (!intakeSelect) return;
        try {
            const rows = await listStudentProfiles();
            populateIntakeOptions(rows);
        } catch (error) {
            console.warn('Unable to load intake options', error);
        }
    }

    function populateIntakeOptions(rows = []) {
        const current = intakeSelect?.value || '';
        const unique = Array.from(new Set(rows.map(item => (item.Intake || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const options = ['<option value="">All intakes</option>', ...unique.map(value => `<option value="${value}">${value}</option>`)];
        if (intakeSelect) intakeSelect.innerHTML = options.join('');
        if (intakeSelect) {
            if (current && unique.includes(current)) {
                intakeSelect.value = current;
            } else if (current) {
                intakeSelect.value = '';
                state.table.intake = '';
                state.table.page = 1;
            }
        }
    }

    function handleFilterChange(filter) {
        state.table.filter = filter;
        state.table.page = 1;
        refreshTable();
    }

    function handleIntakeChange(value) {
        state.table.intake = value;
        state.table.page = 1;
        refreshTable();
    }

    function handlePageChange(delta) {
        state.table.page = Math.max(1, state.table.page + delta);
        refreshTable();
    }

    async function handleRowSelect(studentId) {
        if (!studentId) return;
        try {
            const record = await getStudentTranscript(studentId);
            if (!record) {
                return setStatus('error', `Unable to locate student ${studentId}.`);
            }
            const sessionLabel = await getSession();
            slipView.renderAdmin(record, sessionLabel);
            detailName.textContent = record.Name || record.ID;
            detailId.textContent = record.ID;
            renderSummary(record);
            showDetail();
        } catch (error) {
            setStatus('error', error?.message || 'Unable to load the transcript.');
        }
    }

    function renderSummary(student) {
        if (!summaryOutput) return;
        if (!student) {
            summaryOutput.innerHTML = '<p class="muted">Select a student to view the overview.</p>';
            return;
        }
        const semesters = (student.SemesterData || []).slice().sort((a, b) => a.Semester - b.Semester);
        const latest = semesters[semesters.length - 1];
        const currentSemesterLabel = latest ? `Semester ${latest.Semester}${latest.SessionLabel ? ` / ${latest.SessionLabel}` : ''}` : 'N/A';
        const currentGpa = latest?.GPA || '0.00';
        const totalCredits = formatDecimal(student.TotalCreditsEarned || 0);
        const pending = [];
        semesters.forEach(sem => {
            (sem.Courses || []).forEach(course => {
                const attempted = Number(course.CreditsAttempted) || Number(course.Credits) || 0;
                const earned = Number(course.CreditsEarned) || 0;
                if (attempted > earned) {
                    pending.push({
                        semester: sem.Semester,
                        session: sem.SessionLabel,
                        code: course.Code || '-',
                        title: course.Title || '-',
                        status: (course.Letter || '').toUpperCase() === 'F' ? 'Failed' : 'Pending credit'
                    });
                }
            });
        });
        summaryOutput.innerHTML = `
            <div class="card" style="margin-bottom:16px;">
                <div class="slip-meta" style="margin-top:0;">
                    <div><strong>Name</strong>${student.Name || 'N/A'}</div>
                    <div><strong>ID</strong>${student.ID || '-'}</div>
                    <div><strong>IC / Passport</strong>${student.IC || '-'}</div>
                    <div><strong>Intake</strong>${student.Intake || '-'}</div>
                </div>
                <div class="stat-board" style="margin-top:16px;">
                    <div class="stat">
                        <span>Current semester</span>
                        <strong>${currentSemesterLabel}</strong>
                    </div>
                    <div class="stat">
                        <span>Total credits earned</span>
                        <strong>${totalCredits}</strong>
                    </div>
                    <div class="stat">
                        <span>Current GPA</span>
                        <strong>${currentGpa}</strong>
                    </div>
                    <div class="stat">
                        <span>CGPA</span>
                        <strong>${student.CGPA || '0.00'}</strong>
                    </div>
                </div>
            </div>
            <div class="card">
                <h4 style="margin:0 0 8px;">Failed or pending courses</h4>
                ${pending.length ? `
                    <div class="table-wrapper">
                        <table class="slip-table" style="font-size:0.9rem;">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th style="width:40%;">Course</th>
                                    <th>Semester</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pending.map(item => `
                                    <tr>
                                        <td>${item.code}</td>
                                        <td>${item.title}</td>
                                        <td>${item.semester}${item.session ? ` / ${item.session}` : ''}</td>
                                        <td>${item.status}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p class="muted" style="margin:0;">No failed or pending courses recorded.</p>'}
            </div>
        `;
    }

    function showDirectory() {
        show(directoryCard);
        hide(detailCard);
    }

    function showDetail() {
        hide(directoryCard);
        show(detailCard);
        switchDetailPanel('overview');
    }

    function switchDirectoryPanel(target) {
        const next = target === 'upload' ? 'upload' : 'list';
        state.directoryPanel = next;
        directoryTabs.forEach(button => {
            button.classList.toggle('active', button.dataset.panel === next);
        });
        if (directoryListPanel) {
            if (next === 'list') {
                show(directoryListPanel);
            } else {
                hide(directoryListPanel);
            }
        }
        if (directoryUploadPanel) {
            if (next === 'upload') {
                show(directoryUploadPanel);
            } else {
                hide(directoryUploadPanel);
            }
        }
    }

    function switchDetailPanel(target) {
        state.detailTab = target;
        detailTabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.detail === target);
        });
        detailPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `detail-${target}`);
        });
    }

    function resetDetailView() {
        if (detailName) detailName.textContent = 'Student overview';
        if (detailId) detailId.textContent = 'Select a student to display details';
        if (summaryOutput) {
            summaryOutput.innerHTML = '<p class="muted" style="margin:0;">Select a student from the directory to view their profile.</p>';
        }
        switchDetailPanel('overview');
    }

    function setStatus(type, message) {
        if (!statusBox || !statusText || !statusIcon) return;
        if (!message) {
            hide(statusBox);
            return;
        }
        statusBox.className = `status ${type}`;
        statusText.textContent = message;
        statusIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';
        show(statusBox);
    }

    function setAddStudentStatus(type, message) {
        if (!addStudentStatus) return;
        if (!message) {
            hide(addStudentStatus);
            addStudentStatus.textContent = '';
            return;
        }
        addStudentStatus.className = `status ${type}`;
        addStudentStatus.textContent = message;
        show(addStudentStatus);
    }

    function setupFileWatcher(input, label) {
        if (!input || !label) return;
        on(input, 'change', () => {
            if (input.files?.length) {
                label.textContent = input.files[0].name;
            } else {
                label.textContent = 'No file selected';
            }
        });
    }

    function resetFileLabel(label) {
        if (label) label.textContent = 'No file selected';
    }
}
