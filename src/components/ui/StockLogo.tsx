import React, { useState, useEffect } from 'react';
import { getStockLogo } from '../../services/api';

interface StockLogoProps {
  ticker: string;
  size?: number;
  className?: string;
}

const StockLogo: React.FC<StockLogoProps> = ({ 
  ticker, 
  size = 24, 
  className = '' 
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        setLoading(true);
        setError(false);
        const url = await getStockLogo(ticker);
        setLogoUrl(url);
      } catch (err) {
        console.error(`Failed to load logo for ${ticker}:`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (ticker) {
      fetchLogo();
    }
  }, [ticker]);

  if (loading || error || !logoUrl) {
    return null;
  }

  return (
    <img
      src={logoUrl}
      alt={`${ticker} logo`}
      width={size}
      height={size}
      className={`inline-block rounded-sm ${className}`}
      style={{ minWidth: size, minHeight: size }}
      onError={() => {
        setError(true);
        setLogoUrl(null);
      }}
    />
  );
};

export default StockLogo;