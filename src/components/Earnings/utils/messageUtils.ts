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
 * Extract preview text from transcript analysis messages
 */
export const ParseTranscriptMessage = (message: Message): string | null => {
  if (!message.discord_message || message.source !== 'transcript_analysis') {
    return null;
  }

  // Extract the first line as preview (usually contains the header with emoji and ticker)
  const lines = message.discord_message.split('\n');
  const firstLine = lines[0]?.trim();
  
  if (firstLine && firstLine.length > 0) {
    return firstLine;
  }
  
  return null;
};

/**
 * Parse transcript data into human-readable format
 */
export const ParseTranscriptData = (message: Message): { [key: string]: MetricItem[] } | null => {
  if (!message.transcript_data || message.source !== 'transcript_analysis') {
    return null;
  }

  const sections: { [key: string]: MetricItem[] } = {};

  try {
    // Parse transcript_data if it's a string, otherwise use as object
    const data = typeof message.transcript_data === 'string' 
      ? JSON.parse(message.transcript_data)
      : message.transcript_data;

    // Management Confidence Indicators
    if (data.management_confidence_indicators && Array.isArray(data.management_confidence_indicators)) {
      const items = data.management_confidence_indicators.filter((text: string) => text && text.length > 0);
      if (items.length > 0) {
        sections["Management Confidence"] = items;
      }
    }

    // Company Provided Commentary
    if (data.company_provided_commentary && Array.isArray(data.company_provided_commentary)) {
      const items = data.company_provided_commentary.filter((text: string) => text && text.length > 0);
      if (items.length > 0) {
        sections["Company Commentary"] = items;
      }
    }

    // Competitive Positioning Sentiment
    if (data.competitive_positioning_sentiment && Array.isArray(data.competitive_positioning_sentiment)) {
      const items = data.competitive_positioning_sentiment.filter((text: string) => text && text.length > 0);
      if (items.length > 0) {
        sections["Competitive Position"] = items;
      }
    }

    // Demand Environment Commentary
    if (data.demand_environment_commentary && Array.isArray(data.demand_environment_commentary)) {
      const items = data.demand_environment_commentary.filter((text: string) => text && text.length > 0);
      if (items.length > 0) {
        sections["Demand Environment"] = items;
      }
    }

    // Forward Looking Statements
    if (data.forward_looking_statements && Array.isArray(data.forward_looking_statements)) {
      const items = data.forward_looking_statements.filter((text: string) => text && text.length > 0);
      if (items.length > 0) {
        sections["Forward Outlook"] = items;
      }
    }

    // Business Outlook Commentary
    if (data.business_outlook_commentary && Array.isArray(data.business_outlook_commentary)) {
      const items = data.business_outlook_commentary.filter((text: string) => text && text.length > 0);
      if (items.length > 0) {
        sections["Business Outlook"] = items;
      }
    }

    // Current Quarter Metrics
    if (data.current_quarter && Array.isArray(data.current_quarter)) {
      const metrics: MetricItem[] = [];
      data.current_quarter.forEach((item: any) => {
        if (item && typeof item === 'object') {
          const label = item.metric_label || 'Metric';
          const value = item.metric_value || item.raw_text;
          const unit = item.metric_unit;
          
          if (value) {
            let text = `${label}: ${value}`;
            if (unit && unit !== '' && unit !== null) {
              text += ` ${unit}`;
            }
            metrics.push({ label, text });
          }
        }
      });
      if (metrics.length > 0) {
        sections["Current Quarter Metrics"] = metrics;
      }
    }

    // Current Year Metrics
    if (data.current_year && Array.isArray(data.current_year)) {
      const metrics: MetricItem[] = [];
      data.current_year.forEach((item: any) => {
        if (item && typeof item === 'object') {
          const label = item.metric_label || 'Metric';
          const value = item.metric_value || item.raw_text;
          const unit = item.metric_unit;
          
          if (value) {
            let text = `${label}: ${value}`;
            if (unit && unit !== '' && unit !== null) {
              text += ` ${unit}`;
            }
            metrics.push({ label, text });
          }
        }
      });
      if (metrics.length > 0) {
        sections["Current Year Metrics"] = metrics;
      }
    }

  } catch (error) {
    return null;
  }

  return Object.keys(sections).length > 0 ? sections : null;
};

/**
 * Extract preview text from sentiment analysis messages
 */
export const ParseSentimentMessage = (message: Message): string | null => {
  if (!message.discord_message || (message.source !== 'sentiment_analysis' && !message.sentiment_additional_metrics)) {
    return null;
  }

  return message.discord_message;
};

