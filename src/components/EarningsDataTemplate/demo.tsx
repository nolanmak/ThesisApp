import React from 'react';
import EarningsDataTemplate from './index';

// Demo data - remove this when using in production
const sampleEarningsData = {
  current_quarter_vs_expected: {
    sales: {
      actual: "3.26B",
      expected: "2.22B",
      delta: "+46.95%",
      indicator: "🟢"
    },
    eps: {
      actual: "1.08",
      expected: "0.87",
      delta: "+24.14%",
      indicator: "🟢"
    }
  },
  next_quarter_vs_expected: {
    eps: {
      actual: "1.08",
      low: "1.08",
      high: "1.12",
      expected: "0.94",
      delta: "+14.89%",
      indicator: "🟢"
    }
  },
  historical_growth_qoq: {
    sales_qoq: {
      actual: "-2.97%"
    },
    eps_qoq: {
      actual: "33.33%"
    }
  },
  current_year_vs_expected: {
    eps: {
      actual: "4.40",
      low: "N/A",
      high: "N/A",
      expected: "3.52",
      delta: "+25.00%",
      indicator: "🟢"
    }
  },
  company_highlights: [
    "Strong revenue growth driven by robust client activity.",
    "Improved efficiency led to better-than-expected net income.",
    "Expect continued EPS growth in the next quarter"
  ],
  additional_metrics: [
    "Gross Margin: 73.70%"
  ]
};

const EarningsDataTemplateDemo: React.FC = () => {
  return (
    <EarningsDataTemplate 
      earningsData={sampleEarningsData}
      companyName="Apple Inc."
      ticker="AAPL"
    />
  );
};

export default EarningsDataTemplateDemo;