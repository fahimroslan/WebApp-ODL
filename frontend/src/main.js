import { initStore } from './data/dataStore.js';
import { initLayout } from './ui/layout.js';
import { initAdminView } from './ui/adminView.js';
import { initSlipView } from './ui/slipView.js';
import { initStudentView } from './ui/studentView.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initStore();
    } catch (error) {
        console.warn('Unable to initialize data store', error);
    }
    initLayout();
    const slipView = initSlipView();
    initStudentView({ slipView });
    initAdminView({ slipView });
});
