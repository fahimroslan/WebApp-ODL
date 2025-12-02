# ODL Transcript Workspace - Production Setup Guide

## Overview

This application has been migrated to use Supabase for secure, scalable data management. All authentication, student records, and grades are now stored in PostgreSQL with Row-Level Security (RLS) policies.

## Prerequisites

- Supabase account (free tier available at supabase.com)
- Node.js 18+ and npm

## Phase 1: Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Wait for the database to be provisioned (2-3 minutes)

### 2. Configure Environment Variables

The `.env` file already contains your Supabase URL and Anon Key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=your-anon-key
```

These are pre-configured automatically. Keep these safe but note that the Anon Key is intended to be public.

### 3. Run Database Migrations

The database schema has been set up with migrations that create:
- `user_roles` - Track admin and student roles
- `students` - Student profiles (IC, name, intake)
- `courses` - Course catalog
- `enrollments` - Student course records with grades
- `audit_logs` - Track all administrative changes

All tables have Row-Level Security (RLS) enabled to ensure data isolation.

## Phase 2: Admin Account Setup

### Create Your First Admin Account

1. In the Supabase dashboard, go to **Authentication → Users**
2. Click **Add user** and create an admin account:
   - Email: `admin@university.edu` (use your email)
   - Password: Create a strong password (14+ characters with mix of types)

### Assign Admin Role

After creating the user, you need to assign the admin role:

1. Go to the **SQL Editor** in Supabase
2. Run this query (replace `USER_ID` with the ID of the user you just created):

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID', 'admin');
```

To find the user ID, query:
```sql
SELECT id, email FROM auth.users WHERE email = 'admin@university.edu';
```

## Phase 3: Student Account Setup (Optional)

Students can self-register or you can create accounts for them. To create student accounts:

1. In Supabase **Authentication → Users**, click **Add user**
2. Create the account with student email
3. Assign the student role:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID', 'student');
```

4. Create a matching student profile:

```sql
INSERT INTO students (user_id, ic, name, intake_code)
VALUES ('USER_ID', '900906-14-XXXX', 'Student Name', '09-2025');
```

## Phase 4: Data Migration

### Importing Historical Data

If you have existing student records from the old system:

1. **Admin Panel → Student Directory → Upload History & Append Marks**
2. Prepare an Excel file with columns: `ID`, `Name`, `IC`, `Intake`, `CourseCode`, `CourseTitle`, `Credits`, `Mark`, `Semester`, `Session`
3. Upload the file to create student profiles and import grades
4. The system will automatically calculate GPA/CGPA

### Adding New Courses

1. **Admin Panel → Course Catalog**
2. Upload Excel file with: `CourseCode`, `CourseTitle`, `Credits`
3. Or use the SQL editor:

```sql
INSERT INTO courses (code, title, credits)
VALUES ('MTH101', 'MATHEMATICS I', 3);
```

## Phase 5: Access Control

### Student Access

- Students visit the **Student Access** tab
- Enter their IC number and name
- View their official transcript (printable)
- Cannot modify any data

### Admin Access

- Admins visit the **Admin Console** tab
- Sign in with email and password
- Full access to:
  - Import student profiles
  - Upload and append grades
  - Manage course catalog
  - View audit logs
  - Download reports

### Data Security

All data is protected by:
- **Encryption in transit** (HTTPS/SSL)
- **Encryption at rest** (Supabase PostgreSQL)
- **Row-Level Security** - Users can only access their own data
- **Audit logging** - All admin actions are logged
- **No hardcoded credentials** - Secure authentication only

## Phase 6: Deployment

### Deployment Options

#### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

#### Option 2: Netlify

```bash
# Deploy from GitHub integration or:
netlify deploy --prod --dir=dist
```

#### Option 3: Self-Hosted

```bash
npm run build
# Copy the `dist` folder to your web server
```

### Environment Variables in Production

Ensure your hosting platform has these variables set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_SUPABASE_ANON_KEY`

## Phase 7: Maintenance

### Regular Tasks

1. **Backup data**: Supabase automatically backs up daily
2. **Monitor logs**: Check audit_logs table for suspicious activity
3. **Update students**: Add new student records as they enroll
4. **Review transcripts**: Ensure grades are accurate before printing

### Security Best Practices

1. **Change passwords**: Rotate admin passwords quarterly
2. **Limit access**: Only create admin accounts for authorized staff
3. **Enable MFA**: Use Supabase MFA for additional security
4. **Monitor access**: Review audit logs monthly
5. **Keep backups**: Export critical data monthly

## Troubleshooting

### "Invalid credentials" on Admin Login

- Check that the email and password are correct
- Verify the user exists in Supabase **Authentication → Users**
- Confirm the user has the 'admin' role in the `user_roles` table

### Students Can't Find Records

- Verify student IC and name match exactly (case-sensitive for name)
- Check that the student profile exists in the `students` table
- Ensure the student has enrollments in the `enrollments` table

### Grades Not Showing

- Confirm grades were imported to the `enrollments` table
- Check that the enrollment record includes `grade_letter` and `grade_points`
- Verify the student_id and course_id are correct foreign keys

### Performance Issues

- Check for large datasets: Add pagination (use `LIMIT OFFSET`)
- Review slow queries in Supabase logs
- Consider adding indexes for frequently queried columns

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Row-Level Security**: https://supabase.com/docs/guides/auth/row-level-security

## License

This application is proprietary software for Innovative University College.
