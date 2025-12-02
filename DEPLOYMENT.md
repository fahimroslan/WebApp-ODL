# Deployment Guide

## Pre-Deployment

1. Ensure `.env` file contains valid Supabase credentials
2. Run `npm run build` and verify no errors
3. Test locally with `npm run dev`
4. Review SETUP_GUIDE.md and complete all steps
5. Run through MIGRATION_CHECKLIST.md

## Deployment Platforms

### Vercel (Recommended - Free Tier Available)

**Advantages:**
- Optimized for Vite projects
- Automatic deployments from Git
- Free tier includes unlimited bandwidth
- Built-in analytics

**Steps:**

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" and import your repository
4. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_SUPABASE_ANON_KEY`
5. Click "Deploy"
6. Your app is live at `<project-name>.vercel.app`

**Custom Domain:**
1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Follow DNS setup instructions

### Netlify (Free Tier Available)

**Advantages:**
- GitHub integration
- Free tier with decent limits
- Easy rollbacks
- Form submissions support

**Steps:**

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select repository
5. Set build command: `npm run build`
6. Set publish directory: `dist`
7. Add environment variables in Settings → Build & deploy → Environment
8. Click "Deploy site"

**Via CLI:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### AWS Amplify

**Steps:**

1. Install AWS Amplify CLI:
```bash
npm install -g @aws-amplify/cli
```

2. Connect to AWS:
```bash
amplify configure
```

3. Initialize Amplify:
```bash
amplify init
```

4. Add hosting:
```bash
amplify add hosting
# Select: Hosting with Amplify Console
# Select: Single Page App
amplify publish
```

### Firebase Hosting

**Steps:**

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Initialize Firebase:
```bash
firebase init hosting
# Select your project
# Set public directory to: dist
# Rewrite all URLs to index.html: Yes
```

3. Build and deploy:
```bash
npm run build
firebase deploy
```

### GitHub Pages (Free)

**Steps:**

1. Add to `vite.config.js`:
```javascript
export default {
  base: '/repository-name/',
  // ... other config
}
```

2. Build and deploy:
```bash
npm run build
git add dist -f
git commit -m "Deploy"
git subtree push --prefix dist origin gh-pages
```

3. Enable GitHub Pages in repository settings

### Docker (Self-Hosted)

**Create `Dockerfile`:**

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build and run:**
```bash
docker build -t odl-transcript .
docker run -p 80:80 odl-transcript
```

### Traditional Web Hosting (cPanel, etc.)

1. Build the project: `npm run build`
2. Upload `dist` folder to your hosting
3. Point domain to the public folder
4. Add `.htaccess` for single-page app routing:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## Environment Configuration

Set these variables in your hosting platform:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=your-public-anon-key
```

**Never expose your service role key publicly.**

## CORS Configuration

Supabase automatically handles CORS. If needed, update your Supabase project settings:

1. Go to Project Settings → API
2. Add your domain to Allowed origins

## SSL/HTTPS

All major hosting platforms provide free SSL:
- **Vercel**: Automatic
- **Netlify**: Automatic
- **AWS**: Use CloudFront
- **Firebase**: Automatic
- **GitHub Pages**: Automatic
- **cPanel**: Let's Encrypt (usually included)

## Performance Optimization

After deployment:

1. Monitor build size (should be <300KB gzipped)
2. Enable caching headers
3. Use CDN for assets
4. Monitor database queries
5. Set up error tracking (Sentry, etc.)

## Monitoring & Logging

### Error Tracking

Add Sentry for error tracking:

```bash
npm install @sentry/vite
```

Initialize in `main.js`:
```javascript
import * as Sentry from "@sentry/vite";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
});
```

### Database Monitoring

Check Supabase dashboard:
1. Go to Logs → Edge Function Logs
2. Monitor query performance
3. Set up alerts for unusual activity

## Disaster Recovery

### Backup Strategy

1. **Daily automatic backups** (Supabase handles)
2. **Manual exports** - Monthly dump of critical data:

```sql
-- Export in Supabase SQL Editor
\copy students TO 'students_backup.csv' CSV HEADER;
\copy enrollments TO 'enrollments_backup.csv' CSV HEADER;
```

### Rollback Plan

If deployment fails:
1. Revert to previous commit
2. Trigger redeploy on hosting platform
3. Restore from Supabase backup if needed

## Testing Before Production

```bash
# Build locally
npm run build

# Serve the dist folder locally
npx http-server dist

# Test with actual Supabase credentials
# Visit http://localhost:8080
```

## Troubleshooting

**Blank page on production:**
- Check browser console for errors
- Verify environment variables set correctly
- Check network tab for failed requests

**Supabase connection fails:**
- Verify API keys are correct
- Check CORS settings in Supabase
- Ensure project is active (not paused)

**High memory usage:**
- Reduce bundle size (analyze with `npm run build`)
- Implement code splitting
- Lazy load components

**Slow performance:**
- Check database query performance
- Enable caching headers
- Use CDN for static assets
- Monitor Supabase resource usage

## Support

- **Vercel Support**: https://vercel.com/help
- **Netlify Support**: https://www.netlify.com/support/
- **Supabase Support**: https://supabase.com/docs
- **Firebase Support**: https://firebase.google.com/support

---

**Last Updated**: December 2024
