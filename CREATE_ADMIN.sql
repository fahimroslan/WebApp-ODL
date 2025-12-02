-- ODL Transcript Workspace - Admin Account Setup Script
-- Run this in Supabase SQL Editor after creating a user

-- Step 1: Find the user ID (run this first to get USER_ID)
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Step 2: Copy the ID from step 1 and replace 'USER_ID' below
-- Then run this query to assign admin role

INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Verify admin role was assigned
-- SELECT ur.user_id, ur.role, u.email FROM user_roles ur
-- JOIN auth.users u ON ur.user_id = u.id
-- WHERE ur.role = 'admin';
