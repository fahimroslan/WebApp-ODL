import { qs, on, setText } from '../utils/dom.js';

export function initTableView({ onFilter, onIntakeChange, onPageChange, onRowSelect } = {}) {
    const listEl = qs('#studentList');
    const searchInput = qs('#studentSearch');
    const intakeFilter = qs('#intakeFilter');
    const prevBtn = qs('#prevPage');
    const nextBtn = qs('#nextPage');
    const paginationText = qs('#paginationText');

    on(searchInput, 'input', (event) => {
        const value = (event.target.value || '').trim().toLowerCase();
        if (typeof onFilter === 'function') {
            onFilter(value);
        }
    });

    on(intakeFilter, 'change', (event) => {
        const value = (event.target.value || '').trim();
        if (typeof onIntakeChange === 'function') {
            onIntakeChange(value);
        }
    });

    on(prevBtn, 'click', () => {
        if (typeof onPageChange === 'function') {
            onPageChange(-1);
        }
    });

    on(nextBtn, 'click', () => {
        if (typeof onPageChange === 'function') {
            onPageChange(1);
        }
    });

    on(listEl, 'click', (event) => {
        const row = event.target.closest('tr[data-student]');
        if (!row || typeof onRowSelect !== 'function') return;
        onRowSelect(row.dataset.student);
    });

    function renderRows(items) {
        if (!listEl) return;
        if (!items.length) {
            listEl.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">No records</td></tr>';
            return;
        }
        listEl.innerHTML = items.map(student => {
            const badge = student.IsNew ? '<span class="tag tag-new">New</span>' : '';
            return `
            <tr data-student="${student.ID}" style="cursor:pointer;">
                <td>${student.ID}</td>
                <td>${student.Name || ''} ${badge}</td>
                <td>${student.Intake || ''}</td>
                <td style="text-align:right; font-weight:600;">${student.CGPA || '0.00'}</td>
                <td style="text-align:right; color:#0ea5e9;">View</td>
            </tr>
        `;
        }).join('');
    }

    return {
        render({ items = [], total = 0, page = 1, pageCount = 1, size = 0 } = {}) {
            renderRows(items);
            if (paginationText) {
                if (!total) {
                    setText(paginationText, 'No records');
                } else {
                    const start = (page - 1) * size + 1;
                    const end = Math.min(page * size, total);
                    setText(paginationText, `Showing ${start}-${end} of ${total}`);
                }
            }
            if (prevBtn) prevBtn.disabled = page <= 1;
            if (nextBtn) nextBtn.disabled = page >= pageCount;
        },
        reset() {
            renderRows([]);
            if (paginationText) setText(paginationText, 'No data');
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            if (searchInput) searchInput.value = '';
        }
    };
}
