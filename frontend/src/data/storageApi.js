const NOT_IMPLEMENTED = 'Remote API storage is not configured.';

const reject = () => Promise.reject(new Error(NOT_IMPLEMENTED));

export const init = () => Promise.resolve();
export const getSession = () => Promise.resolve('');
export const setSession = () => reject();
export const getStats = () => Promise.resolve({ catalog: 0, students: 0 });
export const getStudentByICAndName = () => reject();
export const getStudentTranscript = () => reject();
export const listStudents = () => reject();
export const listStudentProfiles = () => reject();
export const listCourseCatalog = () => reject();
export const importHistory = () => reject();
export const appendResults = () => reject();