/**
 * Parse sentiment additional metrics into human-readable format
 */
export const ParseSentimentData = (message: Message): { [key: string]: MetricItem[] } | null => {
  if (!message.sentiment_additional_metrics) {
    return null;
  }

  const sections: { [key: string]: MetricItem[] } = {};

  try {
    // Parse sentiment_additional_metrics if it's a string, otherwise use as object
    const data = typeof message.sentiment_additional_metrics === 'string' 
      ? JSON.parse(message.sentiment_additional_metrics)
      : message.sentiment_additional_metrics;

    console.log('Parsing sentiment data for', message.ticker, ':', data);

    // Sentiment Analysis
    if (data.sentiment_analysis?.M) {
      const sentiment = data.sentiment_analysis.M;
      const sentimentItems: MetricItem[] = [];
      
      if (sentiment.overall_sentiment?.S) {
        sentimentItems.push({ label: "Overall Sentiment", text: sentiment.overall_sentiment.S });
      }
      if (sentiment.management_tone?.S) {
        sentimentItems.push({ label: "Management Tone", text: sentiment.management_tone.S });
      }
      if (sentiment.forward_outlook_sentiment?.S) {
        sentimentItems.push({ label: "Forward Outlook", text: sentiment.forward_outlook_sentiment.S });
      }
      if (sentiment.confidence_level?.S) {
        sentimentItems.push({ label: "Confidence Level", text: sentiment.confidence_level.S });
      }
      
      if (sentimentItems.length > 0) {
        sections["Sentiment Analysis"] = sentimentItems;
      }

      // Key Sentiment Drivers
      if (sentiment.key_sentiment_drivers?.L) {
        const drivers = sentiment.key_sentiment_drivers.L
          .map((item: any) => item.S)
          .filter((text: string) => text && text.length > 0);
        if (drivers.length > 0) {
          sections["Key Sentiment Drivers"] = drivers;
        }
      }
    }

    // Management Guidance
    if (data.management_guidance?.L) {
      const guidance: MetricItem[] = [];
      data.management_guidance.L.forEach((item: any) => {
        if (item.M) {
          const guide = item.M;
          const type = guide.guidance_type?.S;
          const statement = guide.guidance_statement?.S;
          const timeHorizon = guide.time_horizon?.S;
          const confidence = guide.confidence_indicator?.S;
          
          if (type && statement) {
            let text = `${type}: ${statement}`;
            if (timeHorizon) {
              text += ` (${timeHorizon})`;
            }
            if (confidence) {
              text += ` - ${confidence}`;
            }
            guidance.push({ label: type, text });
          }
        }
      });
      if (guidance.length > 0) {
        sections["Management Guidance"] = guidance;
      }
    }

    // Risk Factors
    if (data.risk_factors?.L) {
      const risks: MetricItem[] = [];
      data.risk_factors.L.forEach((item: any) => {
        if (item.M) {
          const risk = item.M;
          const category = risk.risk_category?.S;
          const description = risk.risk_description?.S;
          const impact = risk.potential_impact?.S;
          
          if (category && description) {
            let text = `${description}`;
            if (impact) {
              text += ` Impact: ${impact}`;
            }
            risks.push({ label: category, text });
          }
        }
      });
      if (risks.length > 0) {
        sections["Risk Factors"] = risks;
      }
    }

    // Swing Trader Metrics
    if (data.swing_trader_metrics?.L) {
      const metrics: MetricItem[] = [];
      data.swing_trader_metrics.L.forEach((item: any) => {
        if (item.M) {
          const metric = item.M;
          const label = metric.metric_label?.S || 'Metric';
          const rawText = metric.raw_text?.S;
          const timePeriod = metric.time_period?.S;
          
          if (rawText) {
            let text = rawText;
            if (timePeriod) {
              text += ` (${timePeriod})`;
            }
            metrics.push({ label, text });
          }
        }
      });
      if (metrics.length > 0) {
        sections["Key Metrics"] = metrics;
      }
    }

    // Key Quotes
    if (data.key_quotes?.L) {
      const quotes = data.key_quotes.L
        .map((item: any) => item.S)
        .filter((text: string) => text && text.length > 0);
      if (quotes.length > 0) {
        sections["Key Quotes"] = quotes;
      }
    }

  } catch (error) {
    return null;
  }

  return Object.keys(sections).length > 0 ? sections : null;
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
  } catch {
    // Just silently fail for now - we'll log these in a batch elsewhere if needed
  }
  return metrics;
};