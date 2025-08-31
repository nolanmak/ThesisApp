import React from 'react';
import './ScheduleTemplate.css';
import logoImage from './logo.png';

interface CompanyEntry {
  ticker: string;
  name: string;
  logo?: string;
}

interface DayData {
  beforeOpen: CompanyEntry[];
  afterClose: CompanyEntry[];
}

interface EarningsData {
  Monday: DayData;
  Tuesday: DayData;
  Wednesday: DayData;
  Thursday: DayData;
  Friday: DayData;
}

interface ScheduleTemplateProps {
  earningsData?: EarningsData;
}

const ScheduleTemplate: React.FC<ScheduleTemplateProps> = ({ 
  earningsData = {
    Monday: { beforeOpen: [], afterClose: [] },
    Tuesday: { beforeOpen: [], afterClose: [] },
    Wednesday: { beforeOpen: [], afterClose: [] },
    Thursday: { beforeOpen: [], afterClose: [] },
    Friday: { beforeOpen: [], afterClose: [] }
  }
}) => {
  const renderCompanyEntries = (companies: CompanyEntry[]) => {
    return companies.map((company, index) => (
      <div key={index} className="company-entry">
        {company.logo && (
          <img src={company.logo} alt={`${company.ticker} logo`} className="company-logo" />
        )}
        <div className="company-ticker">{company.ticker}</div>
        <div className="company-name">{company.name}</div>
      </div>
    ));
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="schedule-container">
      <div className="main-container">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo">
            <img 
              src={logoImage} 
              alt="EarningsInsight Logo" 
              className="logo-image"
            />
          </div>
        </div>

        {/* Title Section */}
        <div className="title-section">
          <h1>This Week's Most Anticipated Earnings</h1>
        </div>

        {/* Earnings Schedule Grid */}
        <div className="schedule-grid">
          {days.map((day) => (
            <div key={day} className="day-column">
              <div className="day-header">{day}</div>
              
              <div className="time-slots-container">
                <div className="time-slot before-open">
                  <div className="time-label">Before Open</div>
                  <div className="earnings-list">
                    {renderCompanyEntries(earningsData[day as keyof EarningsData].beforeOpen)}
                  </div>
                </div>

                <div className="time-slot after-close">
                  <div className="time-label">After Close</div>
                  <div className="earnings-list">
                    {renderCompanyEntries(earningsData[day as keyof EarningsData].afterClose)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleTemplate;