# 🧠 Aptivo - Comprehensive Educational Portal

A modern, full-featured educational platform built with Next.js 16, TypeScript, Tailwind CSS, and Supabase.

## ✨ Features

### 🎓 Student Features
- **Beautiful Dashboard** - Glassmorphism UI with study plans, AI tutor, and progress analytics
- **Practice Engine** - MCQ practice sessions with university-specific rules
- **Progress Tracking** - Real-time analytics with accuracy trends and learning streaks
- **Weakness Detection** - AI-powered identification of struggling topics
- **Multi-University Support** - Enroll in multiple universities
- **Multi-Topic Enrollment** - Batch topic selection
- **Content Reading** - Markdown-based study materials with practice linkage

###  👨‍💼 Admin Features
- **Excel MCQ Upload** - Bulk upload MCQs with validation and preview
- **Markdown Content Upload** - Rich content management
- **Hierarchical Content** - Subject → Topic → Subtopic structure
- **University Management** - Configure universities and practice rules
- **Content CMS** - Full CRUD operations for all content
- **User Management** - Manage students, admins, and institutions

### 🎨 Design Features
- **Glassmorphism UI** - Soft, modern design with blur effects
- **Mint Green Theme** - Clean, professional color palette
- **Responsive Design** - Works on all devices
- **Smooth Animations** - Delightful micro-interactions
- **Dark Mode Ready** - (Can be enabled)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)
- Git (optional)

### Installation

1. **Navigate to project directory**
   ```bash
   cd aptivo-portal
   ```

2. **Install dependencies** (already done)
   ```bash
   npm install
   ```

