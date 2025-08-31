import React from 'react';
import './EarningsDataTemplate.css';

interface MetricData {
  actual?: string;
  expected?: string;
  low?: string;
  high?: string;
  delta?: string;
  indicator?: string;
}

interface EarningsData {
  current_quarter_vs_expected?: {
    sales?: MetricData;
    eps?: MetricData;
  };
  next_quarter_vs_expected?: {
    eps?: MetricData;
  };
  historical_growth_qoq?: {
    sales_qoq?: MetricData;
    eps_qoq?: MetricData;
  };
  current_year_vs_expected?: {
    eps?: MetricData;
  };
  company_highlights?: string[];
  additional_metrics?: string[];
}

interface EarningsDataTemplateProps {
  earningsData?: EarningsData;
  companyName?: string;
  ticker?: string;
}

const EarningsDataTemplate: React.FC<EarningsDataTemplateProps> = ({ 
  earningsData = {},
  companyName = "Company Name",
  ticker = "TICKER"
}) => {
  const renderMetricCard = (title: string, metric: MetricData, showRange = false) => (
    <div className="metric-card">
      <h3 className="metric-title">{title}</h3>
      <div className="metric-content">
        <div className="metric-row">
          <span className="metric-label">Actual:</span>
          <span className="metric-value actual">{metric.actual || 'N/A'}</span>
        </div>
        {metric.expected && (
          <div className="metric-row">
            <span className="metric-label">Expected:</span>
            <span className="metric-value expected">{metric.expected}</span>
          </div>
        )}
        {showRange && (metric.low || metric.high) && (
          <div className="metric-row">
            <span className="metric-label">Range:</span>
            <span className="metric-value range">
              {metric.low || 'N/A'} - {metric.high || 'N/A'}
            </span>
          </div>
        )}
        {metric.delta && (
          <div className="metric-row delta-row">
            <span className="metric-label">Delta:</span>
            <div className="delta-container">
              <span className="metric-indicator">{metric.indicator}</span>
              <span className={`metric-delta ${metric.delta.startsWith('+') ? 'positive' : 'negative'}`}>
                {metric.delta}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSimpleMetricCard = (title: string, metric: MetricData) => (
    <div className="metric-card simple">
      <h3 className="metric-title">{title}</h3>
      <div className="metric-content">
        <div className="simple-metric-value">
          {metric.actual || 'N/A'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="earnings-data-container">
      <div className="main-container">
        {/* Header Section */}
        <div className="header-section">
          <div className="logo-section">
            <img 
              src="/Logos/earninginight.png" 
              alt="EarningsInsight Logo" 
              className="logo-image"
            />
          </div>
          <div className="company-info">
            <h1 className="company-name">{companyName}</h1>
            <span className="company-ticker">({ticker})</span>
            <h2 className="page-title">Earnings Analysis</h2>
          </div>
        </div>

        {/* Current Quarter vs Expected */}
        {earningsData.current_quarter_vs_expected && (
          <div className="section">
            <h2 className="section-title">Current Quarter vs Expected</h2>
            <div className="cards-grid">
              {earningsData.current_quarter_vs_expected.sales && 
                renderMetricCard('Sales', earningsData.current_quarter_vs_expected.sales)
              }
              {earningsData.current_quarter_vs_expected.eps && 
                renderMetricCard('EPS', earningsData.current_quarter_vs_expected.eps)
              }
            </div>
          </div>
        )}

        {/* Next Quarter vs Expected */}
        {earningsData.next_quarter_vs_expected && (
          <div className="section">
            <h2 className="section-title">Next Quarter vs Expected</h2>
            <div className="cards-grid">
              {earningsData.next_quarter_vs_expected.eps && 
                renderMetricCard('EPS Guidance', earningsData.next_quarter_vs_expected.eps, true)
              }
            </div>
          </div>
        )}

        {/* Historical Growth QoQ */}
        {earningsData.historical_growth_qoq && (
          <div className="section">
            <h2 className="section-title">Historical Growth (QoQ)</h2>
            <div className="cards-grid">
              {earningsData.historical_growth_qoq.sales_qoq && 
                renderSimpleMetricCard('Sales QoQ', earningsData.historical_growth_qoq.sales_qoq)
              }
              {earningsData.historical_growth_qoq.eps_qoq && 
                renderSimpleMetricCard('EPS QoQ', earningsData.historical_growth_qoq.eps_qoq)
              }
            </div>
          </div>
        )}

        {/* Current Year vs Expected */}
        {earningsData.current_year_vs_expected && (
          <div className="section">
            <h2 className="section-title">Current Year vs Expected</h2>
            <div className="cards-grid">
              {earningsData.current_year_vs_expected.eps && 
                renderMetricCard('Annual EPS', earningsData.current_year_vs_expected.eps, true)
              }
            </div>
          </div>
        )}

        {/* Company Highlights */}
        {earningsData.company_highlights && earningsData.company_highlights.length > 0 && (
          <div className="section">
            <h2 className="section-title">Company Highlights</h2>
            <div className="highlights-card">
              <ul className="highlights-list">
                {earningsData.company_highlights.map((highlight, index) => (
                  <li key={index} className="highlight-item">{highlight}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Additional Metrics */}
        {earningsData.additional_metrics && earningsData.additional_metrics.length > 0 && (
          <div className="section">
            <h2 className="section-title">Additional Metrics</h2>
            <div className="additional-metrics-card">
              <div className="metrics-list">
                {earningsData.additional_metrics.map((metric, index) => (
                  <div key={index} className="additional-metric-item">
                    {metric}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarningsDataTemplate;