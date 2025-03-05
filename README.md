# Earnings Manager

A comprehensive dashboard for tracking, configuring, and analyzing company earnings announcements.

## Overview

Earnings Manager is an internal tool designed to streamline the process of tracking company earnings announcements. It provides a centralized interface for configuring data extraction settings, managing earnings calendars, viewing historical metrics, and processing earnings-related messages.

## Features

- **Company Configuration**: Create and manage configuration settings for company earnings data extraction, including:
  - Browser selection and page content selectors
  - URL filtering and keyword verification
  - Custom LLM instructions for data processing
  - Polling configurations

- **Messages Dashboard**: View and process earnings-related messages with filtering capabilities.

- **Earnings Calendar**: Track upcoming and past earnings announcements with detailed information.

- **Historical Metrics**: Access and analyze historical financial metrics for tracked companies.

## Technical Details

- Built with React 18 and TypeScript
- Uses React Router for navigation
- Form handling with React Hook Form
- UI notifications with React Toastify
- Modern UI with Tailwind CSS
- Vite-powered build system

## Project Structure

- `/src`: Source code
  - `/components`: React components
  - `/services`: API and cache services
  - `/types`: TypeScript type definitions
- `/server`: Backend services
- `/public`: Static assets

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The application is configured for deployment on Vercel with appropriate configuration in `vercel.json`.

---

## Earnings Manager Front End

Allows users to manage earnings announcements they want to track and create workflow configs for scraping that information.

© 2025 Internal Use Only