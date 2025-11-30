import { USE_API_STORAGE } from '../config.js';
import * as storageLocal from './storageLocal.js';
import * as storageApi from './storageApi.js';

const provider = USE_API_STORAGE ? storageApi : storageLocal;

const wrap = (fn) => (...args) => {
    try {
        const result = fn(...args);
        return result instanceof Promise ? result : Promise.resolve(result);
    } catch (error) {
        return Promise.reject(error);
    }
};

export const initStore = wrap(provider.init || (() => {}));
export const getSession = wrap(provider.getSession || (() => ''));
export const setSession = wrap(provider.setSession || (() => ''));
export const getStats = wrap(provider.getStats || (() => ({ catalog: 0, students: 0 })));
export const getStudentByICAndName = wrap(provider.getStudentByICAndName || (() => null));
export const getStudentTranscript = wrap(provider.getStudentTranscript || (() => null));
export const listStudents = wrap(provider.listStudents || (() => ({ items: [], total: 0, page: 1, pageCount: 1, size: 0 })));
export const listStudentProfiles = wrap(provider.listStudentProfiles || (() => []));
export const listCourseCatalog = wrap(provider.listCourseCatalog || (() => []));
export const importHistory = wrap(provider.importHistory || (() => ({})));
export const appendResults = wrap(provider.appendResults || (() => ({})));
export const listReportRows = wrap(provider.listReportRows || (() => []));
export const importStudentProfiles = wrap(provider.importStudentProfiles || (() => ({})));
export const updateCourseCatalogEntry = wrap(provider.updateCourseCatalogEntry || (() => ({})));
