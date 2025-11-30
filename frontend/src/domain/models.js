export function createDefaultStore() {
    return {
        session: '',
        catalog: {},
        students: {},
        recent: {}
    };
}

export function createStudentRecord({ id, name, ic, intake }) {
    return {
        ID: id,
        Name: name || 'Unnamed Student',
        IC: ic || '',
        Intake: intake || '',
        SemesterData: [],
        CGPA: '0.00',
        TotalCreditsEarned: 0
    };
}

export function createSemesterRecord(semesterNumber, sessionLabel = '') {
    return {
        Semester: semesterNumber,
        SessionLabel: sessionLabel,
        Courses: [],
        GPA: '0.00',
        TotalCreditsAttempted: 0,
        TotalCreditsEarned: 0,
        TotalPoints: 0
    };
}

export function cloneStudent(student) {
    return JSON.parse(JSON.stringify(student));
}
