import { listCourseCatalog, updateCourseCatalogEntry } from '../data/dataStore.js';
import { qs, on, show, hide, setText } from '../utils/dom.js';

export function initCourseView() {
    const tableBody = qs('#courseListBody');
    const countEl = qs('#courseCount');
    const refreshBtn = qs('#courseRefreshBtn');
    const statusEl = qs('#courseStatus');
    const form = qs('#courseEditForm');
    const codeInput = qs('#courseEditCode');
    const titleInput = qs('#courseEditTitle');
    const creditsInput = qs('#courseEditCredits');
    const saveBtn = qs('#courseSaveBtn');
    const clearBtn = qs('#courseClearBtn');

    const state = {
        courses: [],
        selectedCode: ''
    };

    on(refreshBtn, 'click', loadCourses);

    on(tableBody, 'click', (event) => {
        const row = event.target.closest('tr[data-course]');
        if (!row) return;
        selectCourse(row.dataset.course);
    });

    on(form, 'submit', async (event) => {
        event.preventDefault();
        if (!state.selectedCode) {
            return setStatus('error', 'Select a course from the table first.');
        }
        const title = (titleInput?.value || '').trim();
        const creditsValue = parseFloat(creditsInput?.value || '');
        if (!title) {
            return setStatus('error', 'Enter a course title.');
        }
        if (!Number.isFinite(creditsValue) || creditsValue <= 0) {
            return setStatus('error', 'Enter a credit hour greater than 0.');
        }
        try {
            setStatus('info', 'Saving changes...');
            await updateCourseCatalogEntry(state.selectedCode, {
                title: title.toUpperCase(),
                credits: creditsValue
            });
            setStatus('success', 'Course updated. All transcripts recalculated.');
            await loadCourses();
        } catch (error) {
            setStatus('error', error?.message || 'Unable to update the course.');
        }
    });

    on(clearBtn, 'click', () => {
        clearSelection();
    });

    loadCourses();

    async function loadCourses() {
        try {
            setStatus('info', 'Loading catalog...');
            const rows = await listCourseCatalog();
            state.courses = rows || [];
            renderTable();
            setText(countEl, state.courses.length);
            if (state.selectedCode && !state.courses.find(item => item.Code === state.selectedCode)) {
                clearSelection();
            }
            if (state.courses.length) {
                hide(statusEl);
            } else {
                setStatus('info', 'No courses have been added yet.');
            }
        } catch (error) {
            console.warn('Unable to load courses', error);
            setStatus('error', 'Unable to load course list.');
            renderTable([]);
        }
    }

    function renderTable(items = state.courses) {
        if (!tableBody) return;
        if (!items.length) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px;">No courses available.</td></tr>';
            return;
        }
        tableBody.innerHTML = items.map(course => `
            <tr data-course="${course.Code}" style="cursor:pointer; ${course.Code === state.selectedCode ? 'background:#eef2ff;' : ''}">
                <td>${course.Code}</td>
                <td>${course.Title || '-'}</td>
                <td>${course.Credits ?? 0}</td>
                <td>${course.Enrolled ?? 0}</td>
            </tr>
        `).join('');
    }

    function selectCourse(code) {
        if (!code) return;
        const match = state.courses.find(item => item.Code === code);
        if (!match) {
            setStatus('error', `Unable to locate course ${code}.`);
            return;
        }
        state.selectedCode = match.Code;
        if (codeInput) codeInput.value = match.Code;
        if (titleInput) titleInput.value = (match.Title || '').toUpperCase();
        if (creditsInput) creditsInput.value = match.Credits ?? '';
        if (saveBtn) saveBtn.disabled = false;
        renderTable();
        setStatus('info', `Editing ${match.Code}. Update the form and save.`);
    }

    function clearSelection() {
        state.selectedCode = '';
        if (codeInput) codeInput.value = '';
        if (titleInput) titleInput.value = '';
        if (creditsInput) creditsInput.value = '';
        if (saveBtn) saveBtn.disabled = true;
        renderTable();
        hide(statusEl);
    }

    function setStatus(type, message) {
        if (!statusEl) return;
        if (!message) {
            hide(statusEl);
            return;
        }
        statusEl.className = `status ${type}`;
        statusEl.textContent = message;
        show(statusEl);
    }
}
