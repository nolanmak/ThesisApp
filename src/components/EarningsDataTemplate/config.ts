// Configuration template for EarningsDataTemplate
// Copy this structure and populate with your data

export interface EarningsConfig {
  // Company Information
  companyName: string;
  ticker: string;
  
  // Earnings Data - set any section to null/undefined to hide it
  earningsData: {
    // Current Quarter Metrics
    current_quarter_vs_expected?: {
      sales?: {
        actual?: string;
        expected?: string;
        delta?: string;
        indicator?: string; // emoji like "🟢" or "🔴"
      };
      eps?: {
        actual?: string;
        expected?: string;
        delta?: string;
        indicator?: string;
      };
    };
    
    // Next Quarter Projections
    next_quarter_vs_expected?: {
      eps?: {
        actual?: string;
        expected?: string;
        low?: string;      // Range low
        high?: string;     // Range high
        delta?: string;
        indicator?: string;
      };
    };
    
    // Annual Projections
    current_year_vs_expected?: {
      eps?: {
        actual?: string;
        expected?: string;
        low?: string;
        high?: string;
        delta?: string;
        indicator?: string;
      };
    };
    
    // Historical Growth
    historical_growth_qoq?: {
      sales_qoq?: {
        actual?: string;
      };
      eps_qoq?: {
        actual?: string;
      };
    };
    
    // Additional Information (optional)
    company_highlights?: string[];       // Array of strings, max 4 recommended
    additional_metrics?: string[];       // Array of strings like "Gross Margin: 73.70%"
  };
}

// Example blank configuration - copy and modify this
export const blankEarningsConfig: EarningsConfig = {
  companyName: "Company Name",
  ticker: "TICKER",
  earningsData: {
    // Uncomment and populate the sections you need:
    
    // current_quarter_vs_expected: {
    //   sales: {
    //     actual: "3.26B",
    //     expected: "2.22B",
    //     delta: "+46.95%",
    //     indicator: "🟢"
    //   },
    //   eps: {
    //     actual: "1.08",
    //     expected: "0.87",
    //     delta: "+24.14%",
    //     indicator: "🟢"
    //   }
    // },
    
    // next_quarter_vs_expected: {
    //   eps: {
    //     actual: "1.08",
    //     low: "1.08",
    //     high: "1.12",
    //     expected: "0.94",
    //     delta: "+14.89%",
    //     indicator: "🟢"
    //   }
    // },
    
    // current_year_vs_expected: {
    //   eps: {
    //     actual: "4.40",
    //     expected: "3.52",
    //     delta: "+25.00%",
    //     indicator: "🟢"
    //   }
    // },
    
    // historical_growth_qoq: {
    //   sales_qoq: {
    //     actual: "-2.97%"
    //   },
    //   eps_qoq: {
    //     actual: "33.33%"
    //   }
    // },
    
    // company_highlights: [
    //   "Strong revenue growth driven by robust client activity.",
    //   "Improved efficiency led to better-than-expected net income.",
    //   "Expect continued EPS growth in the next quarter"
    // ],
    
    // additional_metrics: [
    //   "Gross Margin: 73.70%",
    //   "P/E Ratio: 28.5",
    //   "Market Cap: $2.8T"
    // ]
  }
};