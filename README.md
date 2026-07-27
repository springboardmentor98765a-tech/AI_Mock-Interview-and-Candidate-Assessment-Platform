# Role-Based Dashboard System

A modern, responsive dashboard application with role-based access control built using React. This project features separate dashboards for Admin, Student, and Recruiter roles with simulated authentication.

## Features

- Landing page with project overview and role information
- Dummy login system with role selection
- 3 role-based dashboards (Admin, Student, Recruiter)
- Protected routes with role-based access control
- Responsive design for desktop, tablet, and mobile
- OAuth 2.0 research and explanation page
- JWT research and explanation page
- 404 error page for unknown routes
- Sidebar navigation for dashboards
- Logout functionality

## Technologies Used

- React 18
- React Router v6
- Vite (build tool)
- Plain CSS (no frameworks)

## Installation

1. Clone or download the project

2. Navigate to the project directory:
```bash
cd Role-Based Dashboard System
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and go to `http://localhost:5173`

## How to Run

- Use `npm run dev` to start the development server
- Use `npm run build` to create a production build
- Use `npm run preview` to preview the production build

## Folder Structure

```
src/
├── components/
│   └── Sidebar.jsx
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── AdminDashboard.jsx
│   ├── StudentDashboard.jsx
│   ├── RecruiterDashboard.jsx
│   ├── OAuthInfo.jsx
│   ├── JWTInfo.jsx
│   └── NotFound.jsx
├── styles/
│   ├── global.css
│   ├── home.css
│   ├── login.css
│   ├── dashboard.css
│   ├── sidebar.css
│   ├── infopage.css
│   └── notfound.css
├── App.jsx
└── main.jsx
```

## Role Information

### Admin
- View total users, active users, revenue, and pending requests
- Recent users table
- Quick actions panel
- Notifications feed
- Profile section

### Student
- View courses, assignments, attendance, and GPA
- Course progress with progress bars
- Upcoming deadlines with priority badges
- Recent activity feed
- Profile section

### Recruiter
- View candidates, open positions, interviews, and applications
- Recent applicants table with status
- Job postings list
- Hiring pipeline visualization
- Profile section

## Login Credentials

This project uses dummy authentication. Any email and password will work as long as the fields are not empty. Select a role from the dropdown to access the corresponding dashboard.

- Roles available: Admin, Student, Recruiter
- Login data is stored in localStorage

## Future Improvements

- Integrate real backend with Node.js/Express
- Implement OAuth 2.0 for social login (Google, GitHub)
- Add JWT-based authentication
- Connect to a database (MongoDB/PostgreSQL)
- Add real-time notifications
- Implement data visualization with charts
- Add user management CRUD operations

## OAuth 2.0 Summary

OAuth 2.0 is an authorization framework that allows third-party apps to access user resources without sharing credentials. It uses tokens instead of passwords and supports flows like Authorization Code Flow. Popular providers include Google and GitHub. In a production version of this app, OAuth would enable social login functionality.

## JWT Summary

JWT (JSON Web Token) is a compact token format for securely transmitting information between parties. It consists of three parts: Header, Payload, and Signature. JWTs are stateless, self-contained, and widely used for API authentication. In a production version of this app, JWT would replace the localStorage-based dummy authentication with proper token-based auth.
