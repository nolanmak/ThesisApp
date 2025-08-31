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
        {metric.actual && (
          <div className="metric-row">
            <span className="metric-label">Actual:</span>
            <span className="metric-value actual">{metric.actual}</span>
          </div>
        )}
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

  const getAllMetrics = () => {
    const metrics = [];
    
    // Current Quarter Sales
    if (earningsData.current_quarter_vs_expected?.sales) {
      metrics.push(renderMetricCard('Current Quarter Sales', earningsData.current_quarter_vs_expected.sales));
    }
    
    // Current Quarter EPS
    if (earningsData.current_quarter_vs_expected?.eps) {
      metrics.push(renderMetricCard('Current Quarter EPS', earningsData.current_quarter_vs_expected.eps));
    }
    
    // Next Quarter EPS
    if (earningsData.next_quarter_vs_expected?.eps) {
      metrics.push(renderMetricCard('Next Quarter EPS', earningsData.next_quarter_vs_expected.eps, true));
    }
    
    // Annual EPS
    if (earningsData.current_year_vs_expected?.eps) {
      metrics.push(renderMetricCard('Annual EPS', earningsData.current_year_vs_expected.eps, true));
    }
    
    // Historical Growth QoQ Sales
    if (earningsData.historical_growth_qoq?.sales_qoq) {
      metrics.push(renderSimpleMetricCard('Sales QoQ Growth', earningsData.historical_growth_qoq.sales_qoq));
    }
    
    // Historical Growth QoQ EPS
    if (earningsData.historical_growth_qoq?.eps_qoq) {
      metrics.push(renderSimpleMetricCard('EPS QoQ Growth', earningsData.historical_growth_qoq.eps_qoq));
    }
    
    return metrics;
  };

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

        {/* Content Area - Flexible Grid */}
        <div className="content-area">
          <div className="metrics-grid">
            {getAllMetrics()}
          </div>
          
          {/* Additional sections */}
          {earningsData.company_highlights && earningsData.company_highlights.length > 0 && (
            <div className="highlights-section">
              <h3 className="section-title">Key Highlights</h3>
              <div className="highlights-grid">
                {earningsData.company_highlights.slice(0, 4).map((highlight, index) => (
                  <div key={index} className="highlight-item">
                    <span className="highlight-bullet">•</span>
                    <span className="highlight-text">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {earningsData.additional_metrics && earningsData.additional_metrics.length > 0 && (
            <div className="additional-section">
              <h3 className="section-title">Additional Metrics</h3>
              <div className="additional-grid">
                {earningsData.additional_metrics.map((metric, index) => (
                  <div key={index} className="additional-badge">
                    {metric}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EarningsDataTemplate;