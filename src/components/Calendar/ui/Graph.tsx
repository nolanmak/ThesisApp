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

export default function Graph({ ticker = 'AAPL' }: GraphProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const [data, setData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const HEIGHT = '100%';
  const WIDTH = '100%';

  useEffect(() => {
    if (!ticker) return;

    const fetchStockData = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${import.meta.env.VITE_ALPHAVANTAGE_API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();

        const rawData = json['Time Series (Daily)'];
        if (!rawData) throw new Error('Invalid data from Alpha Vantage');

        const formatted = Object.entries(rawData).map(([date, entry]) => {
          const e = entry as Record<string, string>;
          return {
            date,
            open: parseFloat(e['1. open']),
            high: parseFloat(e['2. high']),
            low: parseFloat(e['3. low']),
            close: parseFloat(e['4. close']),
            volume: parseFloat(e['5. volume'])
          };
        });

        setData(formatted.reverse());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stock data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [ticker]);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const dates = data.map(item => item.date);

    const options: echarts.EChartsOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      grid: [
        { left: '10%', right: '10%', top: '5%', height: '60%' }, // price
        { left: '10%', right: '10%', top: '75%', height: '15%' } // volume
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          gridIndex: 0
        },
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          show: false,
          gridIndex: 1
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: { show: true },
          gridIndex: 0
        },
        {
          scale: true,
          splitNumber: 3,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          gridIndex: 1
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          bottom: '12%',
          show: true
        }
      ],
      series: [
        {
          name: 'Stock Price',
          type: 'candlestick',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: data.map(d => [d.open, d.close, d.low, d.high]),
          itemStyle: {
            color: '#ec0000',
            color0: '#00da3c',
            borderColor: '#8A0000',
            borderColor0: '#008F28'
          }
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: data.map(d => ({
            value: d.volume,
            itemStyle: {
              color: d.close >= d.open ? '#00da3c' : '#ec0000'
            }
          }))
        }
      ]
    };

    chartInstance.current.setOption(options);
  }, [data]);

  useEffect(() => {
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => chartInstance.current?.dispose();
  }, []);

  if (!ticker) {
    return (
      <div className="flex items-center justify-center" style={{ height: HEIGHT, width: WIDTH }}>
        <p className="text-gray-500">Enter a ticker symbol to view stock data</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: HEIGHT, width: WIDTH }}>
      {loading && (
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-sm text-gray-600">Loading chart for {ticker}...</p>
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