# EarningsInsight Card Configuration Guide

## Overview
The EarningsDataTemplate component is fully configurable via JavaScript objects. Only populate the data sections you have - empty/undefined sections will not render.

## Usage

### Basic Implementation
```javascript
import EarningsDataTemplate from './components/EarningsDataTemplate';

// Your configuration object
const earningsConfig = {
  companyName: "Apple Inc.",
  ticker: "AAPL", 
  earningsData: {
    // Only include sections you have data for
  }
};

// Render the component
<EarningsDataTemplate 
  companyName={earningsConfig.companyName}
  ticker={earningsConfig.ticker}
  earningsData={earningsConfig.earningsData}
/>
```

## Data Structure

### Company Info (Required)
```javascript
{
  companyName: "Apple Inc.",  // Company full name
  ticker: "AAPL"              // Stock ticker symbol
}
```

### Earnings Data Sections (All Optional)

#### 1. Current Quarter vs Expected
```javascript
earningsData: {
  current_quarter_vs_expected: {
    sales: {
      actual: "3.26B",
      expected: "2.22B", 
      delta: "+46.95%",
      indicator: "🟢"      // Green circle emoji for positive, 🔴 for negative
    },
    eps: {
      actual: "1.08",
      expected: "0.87",
      delta: "+24.14%", 
      indicator: "🟢"
    }
  }
}
```

#### 2. Next Quarter Projections
```javascript
earningsData: {
  next_quarter_vs_expected: {
    eps: {
      actual: "1.08",
      expected: "0.94",
      low: "1.08",           // Range low (optional)
      high: "1.12",          // Range high (optional)
      delta: "+14.89%",
      indicator: "🟢"
    }
  }
}
```

#### 3. Annual Projections
```javascript
earningsData: {
  current_year_vs_expected: {
    eps: {
      actual: "4.40",
      expected: "3.52", 
      low: "4.35",           // Optional
      high: "4.50",          // Optional
      delta: "+25.00%",
      indicator: "🟢"
    }
  }
}
```

#### 4. Historical Growth (QoQ)
```javascript
earningsData: {
  historical_growth_qoq: {
    sales_qoq: {
      actual: "-2.97%"       // Just the percentage
    },
    eps_qoq: {
      actual: "33.33%"
    }
  }
}
```

#### 5. Company Highlights
```javascript
earningsData: {
  company_highlights: [
    "Strong revenue growth driven by robust client activity.",
    "Improved efficiency led to better-than-expected net income.",
    "Expect continued EPS growth in the next quarter"
    // Limit to 4 highlights for optimal display
  ]
}
```

#### 6. Additional Metrics
```javascript
earningsData: {
  additional_metrics: [
    "Gross Margin: 73.70%",
    "P/E Ratio: 28.5",
    "Market Cap: $2.8T"
    // Any custom metrics as strings
  ]
}
```

## Conditional Rendering Examples

### Minimal Configuration (Only Current Quarter EPS)
```javascript
const minimalConfig = {
  companyName: "Tesla Inc.",
  ticker: "TSLA",
  earningsData: {
    current_quarter_vs_expected: {
      eps: {
        actual: "2.05",
        expected: "1.85",
        delta: "+10.81%",
        indicator: "🟢"
      }
    }
  }
};
```

### Partial Configuration (No Growth Data)
```javascript
const partialConfig = {
  companyName: "Microsoft Corp.",
  ticker: "MSFT", 
  earningsData: {
    current_quarter_vs_expected: {
      sales: { actual: "56.2B", expected: "55.1B", delta: "+2.0%", indicator: "🟢" },
      eps: { actual: "2.93", expected: "2.85", delta: "+2.8%", indicator: "🟢" }
    },
    company_highlights: [
      "Cloud revenue growth accelerated",
      "Strong performance in productivity segment"
    ],
    additional_metrics: ["Cloud Revenue: $25.7B"]
  }
};
```

## Script Integration

### Method 1: Direct Object Population
```javascript
function createEarningsConfig(apiData) {
  const config = {
    companyName: apiData.company_name,
    ticker: apiData.symbol,
    earningsData: {}
  };

  // Only add sections if data exists
  if (apiData.current_quarter) {
    config.earningsData.current_quarter_vs_expected = {};
    
    if (apiData.current_quarter.sales) {
      config.earningsData.current_quarter_vs_expected.sales = {
        actual: apiData.current_quarter.sales.actual,
        expected: apiData.current_quarter.sales.expected,
        delta: apiData.current_quarter.sales.delta,
        indicator: apiData.current_quarter.sales.delta?.startsWith('+') ? '🟢' : '🔴'
      };
    }
  }

  // Add other sections conditionally...
  return config;
}
```

### Method 2: Template Filling
```javascript
function populateEarningsTemplate(companyData) {
  return {
    companyName: companyData.name,
    ticker: companyData.ticker,
    earningsData: {
      ...(companyData.currentQuarter && {
        current_quarter_vs_expected: companyData.currentQuarter
      }),
      ...(companyData.nextQuarter && {
        next_quarter_vs_expected: companyData.nextQuarter  
      }),
      ...(companyData.highlights && {
        company_highlights: companyData.highlights
      })
    }
  };
}
```

## Routes Available

- **`/EarningsDataTemplate`** - Blank template (no data)
- **`/EarningsDataDemo`** - Demo with sample data

## Key Features

✅ **Automatic hiding** - Sections without data don't render  
✅ **Flexible layout** - Grid adapts to available metrics  
✅ **No scrollbars** - Everything fits within card boundaries  
✅ **Responsive** - Works on all screen sizes  
✅ **Brand consistent** - EarningsInsight logo and colors  

## Tips

1. **Delta indicators**: Use 🟢 for positive, 🔴 for negative, ⚪ for neutral
2. **Highlights limit**: Keep to 4 or fewer for optimal display  
3. **Number formatting**: Include units (B, M, %) in the strings
4. **Empty data**: Set sections to `undefined` or `null` to hide them
5. **Performance**: Only populate sections you need - reduces render time