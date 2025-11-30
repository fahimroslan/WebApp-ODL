import { STORAGE_KEY, FIELD_MAP } from '../config.js';
import { createDefaultStore, createStudentRecord, createSemesterRecord } from '../domain/models.js';
import { calculateGrade, recalculateStudent, deriveCreditsEarned, deriveGradePoints, pointFromLetter } from '../services/transcriptService.js';
import { normalizeIC, isNonEmpty, normalizeName } from '../utils/validators.js';

let store = hydrate();

export function init() {
    store = hydrate();
}

export function getSession() {
    return store.session || '';
}

export function setSession(value) {
    store.session = value;
persist();
    return store.session;
}

export function getStats() {
    return {
        catalog: Object.keys(store.catalog || {}).length,
        students: Object.keys(store.students || {}).length
    };
}

export function getStudentByICAndName(ic, nameFragment) {
    const normalizedIC = normalizeIC(ic);
    const keyword = (nameFragment || '').trim().toLowerCase();
    const entries = Object.values(store.students || {});
    return entries.find(student => {
        const storedIC = normalizeIC(student.IC);
        const storedName = (student.Name || '').toLowerCase();
        return storedIC === normalizedIC && storedName.includes(keyword);
    }) || null;
}

export function getStudentTranscript(id) {
    const record = store.students?.[id];
    if (!record) return null;
    return JSON.parse(JSON.stringify(record));
}

export function listStudents({ page = 1, size = 30, filter = '', intake = '' } = {}) {
    const all = Object.values(store.students || {}).sort((a, b) => {
        const nameA = (a.Name || '').toLowerCase();
        const nameB = (b.Name || '').toLowerCase();
        if (nameA === nameB) return a.ID.localeCompare(b.ID);
        return nameA.localeCompare(nameB);
    });
    const keyword = (filter || '').trim().toLowerCase();
    const intakeFilter = (intake || '').trim().toLowerCase();
    const filtered = all.filter(student => {
        const matchesKeyword = keyword ? (
            student.ID.toLowerCase().includes(keyword) ||
            (student.Name || '').toLowerCase().includes(keyword)
        ) : true;
        const matchesIntake = intakeFilter ? (student.Intake || '').toLowerCase() === intakeFilter : true;
        return matchesKeyword && matchesIntake;
    });
    const total = filtered.length;
    const pageCount = total ? Math.ceil(total / size) : 1;
    const safePage = Math.min(Math.max(page, 1), pageCount);
    const startIndex = total ? (safePage - 1) * size : 0;
    const items = total ? filtered.slice(startIndex, startIndex + size) : [];
    return {
        items: items.map(student => ({
            ID: student.ID,
            Name: student.Name,
            Intake: student.Intake || '',
            CGPA: student.CGPA || '0.00',
            IsNew: Boolean(store.recent?.[student.ID])
        })),
        total,
        page: safePage,
        pageCount,
        size
    };
}

export function listStudentProfiles() {
    return Object.values(store.students || {}).map(student => ({
        ID: student.ID,
        Name: student.Name || '',
        IC: student.IC || '',
        Intake: student.Intake || ''
    }));
}

export function listCourseCatalog() {
    const courseCounts = {};
    const mergedCatalog = { ...(store.catalog || {}) };
    Object.values(store.students || {}).forEach(student => {
        (student.SemesterData || []).forEach(semester => {
            (semester.Courses || []).forEach(course => {
                if (!course || !course.Code) return;
                if (!courseCounts[course.Code]) courseCounts[course.Code] = new Set();
                courseCounts[course.Code].add(student.ID);
                if (!mergedCatalog[course.Code]) {
                    mergedCatalog[course.Code] = {
                        Title: course.Title || course.Code,
                        Credits: Number(course.Credits) || 0
                    };
                }
            });
        });
    });
    Object.entries(store.catalog || {}).forEach(([code, entry]) => {
        if (!mergedCatalog[code]) mergedCatalog[code] = entry;
    });
    return Object.entries(mergedCatalog).map(([code, entry]) => ({
        Code: code,
        Title: entry?.Title || code,
        Credits: entry?.Credits ?? 0,
        Enrolled: courseCounts[code]?.size || 0
    })).sort((a, b) => a.Code.localeCompare(b.Code));
}

