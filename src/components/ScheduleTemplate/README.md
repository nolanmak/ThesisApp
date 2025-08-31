# ScheduleTemplate - Self-Contained Component

## Overview
This is a fully self-contained earnings schedule template component that can be exported and used independently in any React project.

## Files Included
```
ScheduleTemplate/
├── index.tsx                 # Main component
├── ScheduleTemplate.css      # All styling
├── logo.png                  # EarningsInsight logo
└── README.md                 # This file
```

## Usage

### Basic Implementation
```jsx
import ScheduleTemplate from './ScheduleTemplate';

// Blank template
<ScheduleTemplate />

// With data
<ScheduleTemplate earningsData={scheduleData} />
```

### Data Structure
```javascript
const scheduleData = {
  Monday: {
    beforeOpen: [
      { ticker: 'AAPL', name: 'Apple Inc.', logo: '/path/to/logo.png' }
    ],
    afterClose: [
      { ticker: 'GOOGL', name: 'Alphabet Inc.' }
    ]
  },
  Tuesday: { beforeOpen: [], afterClose: [] },
  // ... other days
};
```

## Features
- ✅ Fully self-contained (no external dependencies)
- ✅ Responsive design
- ✅ EarningsInsight branding
- ✅ Configurable data population
- ✅ Automatic empty state handling
- ✅ Social media ready (1200x800px)

## Export Instructions
1. Copy the entire `ScheduleTemplate/` directory
2. Install in target project: place in `src/components/`
3. Import and use: `import ScheduleTemplate from './components/ScheduleTemplate'`

## Dependencies
- React 16.8+ (uses hooks)
- No external libraries required
- All assets included locally

## Customization
- Modify `ScheduleTemplate.css` for styling changes
- Replace `logo.png` with your own logo
- Adjust grid layout in CSS for different layouts