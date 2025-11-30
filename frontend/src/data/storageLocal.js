import { STORAGE_KEY, FIELD_MAP } from '../config.js';
import { createDefaultStore, createStudentRecord, createSemesterRecord } from '../domain/models.js';
import { calculateGrade, recalculateStudent, deriveCreditsEarned, deriveGradePoints, pointFromLetter } from '../services/transcriptService.js';
import { normalizeIC, isNonEmpty } from '../utils/validators.js';

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

export function appendResults(rows = []) {
    if (!store.session) {
        throw new Error('Set the active session before appending.');
    }
    if (!rows.length) {
        throw new Error('Append file is empty.');
    }
    const updates = {};
    rows.forEach(row => {
        const id = pickField(row, FIELD_MAP.id);
        const code = pickField(row, FIELD_MAP.courseCode);
        if (!id || !code) return;
        const normalizedId = String(id).trim();
        const name = pickField(row, FIELD_MAP.name);
        const ic = pickField(row, FIELD_MAP.ic);
        const intake = pickField(row, FIELD_MAP.intake);
        if (!updates[normalizedId]) {
            updates[normalizedId] = {
                meta: { name, ic, intake },
                courses: []
            };
        } else {
            const meta = updates[normalizedId].meta;
            if (!meta.name && name) meta.name = name;
            if (!meta.ic && ic) meta.ic = ic;
            if (!meta.intake && intake) meta.intake = intake;
        }
        updates[normalizedId].courses.push({
            code,
            mark: pickField(row, FIELD_MAP.mark),
            letter: pickField(row, FIELD_MAP.gradeLetter),
            title: pickField(row, FIELD_MAP.courseTitle),
            credits: parseFloat(pickField(row, FIELD_MAP.credits)),
            sessionLabel: pickField(row, FIELD_MAP.session)
        });
    });
    let updated = 0;
    let created = 0;
    let skipped = 0;
    Object.entries(updates).forEach(([id, payload]) => {
        let student = store.students[id];
        if (!student) {
            const hasMeta = isNonEmpty(payload.meta.name) && isNonEmpty(payload.meta.ic) && isNonEmpty(payload.meta.intake);
            if (!hasMeta) {
                skipped += payload.courses.length;
                return;
            }
            student = createStudentRecord({
                id,
                name: payload.meta.name,
                ic: payload.meta.ic,
                intake: payload.meta.intake
            });
            store.students[id] = student;
            if (!store.recent) store.recent = {};
            store.recent[id] = true;
            created += 1;
        }
        payload.courses.forEach(course => {
            const targetSession = course.sessionLabel || store.session;
            if (!targetSession) {
                skipped += 1;
                return;
            }
            let semester = student.SemesterData.find(item => item.SessionLabel === targetSession);
            if (!semester) {
                const nextSem = student.SemesterData.length ? Math.max(...student.SemesterData.map(s => s.Semester || 0)) + 1 : 1;
                semester = createSemesterRecord(nextSem, targetSession);
                student.SemesterData.push(semester);
            }
            if (!Array.isArray(semester.Courses)) semester.Courses = [];
            const catalogEntry = store.catalog[course.code];
            const credits = Number.isFinite(course.credits) ? course.credits : (catalogEntry?.Credits ?? 3);
            const title = course.title || catalogEntry?.Title || course.code;
            const grade = course.mark !== null && course.mark !== undefined && course.mark !== '' ? calculateGrade(course.mark) : {
                Letter: course.letter || '',
                Point: pointFromLetter(course.letter)
            };
            const payloadCourse = {
                Code: course.code,
                Title: title,
                Credits: credits,
                Mark: course.mark ?? '',
                Letter: grade.Letter,
                GradePoints: deriveGradePoints(grade.Point, credits),
                CreditsAttempted: credits,
                CreditsEarned: deriveCreditsEarned(grade.Point, credits)
            };
            const existingIndex = semester.Courses.findIndex(item => item.Code === course.code);
            if (existingIndex >= 0) {
                semester.Courses[existingIndex] = payloadCourse;
            } else {
                semester.Courses.push(payloadCourse);
            }
            if (!store.catalog[course.code]) {
                store.catalog[course.code] = { Title: title, Credits: credits };
            }
        });
        recalculateStudent(student);
        updated += 1;
    });
    persist();
    return { updated, created, skipped };
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