export function importHistory(rows = []) {
    if (!rows.length) {
        throw new Error('Worksheet is empty.');
    }
    const grouped = {};
    const newCatalog = {};
    let skipped = 0;
    let processedRows = 0;
    rows.forEach(row => {
        processedRows += 1;
        const id = pickField(row, FIELD_MAP.id);
        if (!id) {
            skipped += 1;
            return;
        }
        const normalizedId = String(id).trim();
        if (!grouped[normalizedId]) {
            grouped[normalizedId] = createStudentRecord({
                id: normalizedId,
                name: pickField(row, FIELD_MAP.name),
                ic: pickField(row, FIELD_MAP.ic),
                intake: pickField(row, FIELD_MAP.intake)
            });
        }
        const student = grouped[normalizedId];
        const semRaw = parseInt(pickField(row, FIELD_MAP.semester), 10);
        const semesterNumber = Number.isFinite(semRaw) ? semRaw : 1;
        let semester = student.SemesterData.find(item => item.Semester === semesterNumber);
        if (!semester) {
            semester = createSemesterRecord(semesterNumber, pickField(row, FIELD_MAP.session) || '');
            student.SemesterData.push(semester);
        }
        const code = pickField(row, FIELD_MAP.courseCode) || `CRS-${semester.Courses.length + 1}`;
        const creditValue = parseFloat(pickField(row, FIELD_MAP.credits));
        const credits = Number.isFinite(creditValue) ? creditValue : 0;
        const title = pickField(row, FIELD_MAP.courseTitle) || code;
        const mark = pickField(row, FIELD_MAP.mark);
        const manualLetter = pickField(row, FIELD_MAP.gradeLetter) || '';
        const grade = mark !== null && mark !== '' ? calculateGrade(mark) : {
            Letter: manualLetter || 'N/A',
            Point: manualLetter ? pointFromLetter(manualLetter) : 0
        };
        const gradePointsOverride = parseFloat(pickField(row, FIELD_MAP.gradePoints));
        const creditsAttemptedOverride = parseFloat(pickField(row, FIELD_MAP.creditsAttempted));
        const creditsEarnedOverride = parseFloat(pickField(row, FIELD_MAP.creditsEarned));
        const payload = {
            Code: code,
            Title: title,
            Credits: credits,
            Mark: mark ?? '',
            Letter: grade.Letter,
            GradePoints: deriveGradePoints(grade.Point, credits, gradePointsOverride),
            CreditsAttempted: Number.isFinite(creditsAttemptedOverride) ? creditsAttemptedOverride : credits,
            CreditsEarned: Number.isFinite(creditsEarnedOverride) ? creditsEarnedOverride : deriveCreditsEarned(grade.Point, credits)
        };
        semester.Courses.push(payload);
        if (code && !newCatalog[code]) {
            newCatalog[code] = { Title: title, Credits: credits };
        }
    });
    Object.values(grouped).forEach(student => recalculateStudent(student));
    store.students = grouped;
    store.catalog = newCatalog;
    store.recent = {};
    persist();
    return {
        imported: Object.keys(grouped).length,
        processedRows,
        skipped
    };
}

export function appendResults(rows = [], options = {}) {
    if (!store.session) {
        throw new Error('Set the active session before appending.');
    }
    if (!rows.length) {
        throw new Error('Append file is empty.');
    }
    const courseCode = (options.courseCode || '').trim().toUpperCase();
    const courseTitle = (options.courseTitle || '').trim().toUpperCase();
    const providedCreditsRaw = parseFloat(options.credits);
    const creditsOverride = Number.isFinite(providedCreditsRaw) && providedCreditsRaw > 0 ? providedCreditsRaw : null;
    if (!courseCode || !courseTitle) {
        throw new Error('Set course code and title before uploading marks.');
    }
    const nameIndex = buildNameIndex();
    const resolvedCredits = creditsOverride ?? determineCatalogCredits(courseCode);
    if (!store.catalog[courseCode]) {
        store.catalog[courseCode] = { Title: courseTitle, Credits: resolvedCredits };
    } else {
        store.catalog[courseCode].Title = courseTitle;
        if (Number.isFinite(resolvedCredits)) {
            store.catalog[courseCode].Credits = resolvedCredits;
        }
    }
    let updated = 0;
    let skipped = 0;
    rows.forEach(row => {
        const mark = pickField(row, FIELD_MAP.mark);
        if (mark === null || mark === undefined || mark === '') {
            skipped += 1;
            return;
        }
        const idValue = pickField(row, FIELD_MAP.id);
        let student = null;
        if (idValue) {
            const normalizedId = String(idValue).trim();
            student = store.students[normalizedId] || null;
        }
        if (!student) {
            const nameRaw = pickField(row, FIELD_MAP.name);
            const normalizedName = normalizeName(nameRaw);
            if (!normalizedName) {
                skipped += 1;
                return;
            }
            let matches = nameIndex[normalizedName] || [];
            if (matches.length > 1) {
                const icRaw = pickField(row, FIELD_MAP.ic);
                const normalizedIC = normalizeIC(icRaw);
                if (normalizedIC) {
                    matches = matches.filter(item => normalizeIC(item.IC) === normalizedIC);
                }
            }
            if (matches.length !== 1) {
                skipped += 1;
                return;
            }
            student = matches[0];
        }
        const semester = resolveSemester(student, store.session);
        const grade = calculateGrade(mark);
        const credits = Number.isFinite(resolvedCredits) ? resolvedCredits : 0;
        const payloadCourse = {
            Code: courseCode,
            Title: courseTitle,
            Credits: credits,
            Mark: mark,
            Letter: grade.Letter,
            GradePoints: deriveGradePoints(grade.Point, credits),
            CreditsAttempted: credits,
            CreditsEarned: deriveCreditsEarned(grade.Point, credits)
        };
        const existingIndex = semester.Courses.findIndex(item => item.Code === courseCode);
        if (existingIndex >= 0) {
            semester.Courses[existingIndex] = payloadCourse;
        } else {
            semester.Courses.push(payloadCourse);
        }
        recalculateStudent(student);
        updated += 1;
    });
    persist();
    return { updated, skipped };
}

