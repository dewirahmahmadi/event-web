# Event App

A modern React application for managing and viewing events.

## Tech Stack

- **React 19** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client
- **Lucide React** - Icons

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Available Scripts

### Development

Start the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build the application for production:

```bash
npm run build
```

The optimized files will be in the `dist/` directory.

### Preview

Preview the production build locally:

```bash
npm run preview
```

### Lint

Run ESLint to check code quality:

```bash
npm run lint
```

## Project Structure

- `src/pages/` - Page components (EventsPage, LoginPage, etc.)
- `src/components/` - Reusable components
  - `ui/` - UI components built with class-variance-authority
- `src/context/` - React contexts (AuthContext)
- `src/services/` - API services
- `src/lib/` - Utility functions
- `src/main.jsx` - Application entry point
- `src/App.jsx` - Root component with routing

## Features

- User authentication (login/signup)
- Protected routes
- Events browsing and details
- Responsive design with Tailwind CSS
- Form validation with Zod

## Environment Variables

If needed, create a `.env` file in the root directory:

```
VITE_API_URL=your_api_url
```
