import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface StockData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

interface GraphProps {
  ticker: string;
  isMobile?: boolean;
}

export default function Graph({ ticker = 'AAPL', isMobile = false }: GraphProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [data, setData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const height = '100%';
  const width = '100%';

  const fetchStockData = async (ticker: string) => {
    if (!ticker) {
      setError('Please enter a ticker symbol');
      return [];
    }

    setLoading(true);
    setError(null);
    
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${import.meta.env.VITE_ALPHAVANTAGE_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      const rawData = json['Time Series (Daily)'];
      if (!rawData) {
        throw new Error('Invalid data from Alpha Vantage');
      }
    
      const formatted = Object.entries(rawData).map(([date, entry]) => ({
        date,
        open: parseFloat((entry as Record<string, string>)['1. open']),
        high: parseFloat((entry as Record<string, string>)['2. high']),
        low: parseFloat((entry as Record<string, string>)['3. low']),
        close: parseFloat((entry as Record<string, string>)['4. close']),
        volume: parseFloat((entry as Record<string, string>)['5. volume'])
      }));
    
      return formatted.reverse(); // Oldest to newest
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock data');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticker) {
      console.log('ticker', ticker);
      fetchStockData(ticker).then(setData);
    }
  }, [ticker]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      grid: [
        {
          left: '10%',
          right: '10%',
          top: '5%',
          height: '60%'       // candlestick chart
        },
        {
          left: '10%',
          right: '10%',
          top: '75%',         // volume chart starts directly below the first
          height: '15%'       // leaves just 5% at the bottom for the slider
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: data.map(item => item.date),
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          splitNumber: 20,
          gridIndex: 0
        },
        {
          type: 'category',
          gridIndex: 1,
          data: data.map(item => item.date),
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          splitNumber: 20,
          show: false  // Hide the x-axis labels for volume
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: true
          },
          gridIndex: 0
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 3,
          axisLabel: { show: false },  // Hide the y-axis labels for volume
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],  // Control both charts
          start: 0,
          end: 100
        },
        {
          show: true,
          type: 'slider',
          xAxisIndex: [0, 1],  // Control both charts
          bottom: '12%',
        }
      ],
      series: [
        {
          name: 'Stock Price',
          type: 'candlestick',
          data: data.map(item => [
            item.open,
            item.close,
            item.low,
            item.high
          ]),
          itemStyle: {
            color: '#ec0000',
            color0: '#00da3c',
            borderColor: '#8A0000',
            borderColor0: '#008F28'
          },
          xAxisIndex: 0,
          yAxisIndex: 0
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: data.map(item => ({
            value: item.volume,
            itemStyle: {
              color: item.close >= item.open ? '#00da3c' : '#ec0000'  // Green for up, red for down
            }
          }))
        }
      ]
    };

    chartInstance.current.setOption(option);
  }, [data]);

  // Resize chart on window resize
  useEffect(() => {
    const resize = () => chartInstance.current?.resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => chartInstance.current?.dispose();
  }, []);

  if (!ticker) {
    return (
      <div className="flex items-center justify-center" style={{ height, width }}>
        <p className="text-gray-500">Enter a ticker symbol to view stock data</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height, width }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <p>Loading chart for {ticker}...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      <div
        ref={chartRef}
        style={{
          height: '100%',
          width: '100%',
          minHeight: '300px',
          display: loading || error ? 'none' : 'block'
        }}
      />
    </div>
  );
}