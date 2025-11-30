import { GRADE_BANDS, FAIL_GRADE } from '../domain/gradeRules.js';

const LETTER_POINT_MAP = GRADE_BANDS.reduce((acc, band) => {
    acc[band.letter.toUpperCase()] = band.point;
    return acc;
}, { [FAIL_GRADE.letter.toUpperCase()]: FAIL_GRADE.point });

export function calculateGrade(mark) {
    const value = typeof mark === 'number' ? mark : parseFloat(mark);
    if (Number.isNaN(value)) {
        return { Letter: 'N/A', Point: 0 };
    }
    const band = GRADE_BANDS.find(item => value >= item.min);
    if (band) {
        return { Letter: band.letter, Point: band.point };
    }
    return { Letter: FAIL_GRADE.letter, Point: FAIL_GRADE.point };
}

export function recalculateStudent(student) {
    if (!student || !Array.isArray(student.SemesterData)) return student;
    student.SemesterData.sort((a, b) => a.Semester - b.Semester);
    let cumulativePoints = 0;
    let cumulativeAttempted = 0;
    let cumulativeEarned = 0;
    student.SemesterData.forEach(semester => {
        let semPoints = 0;
        let semAttempted = 0;
        let semEarned = 0;
        (semester.Courses || []).forEach(course => {
            const points = Number(course.GradePoints) || 0;
            const attempted = Number(course.CreditsAttempted) || 0;
            const earned = Number(course.CreditsEarned) || 0;
            semPoints += points;
            semAttempted += attempted;
            semEarned += earned;
        });
        semester.TotalPoints = semPoints;
        semester.TotalCreditsAttempted = semAttempted;
        semester.TotalCreditsEarned = semEarned;
        semester.GPA = semAttempted > 0 ? (semPoints / semAttempted).toFixed(2) : '0.00';
        cumulativePoints += semPoints;
        cumulativeAttempted += semAttempted;
        cumulativeEarned += semEarned;
    });
    student.CGPA = cumulativeAttempted > 0 ? (cumulativePoints / cumulativeAttempted).toFixed(2) : '0.00';
    student.TotalCreditsEarned = cumulativeEarned;
    return student;
}

export function deriveCreditsEarned(gradePoint, credits) {
    return gradePoint > 0 ? credits : 0;
}

export function deriveGradePoints(gradePoint, credits, override) {
    if (Number.isFinite(override)) return override;
    return Number.isFinite(gradePoint) ? gradePoint * credits : 0;
}

export function pointFromLetter(letter) {
    if (!letter) return 0;
    return LETTER_POINT_MAP[letter.toUpperCase()] ?? 0;
}
