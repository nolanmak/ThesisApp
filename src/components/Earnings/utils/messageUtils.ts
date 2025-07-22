// No React import needed for utility functions
import { Message, MetricItem } from '../../../types';

/**
 * Interface for metric data items used in createMetricText
 */
interface MetricDataItem {
  actual?: string;
  low?: string;
  high?: string;
  expected?: string;
  delta?: string;
  indicator?: string;
}

/**
 * Check if a value is not null, undefined, empty or 'N/A'
 */
export const checkItemValNotNull = (value: string | undefined): boolean => {
  return value != null && value != undefined && value !== '' && value !== 'N/A';
};

/**
 * Create formatted metric text from a metric item
 */
export const createMetricText = (item: MetricDataItem, label: string): string | null => {
  const actual = item.actual;
  const low = item.low;
  const high = item.high;
  
  if (checkItemValNotNull(actual) || (checkItemValNotNull(low) && checkItemValNotNull(high))) {
    let text = '';
    if (checkItemValNotNull(low) && checkItemValNotNull(high)) {
      text = `${label}: ${low} - ${high}`;
    } else {
      text = `${label}: ${actual}`;
    }
    
    const expected = item.expected;
    if (checkItemValNotNull(expected)) {
      text += ` vs ${expected}`;
      if (item.delta) {
        text += ` (${item.delta})`;
      }
      if (item.indicator) {
        text += ` ${item.indicator}`;
      }
    }
    return text;
  }
  return null;
};

/**
 * Parse message payload to extract structured metrics data
 */
