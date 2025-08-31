# EarningsDataTemplate - Self-Contained Component

## Overview
This is a fully self-contained earnings data card template that can be exported and used independently in any React project.

## Files Included
```
EarningsDataTemplate/
├── index.tsx                    # Main component
├── EarningsDataTemplate.css     # All styling  
├── logo.png                     # EarningsInsight logo
├── config.ts                    # TypeScript interfaces
├── scriptExample.js             # Implementation examples
├── demo.tsx                     # Demo component
├── blank.tsx                    # Blank component
└── README.md                    # This file
```

## Usage

### Basic Implementation
```jsx
import EarningsDataTemplate from './EarningsDataTemplate';

const earningsConfig = {
  companyName: "Apple Inc.",
  ticker: "AAPL",
  earningsData: {
    current_quarter_vs_expected: {
      sales: { actual: "3.26B", expected: "2.22B", delta: "+46.95%", indicator: "🟢" },
      eps: { actual: "1.08", expected: "0.87", delta: "+24.14%", indicator: "🟢" }
    },
    company_highlights: [
      "Strong revenue growth driven by robust client activity."
    ],
    additional_metrics: ["Gross Margin: 73.70%"]
  }
};

<EarningsDataTemplate 
  companyName={earningsConfig.companyName}
  ticker={earningsConfig.ticker}
  earningsData={earningsConfig.earningsData}
/>
```

### Available Data Sections
- `current_quarter_vs_expected` - Current quarter sales & EPS
- `next_quarter_vs_expected` - Next quarter EPS projections
- `current_year_vs_expected` - Annual EPS projections
- `historical_growth_qoq` - Quarter-over-quarter growth
- `company_highlights` - Key insights (max 4)
- `additional_metrics` - Custom metrics array

## Features
- ✅ Fully self-contained (no external dependencies)
- ✅ Configurable company info and data
- ✅ Automatic section hiding (empty sections don't render)
- ✅ Responsive design
- ✅ Social media ready (900x700px)
- ✅ EarningsInsight branding
- ✅ TypeScript support

## Export Instructions
1. Copy the entire `EarningsDataTemplate/` directory
2. Install in target project: place in `src/components/`
3. Import and use: `import EarningsDataTemplate from './components/EarningsDataTemplate'`

## Dependencies
- React 16.8+ (uses hooks)
- TypeScript (optional, can convert to JavaScript)
- No external libraries required
- All assets included locally

## Script Integration
See `scriptExample.js` for implementation patterns:
- Direct object population
- Conditional rendering
- API data transformation
- Automated indicator assignment

## Customization
- Modify `EarningsDataTemplate.css` for styling
- Replace `logo.png` with your own logo  
- Adjust card dimensions and layout
- Add new data sections as needed