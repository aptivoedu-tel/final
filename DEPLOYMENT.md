# Aptivo Portal - Deployment Guide

## Vercel Deployment

This Next.js application is optimized and ready for deployment on Vercel.

### Prerequisites
- A Vercel account (sign up at https://vercel.com)
- A Supabase project (https://supabase.com)
- Your GitHub repository connected to Vercel

### Steps to Deploy

#### 1. Push Your Code to GitHub
Your code is already pushed to: `https://github.com/aptivoedu-tel/final.git`

#### 2. Import Project to Vercel
1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Choose your repository: `aptivoedu-tel/final`
4. Click "Import"

#### 3. Configure Environment Variables
In the Vercel project settings, add the following environment variables:

**Required Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_APP_NAME=Aptivo
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

**Where to find Supabase credentials:**
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

#### 4. Deploy
1. Click "Deploy"
2. Vercel will automatically build and deploy your application
3. Your app will be live at: `https://your-project-name.vercel.app`

### Build Configuration

The project includes:
- ✅ Optimized production build
- ✅ Static generation where possible
- ✅ Edge runtime for search functionality
- ✅ Automatic image optimization
- ✅ Middleware for authentication

### Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Test login/registration flow
- [ ] Check super admin, institution admin, and student dashboards
- [ ] Verify database connections
- [ ] Test image uploads and slideshow
- [ ] Confirm email verification works

### Custom Domain (Optional)

To add a custom domain:
1. Go to your Vercel project settings
2. Click on "Domains"
3. Add your domain and follow DNS instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable

### Troubleshooting

**Build fails on Vercel:**
- Check the build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify Supabase credentials are correct

**Middleware warnings:**
- The middleware deprecation warning is informational only
- Your authentication middleware will work correctly

**Database connection issues:**
- Verify Supabase URL and keys
- Check Supabase project is active and not paused
- Ensure RLS policies are configured

### Production Optimizations

This build includes:
- Server-side rendering (SSR) for dynamic pages
- Static generation for public pages
- Edge runtime for optimal performance
- Automatic code splitting
- Image optimization via Next.js

### Support

For deployment issues:
- Vercel Documentation: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Supabase Integration: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs

---
**Built with Next.js 16.1.6 | Deployed on Vercel | Powered by Supabase**
