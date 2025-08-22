# Crypto Marketplace

## Overview

This is a multi-vendor cryptocurrency marketplace for trading digital accounts. The application features a dark, minimal design aesthetic with a focus on privacy, security, and anonymity. It supports BTC/XMR payments, optional escrow protection, and provides both marketplace and admin interfaces. The system is built as a full-stack web application with static UI components and placeholder data for demonstration purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom dark theme color tokens
- **Typography**: Inter for UI text, JetBrains Mono for code/data display

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Storage**: Connect-pg-simple for PostgreSQL session storage
- **Development**: Server-side rendering with Vite integration for development

### Design System
- **Theme**: Dark mode with custom crypto marketplace color palette
- **Colors**: Deep blues and grays (#0B0F14 background, #22D3EE accent)
- **Components**: Comprehensive UI component library including cards, forms, navigation, tables, and status badges
- **Layout**: 12-column grid system with 1440px max container width
- **Accessibility**: WCAG AA compliant with focus states and keyboard navigation

### Data Storage
- **Primary Database**: PostgreSQL with connection pooling
- **ORM**: Drizzle with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Development Storage**: In-memory storage interface for development/testing

### Application Structure
- **Client Directory**: React frontend application with components, pages, and utilities
- **Server Directory**: Express backend with routes, storage abstraction, and Vite integration
- **Shared Directory**: Common schemas and types shared between client and server
- **Component Organization**: Modular structure with admin and marketplace feature separation

### Authentication & Security
- **User Schema**: Basic username/password authentication setup
- **Privacy Focus**: Minimal data collection approach designed for anonymous usage
- **Session Management**: PostgreSQL-backed session storage for scalability

### Key Features
- **Marketplace Interface**: Product browsing, search, and vendor management
- **Admin Dashboard**: User management, vendor oversight, order tracking, and system analytics
- **Multi-Currency Support**: Designed for BTC/XMR payment integration
- **Escrow System**: Framework for secure transaction handling
- **Responsive Design**: Mobile-first approach with adaptive layouts

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18 with TypeScript, React Query for data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tools**: Vite for fast development and building, esbuild for server bundling

### UI and Styling
- **Component Library**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React for consistent iconography
- **Form Handling**: React Hook Form with Zod resolvers for validation

### Backend Infrastructure
- **Web Framework**: Express.js for HTTP server and API routes
- **Database**: Neon serverless PostgreSQL for cloud database hosting
- **ORM**: Drizzle ORM with Drizzle Kit for migrations and schema management
- **Session Storage**: connect-pg-simple for PostgreSQL session persistence

### Development Tools
- **TypeScript**: Full TypeScript support across client and server
- **Replit Integration**: Vite plugins for Replit development environment
- **Hot Reload**: Vite HMR for fast development iteration
- **Error Handling**: Runtime error overlay for development debugging

### Utility Libraries
- **Date Handling**: date-fns for date manipulation and formatting
- **Class Management**: clsx and class-variance-authority for conditional styling
- **Carousel**: Embla Carousel for image and content carousels
- **Command Interface**: cmdk for search and command palette functionality