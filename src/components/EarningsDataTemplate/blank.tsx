import React from 'react';
import EarningsDataTemplate from './index';
import { blankEarningsConfig } from './config';

// Blank template - no data populated
const EarningsDataTemplateBlank: React.FC = () => {
  return (
    <EarningsDataTemplate 
      earningsData={blankEarningsConfig.earningsData}
      companyName={blankEarningsConfig.companyName}
      ticker={blankEarningsConfig.ticker}
    />
  );
};

export default EarningsDataTemplateBlank;