function hydrate() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                ...createDefaultStore(),
                ...parsed,
                catalog: parsed.catalog || {},
                students: parsed.students || {},
                recent: parsed.recent || {},
                catalogIndex: parsed.catalogIndex || []
            };
        }
    } catch (error) {
        console.warn('Unable to read stored records', error);
    }
    return createDefaultStore();
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
        console.warn('Unable to persist dataset', error);
    }
}

function pickField(row, candidates) {
    if (!row || !candidates) return null;
    for (const key of candidates) {
        if (row[key] !== undefined && row[key] !== null) {
            const value = row[key];
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed !== '') return trimmed;
            } else if (value !== '') {
                return value;
            }
        }
    }
    return null;
}

function rebuildCatalogIndex() {
    const courseCounts = {};
    const mergedCatalog = { ...(store.catalog || {}) };
    Object.values(store.students || {}).forEach(student => {
        (student.SemesterData || []).forEach(semester => {
            (semester.Courses || []).forEach(course => {
                if (!course || !course.Code) return;
                if (!courseCounts[course.Code]) courseCounts[course.Code] = new Set();
                courseCounts[course.Code].add(student.ID);
                if (!mergedCatalog[course.Code]) {
                    mergedCatalog[course.Code] = {
                        Title: course.Title || course.Code,
                        Credits: Number(course.Credits) || 0
                    };
                }
            });
        });
    });
    Object.entries(store.catalog || {}).forEach(([code, entry]) => {
        if (!mergedCatalog[code]) mergedCatalog[code] = entry;
    });
    store.catalogIndex = Object.entries(mergedCatalog).map(([code, entry]) => ({
        Code: code,
        Title: entry?.Title || code,
        Credits: entry?.Credits ?? 0,
        Enrolled: courseCounts[code]?.size || 0
    })).sort((a, b) => a.Code.localeCompare(b.Code));
    return store.catalogIndex;
}

export function updateCourseCatalogEntry(code, { title, credits } = {}) {
    const normalizedCode = (code || '').toString().trim().toUpperCase();
    if (!normalizedCode) {
        throw new Error('Select a course code before saving.');
    }
    const normalizedTitle = (title || '').toString().trim();
    const creditValue = parseFloat(credits);
    if (!Number.isFinite(creditValue) || creditValue <= 0) {
        throw new Error('Enter a valid credit hour greater than zero.');
    }
    if (!store.catalog[normalizedCode]) {
        store.catalog[normalizedCode] = { Title: normalizedTitle || normalizedCode, Credits: creditValue };
    } else {
        if (normalizedTitle) {
            store.catalog[normalizedCode].Title = normalizedTitle;
        }
        store.catalog[normalizedCode].Credits = creditValue;
    }
    const updatedStudents = new Set();
    Object.values(store.students || {}).forEach(student => {
        let changed = false;
        (student.SemesterData || []).forEach(semester => {
            (semester.Courses || []).forEach(course => {
                if (!course || (course.Code || '').toUpperCase() !== normalizedCode) return;
                if (normalizedTitle) {
                    course.Title = normalizedTitle;
                }
                course.Credits = creditValue;
                course.CreditsAttempted = creditValue;
                const grade = deriveCourseGrade(course);
                course.GradePoints = deriveGradePoints(grade.Point, creditValue);
                course.CreditsEarned = deriveCreditsEarned(grade.Point, creditValue);
                changed = true;
            });
        });
        if (changed) {
            recalculateStudent(student);
            updatedStudents.add(student.ID);
        }
    });
    persist();
    return { updated: updatedStudents.size };
}

