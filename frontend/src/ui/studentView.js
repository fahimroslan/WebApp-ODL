import { APP_ID_PREFIX } from '../config.js';
import { getStudentByICAndName, getSession } from '../data/dataStore.js';
import { qs, on, show, hide, setText } from '../utils/dom.js';
import { normalizeIC, normalizeName } from '../utils/validators.js';

export function initStudentView({ slipView }) {
    const form = qs('#studentLoginForm');
    const icInput = qs('#studentIcInput');
    const nameInput = qs('#studentNameInput');
    const errorEl = qs('#student-login-error');
    const resultCard = qs('#studentResultCard');
    const clearBtn = qs('#clearStudentView');
    const printBtn = qs('#printStudentSlip');
    const buildSpan = qs('#login-app-id');
    const buildId = `${APP_ID_PREFIX}-${Date.now().toString(36).toUpperCase()}`;
    setText(buildSpan, buildId);

    hideError();
    if (resultCard) hide(resultCard);

    on(form, 'submit', async (event) => {
        event.preventDefault();
        hideError();
        const ic = normalizeIC(icInput?.value);
        const name = normalizeName(nameInput?.value);
        if (!ic || !name) {
            return showError('Enter both IC and name to continue.');
        }
        try {
            const student = await getStudentByICAndName(ic, name);
            if (!student) {
                return showError('No matching record found.');
            }
            const sessionLabel = await getSession();
            show(resultCard);
            slipView.renderStudent(student, sessionLabel);
        } catch (error) {
            showError(error?.message || 'Unable to locate the record.');
        }
    });

    on(clearBtn, 'click', () => {
        if (resultCard) hide(resultCard);
        slipView.resetStudent();
    });

    on(printBtn, 'click', () => window.print());

    function showError(message) {
        if (!errorEl) return;
        errorEl.textContent = message;
        show(errorEl);
    }

    function hideError() {
        if (!errorEl) return;
        hide(errorEl);
        errorEl.textContent = '';
    }
}
