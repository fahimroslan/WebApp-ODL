import { initStore } from './data/dataStore.js';
import { initLayout } from './ui/layout.js';
import { initAdminView } from './ui/adminView.js';
import { initSlipView } from './ui/slipView.js';
import { initStudentView } from './ui/studentView.js';
import { initReportView } from './ui/reportView.js';
import { initCourseView } from './ui/courseView.js';
import { initAuth, onAuthStateChange } from './services/authService.js';
import { initAuthView } from './ui/authView.js';
import { qs } from './utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initAuth();
    } catch (error) {
        console.warn('Unable to initialize auth', error);
    }

    try {
        await initStore();
    } catch (error) {
        console.warn('Unable to initialize data store', error);
    }

    initLayout();
    const authView = initAuthView();
    const slipView = initSlipView();
    initStudentView({ slipView });
    initAdminView({ slipView, authView });
    initReportView();
    initCourseView();

    // Set up app ID display
    const appIdElement = qs('#login-app-id');
    if (appIdElement) {
        appIdElement.textContent = `${new Date().toISOString().split('T')[0]}`;
    }

    // Listen for auth state changes
    onAuthStateChange((user, role, event) => {
        if (event === 'SIGNED_IN') {
            console.log('User signed in');
        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
        }
    });
});
