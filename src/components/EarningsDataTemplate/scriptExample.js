// Example script showing how to populate the EarningsDataTemplate
// Copy and modify this for your automation script

// Method 1: Full configuration object
const populateEarningsCard = (companyData) => {
  const earningsConfig = {
    companyName: companyData.name || "Company Name",
    ticker: companyData.symbol || "TICKER",
    earningsData: {}
  };

  // Conditionally add current quarter data if available
  if (companyData.currentQuarter) {
    earningsConfig.earningsData.current_quarter_vs_expected = {};
    
    // Add sales data if exists
    if (companyData.currentQuarter.sales) {
      earningsConfig.earningsData.current_quarter_vs_expected.sales = {
        actual: companyData.currentQuarter.sales.actual,
        expected: companyData.currentQuarter.sales.expected,
        delta: companyData.currentQuarter.sales.delta,
        indicator: companyData.currentQuarter.sales.delta?.startsWith('+') ? '🟢' : '🔴'
      };
    }
    
    // Add EPS data if exists
    if (companyData.currentQuarter.eps) {
      earningsConfig.earningsData.current_quarter_vs_expected.eps = {
        actual: companyData.currentQuarter.eps.actual,
        expected: companyData.currentQuarter.eps.expected,
        delta: companyData.currentQuarter.eps.delta,
        indicator: companyData.currentQuarter.eps.delta?.startsWith('+') ? '🟢' : '🔴'
      };
    }
  }

  // Conditionally add next quarter data if available
  if (companyData.nextQuarter?.eps) {
    earningsConfig.earningsData.next_quarter_vs_expected = {
      eps: {
        actual: companyData.nextQuarter.eps.actual,
        expected: companyData.nextQuarter.eps.expected,
        low: companyData.nextQuarter.eps.low,
        high: companyData.nextQuarter.eps.high,
        delta: companyData.nextQuarter.eps.delta,
        indicator: companyData.nextQuarter.eps.delta?.startsWith('+') ? '🟢' : '🔴'
      }
    };
  }

  // Conditionally add annual data if available
  if (companyData.annual?.eps) {
    earningsConfig.earningsData.current_year_vs_expected = {
      eps: {
        actual: companyData.annual.eps.actual,
        expected: companyData.annual.eps.expected,
        low: companyData.annual.eps.low,
        high: companyData.annual.eps.high,
        delta: companyData.annual.eps.delta,
        indicator: companyData.annual.eps.delta?.startsWith('+') ? '🟢' : '🔴'
      }
    };
  }

  // Conditionally add growth data if available
  if (companyData.growth) {
    earningsConfig.earningsData.historical_growth_qoq = {};
    
    if (companyData.growth.salesQoQ) {
      earningsConfig.earningsData.historical_growth_qoq.sales_qoq = {
        actual: companyData.growth.salesQoQ
      };
    }
    
    if (companyData.growth.epsQoQ) {
      earningsConfig.earningsData.historical_growth_qoq.eps_qoq = {
        actual: companyData.growth.epsQoQ
      };
    }
  }

  // Conditionally add highlights if available
  if (companyData.highlights && companyData.highlights.length > 0) {
    earningsConfig.earningsData.company_highlights = companyData.highlights.slice(0, 4);
  }

  // Conditionally add additional metrics if available
  if (companyData.additionalMetrics && companyData.additionalMetrics.length > 0) {
    earningsConfig.earningsData.additional_metrics = companyData.additionalMetrics;
  }

  return earningsConfig;
};

// Method 2: Direct object construction (simpler approach)
const createEarningsConfigSimple = (data) => {
  return {
    companyName: data.companyName,
    ticker: data.ticker,
    earningsData: {
      // Only include sections that have data
      ...(data.currentQuarterSales && {
        current_quarter_vs_expected: {
          ...(data.currentQuarterSales && { sales: data.currentQuarterSales }),
          ...(data.currentQuarterEps && { eps: data.currentQuarterEps })
        }
      }),
      
      ...(data.nextQuarterEps && {
        next_quarter_vs_expected: {
          eps: data.nextQuarterEps
        }
      }),
      
      ...(data.annualEps && {
        current_year_vs_expected: {
          eps: data.annualEps
        }
      }),
      
      ...(data.growthData && {
        historical_growth_qoq: data.growthData
      }),
      
      ...(data.highlights && { company_highlights: data.highlights }),
      ...(data.additionalMetrics && { additional_metrics: data.additionalMetrics })
    }
  };
};

// Example usage:
const exampleCompanyData = {
  name: "Apple Inc.",
  symbol: "AAPL",
  currentQuarter: {
    sales: {
      actual: "3.26B",
      expected: "2.22B",
      delta: "+46.95%"
    },
    eps: {
      actual: "1.08",
      expected: "0.87",
      delta: "+24.14%"
    }
  },
  nextQuarter: {
    eps: {
      actual: "1.08",
      low: "1.08",
      high: "1.12",
      expected: "0.94",
      delta: "+14.89%"
    }
  },
  highlights: [
    "Strong revenue growth driven by robust client activity.",
    "Improved efficiency led to better-than-expected net income."
  ],
  additionalMetrics: [
    "Gross Margin: 73.70%"
  ]
};

// Generate the configuration
const config = populateEarningsCard(exampleCompanyData);

// Then pass this config to your React component:
// <EarningsDataTemplate 
//   companyName={config.companyName}
//   ticker={config.ticker}
//   earningsData={config.earningsData}
// />

export { populateEarningsCard, createEarningsConfigSimple };