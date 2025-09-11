# EarningsOwl

A comprehensive React application for tracking, configuring, and analyzing company earnings announcements with real-time features and financial research capabilities.

## Overview

Earnings Manager is a full-stack serverless application designed to streamline earnings tracking and financial analysis. It provides a centralized interface for managing earnings data, conducting financial research, and receiving real-time notifications through multiple channels.

## Key Features

### 🏢 **Company Management**
- **Company Configuration**: Create and manage configuration settings for earnings data extraction
- **Watchlist Management**: Personal watchlist of stock tickers with filtering capabilities
- **Company Profiles**: Detailed company information with logos and metadata

### 📊 **Earnings & Calendar**
- **Earnings Calendar**: Track upcoming and historical earnings announcements
- **Real-time Data**: Live earnings data through WebSocket connections
- **Historical Metrics**: Access and analyze historical financial performance
- **Admin Analysis Panel**: Advanced tools for earnings data analysis

### 🔬 **Financial Research**
- **Research Dashboard**: Comprehensive financial research tools
- **Data Templates**: Structured earnings data templates
- **Custom Analysis**: Configurable research parameters and metrics

### 🔔 **Real-time Notifications**
- **Audio Notifications**: Real-time audio alerts for earnings announcements
- **WebSocket Integration**: Live data updates and notifications
- **Watchlist Filtering**: Notifications filtered by personal watchlist

### 🔐 **Authentication & Security**
- **AWS Cognito Integration**: Secure user authentication and authorization
- **User Profiles**: Personalized user settings and preferences
- **Protected Routes**: Role-based access control

## Technology Stack

### **Frontend**
- **React 18.3.1** with TypeScript
- **React Router DOM 6.22.3** for navigation
- **Tailwind CSS 3.4.1** for styling
- **React Hook Form 7.51.0** for form management
- **React DatePicker 6.2.0** for date selection
- **Lucide React 0.344.0** for icons
- **React Toastify 10.0.4** for notifications

### **AWS Cloud Services**
- **AWS Cognito** - User authentication and authorization
- **AWS API Gateway** - RESTful API endpoints
- **AWS Lambda** - Serverless backend functions
- **AWS WebSocket API** - Real-time data connections

### **Development Tools**
- **Vite 5.4.2** - Build tool and development server
- **TypeScript 5.5.3** - Type safety
- **ESLint 9.9.1** - Code linting
- **PostCSS & Autoprefixer** - CSS processing

## Project Structure

```
src/
├── components/           # React components
│   ├── Calendar/        # Earnings calendar components
│   ├── Earnings/        # Earnings-related components
│   ├── FinancialResearch/  # Research dashboard
│   ├── Landing/         # Authentication and landing pages
│   ├── WatchList/       # Watchlist management
│   └── ui/              # Reusable UI components
├── contexts/            # React context providers
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── AudioSettingsContext.tsx
├── services/            # API and utility services
│   ├── api.ts          # Main API service
│   ├── cache.ts        # Caching layer
│   ├── websocket.ts    # WebSocket management
│   └── audioWebsocket.ts # Audio notification service
├── lib/                 # Core utilities
│   └── auth.ts         # AWS Cognito authentication
├── types/              # TypeScript type definitions
└── providers/          # Global data providers
```

## API Endpoints

The application integrates with multiple AWS API Gateway endpoints:

- **Earnings API**: Real-time earnings data and announcements
- **Config API**: Company configuration management
- **Research API**: Financial research and analysis tools
- **User Profile API**: User settings and preferences
- **Stock Data API**: Company names, logos, and metadata
- **Waitlist API**: User registration and access management

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Environment Setup
Copy `.env.example` to `.env` and configure the required environment variables:

```bash
# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id
VITE_COGNITO_DOMAIN=your_cognito_domain

# API Endpoints
VITE_EARNINGS_API_URL=your_earnings_api_url
VITE_CONFIG_API_URL=your_config_api_url
VITE_RESEARCH_API_URL=your_research_api_url
```

### Available Scripts

```bash
# Install dependencies
npm install

# Start development server (test mode)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Development Server
The development server runs on `http://localhost:5173` with the following features:
- Hot module replacement
- API proxy configuration for CORS handling
- Environment-specific configurations

## Deployment

### Vercel (Recommended)
The application is optimized for deployment on Vercel:
- Configured with `vercel.json` for SPA routing
- Environment variables managed through Vercel dashboard
- Automatic deployments from Git repository

### Build Optimization
- Code splitting with vendor chunks for optimal loading
- Terser minification for production builds
- Source maps for development debugging
- Chunk size optimization for performance

## Features in Detail

### Real-time Data Flow
1. **WebSocket Connections**: Multiple WebSocket endpoints for different data types
2. **Audio Notifications**: Dedicated audio WebSocket for earnings announcements
3. **Watchlist Filtering**: Notifications filtered by user's personal watchlist
4. **Caching Layer**: Client-side caching with TTL for performance

### Security Features
- AWS Cognito OAuth2/OIDC flows
- JWT token management with automatic refresh
- Secure API endpoints with authentication headers
- Environment-based configuration management

### User Experience
- Responsive design with mobile support
- Dark/light theme support
- Toast notifications for user feedback
- Loading states and error handling
- Intuitive navigation and filtering

---

**Note**: This is an internal application for earnings tracking and financial research. All API endpoints and credentials should be properly secured in production environments.

© 2025 Internal Use Only