function deriveCourseGrade(course) {
    if (course && course.Mark !== null && course.Mark !== undefined && course.Mark !== '') {
        return calculateGrade(course.Mark);
    }
    const letter = (course?.Letter || '').toString().trim();
    return {
        Letter: letter || 'N/A',
        Point: pointFromLetter(letter)
    };
}

function buildNameIndex() {
    const index = {};
    Object.values(store.students || {}).forEach(student => {
        const key = normalizeName(student.Name);
        if (!key) return;
        if (!index[key]) index[key] = [];
        index[key].push(student);
    });
    return index;
}

function resolveSemester(student, sessionLabel) {
    let semester = student.SemesterData.find(item => item.SessionLabel === sessionLabel);
    if (!semester) {
        const nextSem = student.SemesterData.length ? Math.max(...student.SemesterData.map(s => s.Semester || 0)) + 1 : 1;
        semester = createSemesterRecord(nextSem, sessionLabel);
        student.SemesterData.push(semester);
    }
    if (!Array.isArray(semester.Courses)) semester.Courses = [];
    return semester;
}

function determineCatalogCredits(code) {
    const catalogEntry = store.catalog[code];
    if (catalogEntry) {
        const storedCredits = parseFloat(catalogEntry.Credits);
        if (Number.isFinite(storedCredits)) {
            return storedCredits;
        }
    }
    for (const student of Object.values(store.students || {})) {
        for (const semester of student.SemesterData || []) {
            for (const course of semester.Courses || []) {
                if ((course?.Code || '').toUpperCase() === code) {
                    const credits = parseFloat(course.Credits);
                    if (Number.isFinite(credits)) {
                        return credits;
                    }
                }
            }
        }
    }
    return 0;
}

export function importStudentProfiles(rows = [], intakeLabel = '') {
    if (!intakeLabel) {
        throw new Error('Provide an intake label before uploading.');
    }
    if (!rows.length) {
        throw new Error('Upload file is empty.');
    }
    let created = 0;
    let updated = 0;
    let skipped = 0;
    rows.forEach(row => {
        const id = pickField(row, FIELD_MAP.id);
        const name = pickField(row, FIELD_MAP.name);
        const ic = pickField(row, FIELD_MAP.ic);
        if (!id || !name || !ic) {
            skipped += 1;
            return;
        }
        const normalizedId = String(id).trim();
        let student = store.students[normalizedId];
        if (student) {
            const before = JSON.stringify({ Name: student.Name, IC: student.IC, Intake: student.Intake });
            if (!student.Name && name) {
                student.Name = name;
            }
            if (!student.IC && ic) {
                student.IC = ic;
            }
            if (!student.Intake && intakeLabel) {
                student.Intake = intakeLabel;
            }
            const after = JSON.stringify({ Name: student.Name, IC: student.IC, Intake: student.Intake });
            if (before !== after) {
                updated += 1;
            }
        } else {
            student = createStudentRecord({
                id: normalizedId,
                name,
                ic,
                intake: intakeLabel
            });
            store.students[normalizedId] = student;
            if (!store.recent) store.recent = {};
            store.recent[normalizedId] = true;
            created += 1;
        }
    });
    persist();
    return { created, updated, skipped };
}

export function listReportRows() {
    const rows = [];
    Object.values(store.students || {}).forEach(student => {
        (student.SemesterData || []).forEach(semester => {
            (semester.Courses || []).forEach(course => {
                rows.push({
                    ID: student.ID,
                    Name: student.Name || '',
                    IC: student.IC || '',
                    CourseCode: course?.Code || '',
                    CourseTitle: course?.Title || '',
                    Mark: course?.Mark ?? course?.Letter ?? '',
                    SemesterTaken: buildSemesterLabel(semester)
                });
            });
        });
    });
    return rows;
}

function buildSemesterLabel(semester) {
    if (!semester) return '';
    const base = Number.isFinite(semester.Semester) ? `Semester ${semester.Semester}` : '';
    if (base && semester.SessionLabel) {
        return `${base} / ${semester.SessionLabel}`;
    }
    return semester.SessionLabel || base || '';
}