3. **Configure Supabase**

   a. Create a new Supabase project at [https://supabase.com](https://supabase.com)
   
   b. Run the SQL schema in Supabase SQL Editor:
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents from `supabase/schema.sql`
   - Execute the SQL

   c. Get your Supabase credentials:
   - Go to Project Settings → API
   - Copy `Project URL` and `anon public` key

   d. Update `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔑 Demo Credentials

### Student Account
- **Email**: student@demo.com
- **Password**: Student@123

### Admin Account
- **Email**: admin@aptivo.com
- **Password**: Admin@123

> **Note**: These demo accounts need to be created in Supabase first. Follow the "Creating Demo Accounts" section below.

## 📦 Creating Demo Accounts

After setting up Supabase, create demo accounts:

### Option 1: Via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Add the demo credentials above
4. Confirm email addresses

### Option 2: Via Registration Page

1. Go to `/register` (to be created)
2. Sign up with the demo credentials
3. Verify via email

## 📂 Project Structure

```
aptivo-portal/
├── app/                          # Next.js app directory
│   ├── page.tsx                 # Root redirect page
│   ├── login/                   # Login page
│   ├── dashboard/               # Student dashboard
│   └── admin/                   # Admin pages
│   │   ├── dashboard/          # Admin dashboard
│   │   ├── upload/             # Excel/Markdown universal upload
│   │   ├── users/              # User management
│   │   ├── content/            # Content CMS
│   │   └── settings/           # Admin settings
│   └── onboarding/             # University selection flow
├── components/                   # React components
│   └── layout/                  # Layout components
│       ├── Sidebar.tsx         # Navigation sidebar
│       └── Header.tsx          # Top header
├── lib/                         # Core libraries
│   ├── services/               # Business logic services
│   │   ├── authService.ts      # Authentication
│   │   ├── contentService.ts   # Content CRUD
│   │   ├── excelUploadService.ts # Excel upload
│   │   ├── markdownService.ts  # Markdown processing
│   │   └── practiceService.ts  # Practice engine
│   ├── supabase/               # Supabase config
│   │   └── client.ts           # Supabase client
│   └── utils.ts                # Utility functions
├── supabase/                    # Database schema
│   └── schema.sql              # Complete DB schema
└── app/globals.css             # Global styles

```

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema with:

- **Users & Authentication** - Multi-role user system
- **Content Hierarchy** - Subjects, Topics, Subtopics
- **MCQ Management** - Questions with difficulty levels
- **Practice Sessions** - Track student performance
- **Progress Analytics** - Detailed learning metrics
- **Universities** - Institution management
- **Weaknesses Detection** - AI-powered analysis

See `supabase/schema.sql` for complete details.

## 🎯 Core Services

### AuthService
- User login/registration
- Session management
- Domain verification
- Role-based access control

### ContentService
- Subject/Topic/Subtopic CRUD
- Hierarchical content management
- Content search

### ExcelUploadService
- File validation
- Excel parsing
- Data validation
- Batch MCQ upload
- Duplicate detection

### MarkdownService
- Markdown file processing
- Image extraction
- Content validation
- Table of contents generation

### PracticeService
- Session generation based on rules
- University-specific difficulty distribution
- Progress tracking
- Weakness detection
- Learning streak calculation

## 🎨 Design System

### Colors
- **Primary**: `#88D1B1` (Mint Green)
- **Secondary**: `#14b8a6` (Indigo)
- **Background**: `#F8FAFC` (Off-white)
- **Surface**: `#FFFFFF` (White)

### Components
- Glass cards with backdrop blur
- Soft shadows (very subtle)
- Rounded corners (24px for cards)
- Smooth animations
- Mint green accents

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, tight tracking
- **Body**: Regular, comfortable line height

## 📱 Pages Overview

### `/login`
- Beautiful glassmorphism login form
- Email/password authentication
- Role-based redirect
- Demo credentials display

### `/dashboard` (Student)
- Greeting with personalized message
- Today's study plan with checkboxes
- Learning streak display
- AI Study Buddy card
- Accuracy trends chart (Recharts)
- Overall progress circular gauge
- Quick actions panel

### `/admin/upload` (Admin)
- Content hierarchy selection
- Excel file drag & drop
- Real-time validation
- MCQ preview (first 5)
- Batch upload with progress
- Error reporting

### `/admin/users` (Admin)
- View all users with filtering
- Manage user roles and status
- Invite new users

### `/onboarding` (Student)
- Post-registration flow
- Multi-university selection
- Progress tracking UI

### `/admin/content` (Admin)
- Subject/Topic/Subtopic management
- Content editing with markdown
- Hierarchy visualization
- Bulk operations

## 🔧 Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Your Supabase anon key
NEXT_PUBLIC_APP_NAME=Aptivo      # App name
NEXT_PUBLIC_APP_URL=             # Production URL
```

### Tailwind Configuration
The design uses Tailwind CSS v4 with custom variables defined in `globals.css`.

### Supabase Configuration
- Row Level Security (RLS) enabled
- Policies for student/admin access
- Helper functions for analytics
- Automated triggers for timestamps

## 📊 Excel Upload Format

Required columns for MCQ upload:

| Column | Required | Format |
|--------|----------|--------|
| question | Yes | Text |
| image_url | No | Valid URL |
| option_a | Yes | Text |
| option_b | Yes | Text |
| option_c | Yes | Text |
| option_d | Yes | Text |
| correct_option | Yes | A/B/C/D |
| explanation | No | Text |
| explanation_url | No | Valid URL |
| difficulty | No | easy/medium/hard |

Download template from the upload page.

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel
```

### Environment Setup
1. Add environment variables in Vercel dashboard
2. Connect Supabase project
3. Deploy!

## 🛠️ Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Lint Code
```bash
npm run lint
```

## 📝 Todo / Upcoming Features

- [ ] Registration page
- [ ] Password reset flow
- [ ] User profile editing
- [ ] Mobile-specific optimizations
- [ ] Offline practice mode
- [ ] AI Tutor implementation
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Export progress reports
- [ ] Social learning features

## 🤝 Contributing

This is a proprietary educational platform. Please contact the development team for contribution guidelines.

## 📄 License

Copyright © 2026 Aptivo. All rights reserved.

## 🆘 Support

For issues or questions:
- Check the documentation above
- Review the code comments
- Contact: support@aptivo.com

---

**Built with ❤️ using Next.js, TypeScript, Tailwind CSS, and Supabase**
