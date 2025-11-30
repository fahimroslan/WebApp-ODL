import { Router } from '../core/router.js';
import { qsa, on, toggleClass } from '../utils/dom.js';

export function initLayout() {
    const tabButtons = qsa('.tab-button');
    const tabContents = qsa('.tab-content');
    const subButtons = qsa('.sub-tab');
    const subSections = qsa('.sub-section');

    const tabRouter = new Router({
        initial: 'student-tab',
        onChange: (target) => {
            tabButtons.forEach(button => toggleClass(button, 'active', button.dataset.tab === target));
            tabContents.forEach(section => toggleClass(section, 'active', section.id === target));
        }
    });

    const subRouter = new Router({
        initial: 'admin-session',
        onChange: (target) => {
            subButtons.forEach(button => toggleClass(button, 'active', button.dataset.section === target));
            subSections.forEach(section => toggleClass(section, 'active', section.id === target));
        }
    });

    tabButtons.forEach(button => {
        on(button, 'click', () => tabRouter.go(button.dataset.tab));
    });

    subButtons.forEach(button => {
        on(button, 'click', () => subRouter.go(button.dataset.section));
    });

    return {
        setTab: (id) => tabRouter.go(id),
        setAdminSection: (id) => subRouter.go(id)
    };
}
