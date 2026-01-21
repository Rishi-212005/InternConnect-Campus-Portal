# INTERNCONNECT CAMPUS

<div align="center">

![INTERNCONNECT Connect](https://img.shields.io/badge/INTERNCONNECT-Connect-orange?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)

**A comprehensive campus-centric internship and placement platform connecting students, recruiters, faculty, and placement cells.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Project Structure](#-project-structure) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Project Structure](#-project-structure)
- [User Roles](#-user-roles)
- [Key Features](#-key-features)
- [Database Schema](#-database-schema)
- [API & Backend](#-api--backend)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Overview

INTERNCONNECT Connect is a modern, full-stack platform designed to streamline the internship and placement process for educational institutions. It provides role-based dashboards for students, recruiters, faculty mentors, placement cell administrators, and system administrators, enabling efficient job matching, application tracking, and career development.

### Key Highlights

- 🎓 **Student-Centric**: AI-powered job matching, digital profiles with verifiable skill badges, and one-click applications
- 🏢 **Recruiter-Friendly**: Smart candidate filtering, interview scheduling, and comprehensive analytics
- 👨‍🏫 **Faculty Integration**: Approval workflows, student progress tracking, and mentorship tools
- 📊 **Placement Cell Tools**: Analytics dashboard, partner verification, and compliance reporting
- 🔐 **Secure & Scalable**: Built with Supabase for authentication, real-time data, and secure storage

## ✨ Features

### For Students
- 📝 **Digital Profile Management**: Create and manage verifiable profiles with skills, certifications, and achievements
- 🎯 **AI-Powered Job Matching**: Get personalized job recommendations based on skills and profile
- 📤 **One-Click Applications**: Apply to multiple positions with a single click
- 📅 **Interview Scheduler**: Manage and track interview schedules
- 📊 **Application Tracking**: Monitor application status in real-time
- 🏆 **Skill Badges**: Earn and display verifiable skill certifications
- 📚 **Exam Management**: Take and track placement exams

### For Recruiters
- 📢 **Job Posting**: Create and manage job listings with detailed requirements
- 🔍 **Smart Candidate Filtering**: Filter candidates by skills, department, CGPA, and more
- 📋 **Application Management**: Review, shortlist, and manage candidate applications
- 📅 **Interview Coordination**: Schedule and manage interviews
- 📈 **Analytics Dashboard**: Track hiring metrics, conversion rates, and candidate pipeline
- ✅ **Verification Workflow**: Submit jobs for placement cell verification

### For Faculty Mentors
- ✅ **Approval Workflow**: Review and approve student job applications
- 📊 **Student Progress Tracking**: Monitor mentee progress and achievements
- 👥 **Mentorship Management**: Manage mentor-mentee relationships
- 📝 **Student Profile Review**: Access detailed student profiles for guidance

### For Placement Cell
- 🔍 **Verification Queue**: Review and verify job postings from recruiters
- 📊 **Analytics Dashboard**: Comprehensive placement statistics and metrics
- 🏢 **Company Management**: Track partner companies and their engagement
- 📈 **Department-wise Reports**: Generate placement reports by department
- ✅ **Student Verification**: Verify student profiles and applications
- 📋 **Compliance Reporting**: Generate compliance and audit reports
- 🎓 **Mentor Approvals**: Approve faculty mentor requests

### For Administrators
- 👥 **User Management**: Manage all user accounts and roles
- ⚙️ **System Configuration**: Configure platform settings
- 📊 **Compliance Monitoring**: Monitor system compliance and audit logs
- 🔐 **Security Management**: Manage security settings and access controls

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 18.3](https://react.dev/) with TypeScript
- **Build Tool**: [Vite 5.4](https://vitejs.dev/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) built on [Radix UI](https://www.radix-ui.com/)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/)
- **Routing**: [React Router 6.30](https://reactrouter.com/)
- **State Management**: [TanStack Query 5.83](https://tanstack.com/query)
- **Forms**: [React Hook Form 7.61](https://react-hook-form.com/) with [Zod 3.25](https://zod.dev/)
- **Animations**: [Framer Motion 12.23](https://www.framer.com/motion/)
- **Charts**: [Recharts 2.15](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend
- **Database**: [Supabase PostgreSQL](https://supabase.com/)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Edge Functions**: Supabase Functions (TypeScript)

### Development Tools
- **Language**: TypeScript 5.8
- **Linting**: ESLint 9.32
- **Package Manager**: npm / bun

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **bun** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com/) (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/codecrew-connect.git
   cd codecrew-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

   You can find these values in your Supabase project settings under API.

4. **Set up Supabase Database**
   
   The project includes migration files in the `supabase/migrations/` directory. Apply these migrations to your Supabase project:
   
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or manually apply migrations through Supabase Dashboard
   ```

5. **Deploy Supabase Functions** (Optional)
   
   If you want to use the edge functions:
   ```bash
   supabase functions deploy evaluate-code
   supabase functions deploy send-notification
   supabase functions deploy seed-admin-users
   ```

### Running the Application

1. **Start the development server**
   ```bash
   npm run dev
   # or
   bun run dev
   ```

2. **Open your browser**
   
   Navigate to `http://localhost:8080` (or the port shown in your terminal)

3. **Build for production**
   ```bash
   npm run build
   ```

4. **Preview production build**
   ```bash
   npm run preview
   ```

## 📁 Project Structure

```
INTERNCONNECT-connect/
├── public/                 # Static assets
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── components/        # React components
│   │   ├── faculty/       # Faculty-specific components
│   │   ├── landing/       # Landing page components
│   │   ├── layout/        # Layout components
│   │   ├── recruiter/     # Recruiter-specific components
│   │   ├── student/       # Student-specific components
│   │   └── ui/            # Reusable UI components (shadcn/ui)
│   ├── contexts/          # React contexts
│   │   └── SupabaseAuthContext.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useApplications.ts
│   │   ├── useJobs.ts
│   │   ├── useProfile.ts
│   │   └── ...
│   ├── integrations/     # Third-party integrations
│   │   └── supabase/     # Supabase client and types
│   ├── lib/              # Utility functions
│   │   └── utils.ts
│   ├── pages/            # Page components
│   │   ├── admin/        # Admin pages
│   │   ├── faculty/     # Faculty pages
│   │   ├── placement/   # Placement cell pages
│   │   ├── recruiter/   # Recruiter pages
│   │   ├── student/     # Student pages
│   │   ├── Auth.tsx
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── supabase/
│   ├── functions/        # Supabase Edge Functions
│   │   ├── evaluate-code/
│   │   ├── send-notification/
│   │   └── seed-admin-users/
│   ├── migrations/      # Database migrations
│   └── config.toml      # Supabase configuration
├── .env                  # Environment variables (create this)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

## 👥 User Roles

The platform supports five distinct user roles, each with tailored features and permissions:

### 🎓 Student
- Browse and apply to job opportunities
- Manage profile and skill badges
- Track applications and interviews
- Schedule exams and interviews
- Request faculty mentorship

### 🏢 Recruiter
- Post job opportunities
- Review and filter candidates
- Shortlist and manage applications
- Schedule interviews
- View analytics and metrics

### 👨‍🏫 Faculty Mentor
- Approve/reject student applications
- Track student progress
- Manage mentorship relationships
- Review student profiles

### 📊 Placement Cell
- Verify job postings
- Approve student profiles
- Manage company partnerships
- Generate reports and analytics
- Monitor placement statistics

### 🔐 Administrator
- Manage all users and roles
- Configure system settings
- Monitor compliance and audit logs
- System-wide oversight

## 🔑 Key Features

### AI-Powered Job Matching
The platform uses intelligent algorithms to match students with relevant job opportunities based on:
- Skills and expertise
- Department and specialization
- CGPA and academic performance
- Previous applications and preferences

### Verifiable Digital Profiles
Students can create comprehensive profiles featuring:
- Academic information (CGPA, department, year)
- Skill badges and certifications
- Resume and portfolio links
- Achievement tracking

### Real-time Application Tracking
- Status updates in real-time
- Notification system for important events
- Interview scheduling and management
- Application history and analytics

### Comprehensive Analytics
- Placement statistics by department
- Company engagement metrics
- Application conversion rates
- Student placement rates
- Time-to-hire analytics

## 🗄 Database Schema

The platform uses a PostgreSQL database with the following main tables:

- **profiles**: User profile information
- **student_profiles**: Extended student information
- **faculty_profiles**: Faculty mentor profiles
- **jobs**: Job postings and opportunities
- **applications**: Student job applications
- **interview_schedules**: Interview management
- **assessments**: Placement exams and assessments
- **notifications**: System notifications
- **company_rounds**: Company-specific interview rounds

For detailed schema information, refer to the migration files in `supabase/migrations/`.

## 🔌 API & Backend

### Supabase Integration

The platform uses Supabase for:
- **Authentication**: Email/password, OAuth providers
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Storage**: File storage for resumes and documents
- **Real-time**: Live updates for applications and notifications
- **Edge Functions**: Serverless functions for code evaluation and notifications

### Edge Functions

1. **evaluate-code**: Evaluates code submissions for technical assessments
2. **send-notification**: Sends notifications to users
3. **seed-admin-users**: Seeds initial admin users

## 🚢 Deployment

### Vercel / Netlify

1. **Connect your repository** to Vercel or Netlify
2. **Set environment variables** in the deployment platform
3. **Configure build settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Deploy**

### Self-Hosted

1. **Build the application**:
   ```bash
   npm run build
   ```
2. **Serve the `dist` folder** using a web server (nginx, Apache, etc.)
3. **Configure environment variables** on your server

### Supabase Setup

1. Create a new Supabase project
2. Apply database migrations
3. Configure Row Level Security (RLS) policies
4. Set up storage buckets for file uploads
5. Deploy edge functions (if needed)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint for code quality
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Supabase](https://supabase.com/) for the amazing backend platform
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

## 📧 Contact

For questions, suggestions, or support, please open an issue on GitHub or contact the maintainers.

---

<div align="center">

**Built with ❤️ for educational institutions**

[⭐ Star this repo](https://github.com/Rishi-212005/InternConnect-Campus-Portal) if you find it helpful!

</div>
