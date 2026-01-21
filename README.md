# ResFlow v2 - Resource Management Platform

[![Development Status](https://img.shields.io/badge/status-in%20development-yellow)](https://github.com/tnikhil-acog/resflow-v2)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)

> ⚠️ **IMPORTANT**: This project is currently in active development and is NOT production-ready. Features are being built and tested. Please do not use this in a production environment.

## 📖 About ResFlow v2

ResFlow v2 is a comprehensive resource management platform designed for organizations to efficiently manage their workforce, projects, and resource allocations. It provides tools for tracking employee assignments, managing project lifecycles, monitoring work logs, and generating reports.

### Key Features

- **Employee Management**: Track employee profiles, skills, roles, and work history
- **Project Management**: Manage projects from planning to closure with detailed tracking
- **Resource Allocation**: Assign employees to projects with workload balancing (max 100% allocation)
- **Work Logging**: Daily work hour tracking across multiple projects
- **Reporting System**: Weekly reports and project phase milestone tracking
- **Skills Management**: Maintain a skills database with proficiency levels and approvals
- **Resource Demands**: Project managers can request additional resources
- **Approval Workflows**: HR approval system for skill additions and resource requests
- **Audit Trail**: Complete audit logging for all critical operations
- **Role-Based Access Control (RBAC)**: Three roles - Employee, Project Manager, HR Executive

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **Backend**: Next.js API Routes (RESTful)
- **Database**: PostgreSQL 15
- **Authentication**: JWT-based authentication with role-based access

### Project Structure

```
resflow-v2/
├── app/
│   ├── (pages)/              # UI pages with route groups
│   │   ├── dashboard/        # Main dashboard
│   │   ├── employees/        # Employee management pages
│   │   ├── projects/         # Project management pages
│   │   ├── allocations/      # Resource allocation pages
│   │   ├── logs/             # Daily work logs
│   │   ├── reports/          # Weekly/phase reports
│   │   ├── demands/          # Resource demand requests
│   │   ├── skills/           # Skills management
│   │   ├── approvals/        # Approval workflows
│   │   ├── audit/            # Audit trail viewer
│   │   ├── tasks/            # Task management
│   │   └── settings/         # User settings
│   ├── api/                  # Backend API routes
│   │   ├── auth/             # Authentication endpoints
│   │   ├── employees/        # Employee CRUD operations
│   │   ├── projects/         # Project CRUD operations
│   │   ├── allocations/      # Allocation management
│   │   ├── logs/             # Work log operations
│   │   ├── reports/          # Report submissions
│   │   ├── demands/          # Resource demand handling
│   │   ├── skills/           # Skills operations
│   │   ├── approvals/        # Approval processing
│   │   ├── audit/            # Audit log queries
│   │   └── tasks/            # Task operations
│   ├── login/                # Login page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── app-sidebar.tsx       # Application sidebar
│   └── theme-provider.tsx    # Theme configuration
├── lib/
│   ├── utils.ts              # Utility functions
│   └── nav.ts                # Navigation configuration
├── hooks/                    # Custom React hooks
├── public/                   # Static assets
└── Maps/                     # Project documentation (XMind files)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 15+
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/tnikhil-acog/resflow-v2.git
   cd resflow-v2
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up the database**

   Create a PostgreSQL database and run the schema migrations:

   ```sql
   -- Create tables for employees, projects, allocations, etc.
   -- (Schema files to be added)
   ```

4. **Configure environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/resflow_v2
   JWT_SECRET=your-secret-key-here
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

5. **Run the development server**

   ```bash
   pnpm dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 👥 User Roles & Permissions

### 1. Employee

- View personal dashboard and assigned projects
- Log daily work hours
- Submit weekly reports
- Manage personal skills (pending HR approval)
- View own allocations and tasks

### 2. Project Manager

- All employee permissions
- View team members and their allocations
- Create resource demand requests
- View project details for managed projects
- Submit phase completion reports

### 3. HR Executive

- All permissions (full access)
- Manage all employees (create, update, exit)
- Manage all projects (create, update, close)
- Manage resource allocations across the organization
- Approve/reject skill additions
- Approve/reject resource demands
- View complete audit trail
- Manage skills pool

## 📊 Database Schema

The application uses the following main tables:

- **employees**: Employee profiles and role information
- **projects**: Project details and lifecycle tracking
- **project_allocations**: Employee-project assignments with percentages
- **reports**: Daily logs, weekly reports, and phase reports
- **tasks**: Task assignments and tracking
- **skills**: Master skills catalog
- **employee_skills**: Employee skill proficiency mapping
- **resource_demands**: Resource request workflows
- **audit_logs**: Complete audit trail

See `api-contract-full.md` for detailed schema definitions and API specifications.

## 📚 Documentation

- **[API Contract (Quick)](./api-contract-quick.md)**: Quick reference for API endpoints
- **[API Contract (Full)](./api-contract-full.md)**: Detailed API documentation with SQL queries
- **[RBAC Documentation](./RBAC.md)**: Complete role-based access control matrix
- **[Maps/](./Maps/)**: Project workflow diagrams and user stories (XMind format)

## 🔐 Security Features

- JWT-based authentication with secure token handling
- Role-based access control at both API and UI levels
- SQL injection prevention through parameterized queries
- Data filtering at database level based on user roles
- Audit logging for all critical operations
- Input validation and sanitization

## 🛠️ Development Status

### ✅ Completed

- Database schema design
- API route structure and implementation
- UI pages for all modules (29 pages)
- Role-based navigation
- Authentication flow
- RBAC implementation

### 🚧 In Progress

- Frontend form implementations
- API integration with UI
- Input validation and error handling
- Testing and bug fixes

### 📋 Planned

- Database migration scripts
- Unit and integration tests
- Docker containerization
- CI/CD pipeline
- Production deployment configuration
- Performance optimization
- Email notifications
- Advanced reporting and analytics

## 🤝 Contributing

As this project is in development, contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is currently private and not licensed for public use.

## 👨‍💻 Author

**Nikhil T**

- GitHub: [@tnikhil-acog](https://github.com/tnikhil-acog)

## 📞 Support

For questions or issues, please open an issue on GitHub or contact the development team.

---

**Note**: This is an active development project. Features, APIs, and documentation are subject to change. Always check the latest commit for current functionality.