export const ParseMessagePayload = (message: Message): { [key: string]: MetricItem[] } | null => {
  if (!message.discord_message || message.report_data?.link) return null;

  const metrics: { [key: string]: MetricItem[] } = {};
  
  try {
    const jsonData = JSON.parse(message.discord_message);
    
    if (jsonData.current_quarter_vs_expected) {
      const currentQuarterData = jsonData.current_quarter_vs_expected;
      const currentQuarterMetrics: MetricItem[] = [];
      if (currentQuarterData.sales != null && currentQuarterData.sales != undefined && currentQuarterData.sales != '') {
        const label = 'Sales';
        if (typeof currentQuarterData.sales === 'string') {
          currentQuarterMetrics.push({
            label: label,
            text: currentQuarterData.sales
          });
        } else {
          const currentQuarterSalesData = currentQuarterData.sales;
          const text = createMetricText(currentQuarterSalesData, label);
          if (text) {
            currentQuarterMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      
      if (currentQuarterData.eps != null && currentQuarterData.eps != undefined && currentQuarterData.eps != '' && currentQuarterData.eps != 'N/A') {  
        const label = 'EPS';
        if (typeof currentQuarterData.eps === 'string') {
          currentQuarterMetrics.push({
            label: label,
            text: currentQuarterData.eps
          });
        } else {
          const currentQuarterEPSData = currentQuarterData.eps;
          const text = createMetricText(currentQuarterEPSData, label);
          if (text) {
            currentQuarterMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      if (currentQuarterMetrics.length > 0) {
        metrics["Current Quarter"] = currentQuarterMetrics;
      }
    }

    if (jsonData.next_quarter_vs_expected) {
      const nextQuarterData = jsonData.next_quarter_vs_expected;
      const nextQuarterMetrics: MetricItem[] = [];
      if (nextQuarterData.sales != null && nextQuarterData.sales != undefined && nextQuarterData.sales != '') {
        const label = 'Sales';
        if (typeof nextQuarterData.sales === 'string') {
          nextQuarterMetrics.push({
            label: label,
            text: nextQuarterData.sales
          });
        } else {
          const nextQuarterSalesData = nextQuarterData.sales;
          const text = createMetricText(nextQuarterSalesData, label);
          if (text) {
            nextQuarterMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      
      if (nextQuarterData.eps != null && nextQuarterData.eps != undefined && nextQuarterData.eps != '') {
        const label = 'EPS';
        if (typeof nextQuarterData.eps === 'string') {
          nextQuarterMetrics.push({
            label: label,
            text: nextQuarterData.eps
          });
        } else {
          const nextQuarterEPSData = nextQuarterData.eps;
          const text = createMetricText(nextQuarterEPSData, label);
          if (text) {
            nextQuarterMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      if (nextQuarterMetrics.length > 0) {
        metrics["Next Quarter"] = nextQuarterMetrics;
      }
    }

    if (jsonData.current_year_vs_expected) {
      const currentYearData = jsonData.current_year_vs_expected;
      const currentYearMetrics: MetricItem[] = [];
      if (currentYearData.sales != null && currentYearData.sales != undefined && currentYearData.sales != '') {
        const label = 'Sales';
        if (typeof currentYearData.sales === 'string') {
          currentYearMetrics.push({
            label: label,
            text: currentYearData.sales
          });
        } else {
          const currentYearSalesData = currentYearData.sales;
          const text = createMetricText(currentYearSalesData, label);
          if (text) {
            currentYearMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      
      if (currentYearData.eps != null && currentYearData.eps != undefined && currentYearData.eps != '') {
        const label = 'EPS';
        if (typeof currentYearData.eps === 'string') {
          currentYearMetrics.push({
            label: label,
            text: currentYearData.eps
          });
        } else {
          const currentYearEPSData = currentYearData.eps;
          const text = createMetricText(currentYearEPSData, label);
          if (text) {
            currentYearMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      if (currentYearMetrics.length > 0) {
        metrics["Current Year"] = currentYearMetrics;
      }
    }

    if (jsonData.historical_growth_qoq) {
      const historicalGrowthData = jsonData.historical_growth_qoq;
      const historicalGrowthMetrics: MetricItem[] = [];
      if (historicalGrowthData.sales_qoq != null && historicalGrowthData.sales_qoq != undefined && historicalGrowthData.sales_qoq != '') {
        const label = 'Sales Growth QoQ';
        if (typeof historicalGrowthData.sales_qoq === 'string') {
          historicalGrowthMetrics.push({
            label: label,
            text: historicalGrowthData.sales_qoq,
          });
        } else {
          const historicalGrowthSalesData = historicalGrowthData.sales_qoq;
          const text = createMetricText(historicalGrowthSalesData, label);
          if (text) {
            historicalGrowthMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      if (historicalGrowthData.eps_qoq != null && historicalGrowthData.eps_qoq != undefined && historicalGrowthData.eps_qoq != '') {
        const label = 'EPS Growth QoQ';
        if (typeof historicalGrowthData.eps_qoq === 'string') {
          historicalGrowthMetrics.push({
            label: label,
            text: historicalGrowthData.eps_qoq,
          });
        } else {
          const historicalGrowthEPSData = historicalGrowthData.eps_qoq;
          const text = createMetricText(historicalGrowthEPSData, label);
          if (text) {
            historicalGrowthMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      if (historicalGrowthMetrics.length > 0) {
        metrics["Historical Growth"] = historicalGrowthMetrics;
      }
    }
    if (jsonData.next_year_vs_expected) {
      const nextYearData = jsonData.next_year_vs_expected;
      const nextYearMetrics: MetricItem[] = [];
      if (nextYearData.sales != null && nextYearData.sales != undefined && nextYearData.sales != '') {
        const label = 'Sales';
        if (typeof nextYearData.sales === 'string') {
          nextYearMetrics.push({
            label: label,
            text: nextYearData.sales
          });
        } else {
          const nextYearSalesData = nextYearData.sales;
          const text = createMetricText(nextYearSalesData, label);
          if (text) {
            nextYearMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      
      if (nextYearData.eps != null && nextYearData.eps != undefined && nextYearData.eps != '') {
        const label = 'EPS';
        if (typeof nextYearData.eps === 'string') {
          nextYearMetrics.push({
            label: label,
            text: nextYearData.eps
          });
        } else {
          const nextYearEPSData = nextYearData.eps;
          const text = createMetricText(nextYearEPSData, label);
          if (text) {
            nextYearMetrics.push({
              label: label,
              text: text
            });
          }
        }
      }
      if (nextYearMetrics.length > 0) {
        metrics["Next Year"] = nextYearMetrics;
      }
    }

    if (jsonData.company_highlights) {
      const companyHighlightsData = jsonData.company_highlights;
      if (companyHighlightsData.length > 0) {
        metrics["Company Highlights"] = companyHighlightsData;
      }
    }
    if (jsonData.additional_metrics) {
      const additionalMetricsData = jsonData.additional_metrics;
      if (additionalMetricsData.length > 0) {
        metrics["Additional Metrics"] = additionalMetricsData;
      }
    }
  } catch (error) {
    console.log('Unable to parse metrics for message:', message);
    console.log('Parse error:', error);
    console.log('Raw discord_message:', message.discord_message);
  }
  return metrics;
};