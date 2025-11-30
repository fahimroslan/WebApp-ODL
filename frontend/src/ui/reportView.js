import { listReportRows } from '../data/dataStore.js';
import { qs, on, show, hide, setText } from '../utils/dom.js';

const HEADERS = ['ID', 'Name', 'IC', 'Course Code', 'Course Title', 'Mark', 'Semester taken'];

export function initReportView() {
    const refreshBtn = qs('#reportRefreshBtn');
    const exportBtn = qs('#reportExportBtn');
    const countEl = qs('#reportCount');
    const statusEl = qs('#reportStatus');

    const state = {
        rows: []
    };

    on(refreshBtn, 'click', loadRows);
    on(exportBtn, 'click', exportRows);

    loadRows();

    async function loadRows() {
        setStatus('info', 'Refreshing report...');
        try {
            const rows = await listReportRows();
            state.rows = rows;
            setText(countEl, rows.length);
            if (!rows.length) {
                setStatus('info', 'No rows available. Import or append marks to populate this report.');
            } else {
                hide(statusEl);
            }
        } catch (error) {
            console.warn('Unable to build report rows', error);
            setStatus('error', 'Unable to load report data from local storage.');
        }
    }

    function exportRows() {
        if (!state.rows.length) {
            return setStatus('error', 'Nothing to export yet.');
        }
        const csv = buildCsv(state.rows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `odl-report-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setStatus('success', 'Report exported to CSV.');
    }

    function setStatus(type, message) {
        if (!statusEl) return;
        statusEl.className = `status ${type}`;
        statusEl.textContent = message;
        if (message) {
            show(statusEl);
        } else {
            hide(statusEl);
        }
    }
}

function buildCsv(rows = []) {
    const lines = [HEADERS.join(',')];
    rows.forEach(row => {
        lines.push(HEADERS.map(header => escapeCsv(resolveValue(row, header))).join(','));
    });
    return lines.join('\r\n');
}

function resolveValue(row, header) {
    switch (header) {
        case 'ID':
            return row.ID || '';
        case 'Name':
            return row.Name || '';
        case 'IC':
            return row.IC || '';
        case 'Course Code':
            return row.CourseCode || '';
        case 'Course Title':
            return row.CourseTitle || '';
        case 'Mark':
            return row.Mark ?? '';
        case 'Semester taken':
            return row.SemesterTaken || '';
        default:
            return '';
    }
}

function escapeCsv(value) {
    const stringValue = (value ?? '').toString();
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}
