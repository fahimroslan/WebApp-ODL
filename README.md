# ODL Transcript Workspace v2.0

Secure, cloud-based academic transcript management system for Innovative University College's Centre for Digital Learning.

## ✨ What's New in v2.0

**Fully migrated to Supabase for enterprise-grade security and scalability:**

- ✅ Secure email/password authentication (no more hardcoded codes)
- ✅ Cloud database with PostgreSQL and Row-Level Security
- ✅ Automatic backups and disaster recovery
- ✅ Complete audit trail of all administrative actions
- ✅ Role-based access control (Admin/Student)
- ✅ Data encryption at rest and in transit
- ✅ GDPR-compliant data handling

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Supabase account (free tier available)

### Installation

```bash
# Clone or extract the project
cd odl-transcript-workspace

# Install dependencies
npm install

# Build for production
npm run build

# For development (if needed)
npm run dev
```

### Configuration

1. **Supabase Setup**: Your `.env` file already contains Supabase credentials
2. **Admin Account**: Create your first admin in Supabase dashboard
3. **Data Migration**: Upload historical student and grade data

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

## 📋 Features

### Student Access
- Secure IC + name verification
- Official transcript view
- GPA and CGPA display
- Print-ready transcript format
- No login required (privacy-focused)

### Admin Console
- Email/password authentication
- Student profile management
- Bulk imports from Excel
- Grade entry and updates
- Course catalog management
- CSV report exports
- Audit logs with timestamps
- Session management

### Security
- PostgreSQL row-level security policies
- Role-based access control
- Encrypted credentials
- Audit logging for all changes
- No hardcoded passwords
- HTTPS-only communication

## 📁 Project Structure

```
odl-transcript-workspace/
├── frontend/
│   ├── src/
│   │   ├── services/        # Auth and Supabase client
│   │   ├── data/           # Data storage and retrieval
│   │   ├── ui/             # UI components
│   │   ├── domain/         # Grade rules and models
│   │   ├── utils/          # Helper functions
│   │   └── main.js         # Entry point
│   ├── assets/
│   │   └── css/main.css    # Styling
│   └── public/
├── index.html              # HTML entry point
├── package.json            # Dependencies
├── vite.config.js          # Build configuration
├── .env                    # Environment variables (Supabase credentials)
├── SETUP_GUIDE.md          # Detailed setup instructions
├── MIGRATION_CHECKLIST.md  # Pre-launch checklist
└── README.md              # This file
```

## 🔐 Security Architecture

### Authentication
- Supabase Auth with email/password
- Secure session management
- Automatic token refresh
- Password reset capability

### Data Protection
- Row-Level Security (RLS) on all tables
- Students can only see their data
- Admins can manage all records
- Encrypted at rest and in transit

### Audit Logging
- All admin actions logged
- User, timestamp, and changes recorded
- Immutable audit trail
- Searchable by date and user

## 📊 Database Schema

### Tables

**user_roles**
- Tracks user type (admin/student)
- Links to Supabase auth.users

**students**
- IC number (unique identifier)
- Name, intake code
- Links to auth.users (optional)

**courses**
- Code (e.g., MTH101)
- Title, credit hours
- Description

**enrollments**
- Student-course linkage
- Marks, grades, grade points
- Credits attempted/earned
- Semester and session

**audit_logs**
- Admin user actions
- Changes made (JSON)
- Timestamp for each action

All tables have RLS enabled for data isolation.

## 📈 GPA Calculation

Grade bands (configurable):
- A: 80-100 (4.0 points)
- A-: 75-79 (3.67 points)
- B+: 70-74 (3.33 points)
- B: 65-69 (3.0 points)
- B-: 60-64 (2.67 points)
- C+: 55-59 (2.33 points)
- C: 50-54 (2.0 points)
- D+: 45-49 (1.67 points)
- D: 40-44 (1.33 points)
- F: Below 40 (0 points)

**GPA** = Total Grade Points ÷ Total Credits Attempted
**CGPA** = Cumulative total across all semesters

## 🛠️ Development

### Running Locally

```bash
npm run dev
# Opens http://localhost:5173
```

### Building for Production

```bash
npm run build
# Creates optimized dist/ folder
```

### Deployment

**Vercel (Recommended)**
```bash
npm install -g vercel
vercel --prod
```

**Netlify**
```bash
netlify deploy --prod --dir=dist
```

**Other Platforms**
- Copy `dist/` folder to your web server
- Set environment variables in platform settings

## 📝 Usage Guide

### For Administrators

1. Sign in with email and password
2. **Import Student History**: Upload Excel file with student records
3. **Append Marks**: Upload grades for a specific course
4. **Manage Catalog**: Add/update course information
5. **View Reports**: Export transcripts and statistics
6. **Monitor Logs**: Review all administrative actions

### For Students

1. Visit the Student Access tab
2. Enter IC number and full name
3. View transcript (GPA, courses, grades)
4. Print official transcript
5. No login required - complete privacy

## 🐛 Troubleshooting

**Admin Can't Log In**
- Verify email and password in Supabase dashboard
- Check that user has 'admin' role assigned
- Try resetting password

**Student Records Not Found**
- Confirm student profile exists in database
- Check IC number and name match exactly
- Import student data if missing

**Grades Not Showing**
- Verify grades were uploaded to enrollments table
- Confirm student-course linkage exists
- Check that GPA calculations are correct

**Build Errors**
- Delete node_modules and package-lock.json
- Run `npm install` again
- Check Node version (must be 18+)

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for more troubleshooting.

## 📞 Support

- **Supabase Dashboard**: https://supabase.com
- **Supabase Documentation**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Vite Docs**: https://vitejs.dev

## 📜 License

Proprietary software for Innovative University College.
All rights reserved.

---

**Version**: 2.0.0
**Last Updated**: December 2024
**Status**: Production Ready
