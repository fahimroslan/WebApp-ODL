/*
  # Create enrollments and grades table

  1. New Tables
    - `enrollments` - Student course enrollment with grades
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key to students)
      - `course_id` (uuid, foreign key to courses)
      - `mark` (numeric, raw score out of 100)
      - `grade_letter` (text, letter grade A-F)
      - `grade_points` (numeric, grade point value)
      - `credits_attempted` (numeric)
      - `credits_earned` (numeric)
      - `semester` (integer, semester number)
      - `session` (text, academic session label)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `enrollments` table
    - Students can view their own enrollments
    - Admins can view and modify all enrollments
*/

CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  mark numeric(5, 2),
  grade_letter text,
  grade_points numeric(3, 2),
  credits_attempted numeric(4, 2) DEFAULT 0,
  credits_earned numeric(4, 2) DEFAULT 0,
  semester integer,
  session text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id, semester, session)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own enrollments"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all enrollments"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update enrollments"
  ON enrollments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert enrollments"
  ON enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_session ON enrollments(session);
