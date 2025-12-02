import { supabase } from '../services/supabaseClient.js';
import { GRADE_BANDS, FAIL_GRADE } from '../domain/gradeRules.js';

function calculateGradeInfo(mark) {
  if (mark === null || mark === undefined) return null;

  const numMark = Number(mark);
  if (numMark < 40) {
    return { letter: FAIL_GRADE.letter, point: FAIL_GRADE.point };
  }

  for (const band of GRADE_BANDS) {
    if (numMark >= band.min) {
      return { letter: band.letter, point: band.point };
    }
  }

  return { letter: FAIL_GRADE.letter, point: FAIL_GRADE.point };
}

export async function init() {
  // Initialization if needed
}

export async function getStudentByICAndName(ic, name) {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, ic, name, intake_code')
      .eq('ic', ic)
      .ilike('name', `%${name}%`)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching student:', error);
    return null;
  }
}

export async function getStudentTranscript(studentId) {
  try {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, ic, intake_code')
      .eq('id', studentId)
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student) return null;

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        mark,
        grade_letter,
        grade_points,
        credits_attempted,
        credits_earned,
        semester,
        session,
        courses (code, title, credits)
      `)
      .eq('student_id', studentId)
      .order('semester', { ascending: true })
      .order('session', { ascending: true });

    if (enrollmentsError) throw enrollmentsError;

    // Group by semester
    const semesterMap = {};
    enrollments.forEach(enrollment => {
      const key = `${enrollment.semester}-${enrollment.session}`;
      if (!semesterMap[key]) {
        semesterMap[key] = {
          semester: enrollment.semester,
          session: enrollment.session,
          courses: [],
          totalCreditsAttempted: 0,
          totalCreditsEarned: 0,
          totalPoints: 0,
        };
      }

      const course = {
        courseCode: enrollment.courses.code,
        courseTitle: enrollment.courses.title,
        credits: enrollment.courses.credits,
        mark: enrollment.mark,
        gradeLetter: enrollment.grade_letter,
        gradePoints: enrollment.grade_points,
        creditsAttempted: enrollment.credits_attempted,
        creditsEarned: enrollment.credits_earned,
      };

      semesterMap[key].courses.push(course);
      semesterMap[key].totalCreditsAttempted += enrollment.credits_attempted || 0;
      semesterMap[key].totalCreditsEarned += enrollment.credits_earned || 0;
      semesterMap[key].totalPoints += (enrollment.grade_points || 0) * (enrollment.credits_attempted || 0);
    });

    const semesters = Object.values(semesterMap);

    // Calculate GPA for each semester and CGPA
    let totalCreditsEarned = 0;
    let totalPoints = 0;

    semesters.forEach(sem => {
      if (sem.totalCreditsAttempted > 0) {
        sem.gpa = (sem.totalPoints / sem.totalCreditsAttempted).toFixed(2);
      } else {
        sem.gpa = '0.00';
      }
      totalCreditsEarned += sem.totalCreditsEarned;
      totalPoints += sem.totalPoints;
    });

    let cgpa = '0.00';
    let totalAttempted = 0;
    semesters.forEach(sem => {
      totalAttempted += sem.totalCreditsAttempted;
    });
    if (totalAttempted > 0) {
      cgpa = (totalPoints / totalAttempted).toFixed(2);
    }

    return {
      studentId,
      id: student.id,
      name: student.name,
      ic: student.ic,
      intake: student.intake_code,
      semesters,
      cgpa,
      totalCreditsEarned,
    };
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
}

export async function listStudents(page = 1, pageSize = 30, search = '') {
  try {
    let query = supabase
      .from('students')
      .select('id, name, ic, intake_code', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,ic.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .range(from, to)
      .order('name', { ascending: true });

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      pageCount: Math.ceil((count || 0) / pageSize),
      size: pageSize,
    };
  } catch (error) {
    console.error('Error listing students:', error);
    return { items: [], total: 0, page, pageCount: 1, size: pageSize };
  }
}

export async function listStudentProfiles() {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, ic, intake_code')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error listing student profiles:', error);
    return [];
  }
}

export async function listCourseCatalog() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('id, code, title, credits, description')
      .order('code', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error listing course catalog:', error);
    return [];
  }
}

export async function getStats() {
  try {
    const { count: catalogCount, error: catalogError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    const { count: studentsCount, error: studentsError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (catalogError) throw catalogError;
    if (studentsError) throw studentsError;

    return {
      catalog: catalogCount || 0,
      students: studentsCount || 0,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { catalog: 0, students: 0 };
  }
}

export async function updateCourseCatalogEntry(courseId, credits) {
  try {
    const { error } = await supabase
      .from('courses')
      .update({ credits })
      .eq('id', courseId);

    if (error) throw error;

    await logAudit('update', 'courses', courseId, { credits });
    return { success: true };
  } catch (error) {
    console.error('Error updating course:', error);
    return { success: false, error: error.message };
  }
}

export async function importStudentProfiles(students) {
  try {
    const newStudents = [];

    for (const student of students) {
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('ic', student.ic)
        .maybeSingle();

      if (!existing) {
        newStudents.push({
          ic: student.ic,
          name: student.name,
          intake_code: student.intake,
        });
      }
    }

    if (newStudents.length === 0) {
      return { imported: 0, skipped: students.length };
    }

    const { data, error } = await supabase
      .from('students')
      .insert(newStudents)
      .select();

    if (error) throw error;

    await logAudit('import', 'students', null, {
      count: newStudents.length,
      skipped: students.length - newStudents.length,
    });

    return {
      imported: newStudents.length,
      skipped: students.length - newStudents.length,
    };
  } catch (error) {
    console.error('Error importing student profiles:', error);
    return { imported: 0, skipped: students.length, error: error.message };
  }
}

export async function importHistory(enrollmentData) {
  try {
    const { coursesToAdd, enrollmentsToAdd } = await prepareEnrollmentData(enrollmentData);

    // Insert new courses
    if (coursesToAdd.length > 0) {
      const { error: courseError } = await supabase
        .from('courses')
        .insert(coursesToAdd)
        .select();

      if (courseError) throw courseError;
    }

    // Insert enrollments
    if (enrollmentsToAdd.length > 0) {
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert(enrollmentsToAdd, { onConflict: 'ignore' });

      if (enrollError) throw enrollError;
    }

    await logAudit('import', 'enrollments', null, {
      courses: coursesToAdd.length,
      enrollments: enrollmentsToAdd.length,
    });

    return {
      success: true,
      coursesAdded: coursesToAdd.length,
      enrollmentsAdded: enrollmentsToAdd.length,
    };
  } catch (error) {
    console.error('Error importing history:', error);
    return { success: false, error: error.message };
  }
}

async function prepareEnrollmentData(enrollmentData) {
  const coursesToAdd = [];
  const enrollmentsToAdd = [];
  const courseMap = {};
  const studentMap = {};

  // Get existing courses
  const { data: existingCourses } = await supabase
    .from('courses')
    .select('id, code');

  existingCourses?.forEach(c => {
    courseMap[c.code] = c.id;
  });

  // Get existing students
  const { data: existingStudents } = await supabase
    .from('students')
    .select('id, ic');

  existingStudents?.forEach(s => {
    studentMap[s.ic] = s.id;
  });

  for (const record of enrollmentData) {
    // Add course if not exists
    if (!courseMap[record.courseCode]) {
      coursesToAdd.push({
        code: record.courseCode,
        title: record.courseTitle || record.courseCode,
        credits: record.credits || 0,
      });
      courseMap[record.courseCode] = true;
    }

    // Add enrollment
    const studentId = studentMap[record.ic];
    if (studentId && courseMap[record.courseCode]) {
      const gradeInfo = calculateGradeInfo(record.mark);

      enrollmentsToAdd.push({
        student_id: studentId,
        course_id: courseMap[record.courseCode],
        mark: record.mark,
        grade_letter: gradeInfo?.letter,
        grade_points: gradeInfo?.point,
        credits_attempted: record.creditsAttempted || record.credits,
        credits_earned: record.creditsEarned || (gradeInfo?.point > 0 ? record.credits : 0),
        semester: record.semester,
        session: record.session,
      });
    }
  }

  return { coursesToAdd, enrollmentsToAdd };
}

export async function appendResults(enrollmentData) {
  try {
    const enrollmentsToUpdate = [];

    for (const record of enrollmentData) {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('ic', record.ic)
        .maybeSingle();

      if (!student) continue;

      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('code', record.courseCode)
        .maybeSingle();

      if (!course) continue;

      const gradeInfo = calculateGradeInfo(record.mark);

      enrollmentsToUpdate.push({
        student_id: student.id,
        course_id: course.id,
        mark: record.mark,
        grade_letter: gradeInfo?.letter,
        grade_points: gradeInfo?.point,
        credits_attempted: record.creditsAttempted || record.credits,
        credits_earned: gradeInfo?.point > 0 ? record.creditsEarned || record.credits : 0,
        semester: record.semester,
        session: record.session,
      });
    }

    if (enrollmentsToUpdate.length === 0) {
      return { success: false, error: 'No matching records found' };
    }

    const { error } = await supabase
      .from('enrollments')
      .upsert(enrollmentsToUpdate, {
        onConflict: 'student_id,course_id,semester,session',
      });

    if (error) throw error;

    await logAudit('append', 'enrollments', null, {
      count: enrollmentsToUpdate.length,
    });

    return { success: true, updated: enrollmentsToUpdate.length };
  } catch (error) {
    console.error('Error appending results:', error);
    return { success: false, error: error.message };
  }
}

export async function listReportRows() {
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        mark,
        grade_letter,
        semester,
        session,
        students (name, ic),
        courses (code, title)
      `)
      .order('session', { ascending: false })
      .order('semester', { ascending: false })
      .limit(1000);

    if (error) throw error;

    return (data || []).map(row => ({
      studentName: row.students?.name,
      studentIC: row.students?.ic,
      courseCode: row.courses?.code,
      courseTitle: row.courses?.title,
      mark: row.mark,
      grade: row.grade_letter,
      semester: row.semester,
      session: row.session,
    }));
  } catch (error) {
    console.error('Error listing report rows:', error);
    return [];
  }
}

async function logAudit(action, tableName, recordId, changes) {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from('audit_logs')
      .insert({
        user_id: session.user.id,
        action,
        table_name: tableName,
        record_id: recordId,
        changes,
      });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}
