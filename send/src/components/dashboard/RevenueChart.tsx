import { useState } from "react";

// Mock data for the stacked bar chart
const mockData = [
  {
    date: "Dec 15",
    primary: 2.1,
    secondary: 0.8,
  },
  {
    date: "Dec 16",
    primary: 2.8,
    secondary: 1.2,
  },
  {
    date: "Dec 17",
    primary: 3.5,
    secondary: 1.5,
  },
  {
    date: "Dec 18",
    primary: 4.2,
    secondary: 1.8,
  },
  {
    date: "Dec 19",
    primary: 5.1,
    secondary: 2.1,
  },
  {
    date: "Dec 20",
    primary: 6.2,
    secondary: 2.5,
  },
  {
    date: "Dec 21",
    primary: 7.5,
    secondary: 2.8,
  },
];

const RevenueChart = () => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  
  const chartWidth = 800;
  const chartHeight = 256;
  const margin = { top: 20, right: 30, left: 60, bottom: 40 };
  const width = chartWidth - margin.left - margin.right;
  const height = chartHeight - margin.top - margin.bottom;
  
  const maxValue = Math.max(...mockData.map(d => d.primary + d.secondary));
  const barWidth = width / mockData.length * 0.6;
  const barSpacing = width / mockData.length * 0.4;
  
  const getY = (value: number) => height - (value / maxValue) * height;
  const getX = (index: number) => index * (barWidth + barSpacing) + barSpacing / 2;

  return (
    <div className="w-full h-64 overflow-hidden">
      <svg width={chartWidth} height={chartHeight} className="w-full h-full">
        {/* Grid lines */}
        {[0, 3, 6, 10].map((value, i) => (
          <g key={i}>
            <line
              x1={margin.left}
              y1={margin.top + getY(value)}
              x2={margin.left + width}
              y2={margin.top + getY(value)}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity={0.3}
            />
            <text
              x={margin.left - 10}
              y={margin.top + getY(value) + 4}
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
              fontSize="12"
            >
              ${value}M
            </text>
          </g>
        ))}
        
        {/* Bars */}
        {mockData.map((data, index) => {
          const x = margin.left + getX(index);
          const primaryHeight = (data.primary / maxValue) * height;
          const secondaryHeight = (data.secondary / maxValue) * height;
          const totalHeight = primaryHeight + secondaryHeight;
          
          return (
            <g key={index}>
              {/* Primary bar (bottom) */}
              <rect
                x={x}
                y={margin.top + height - totalHeight}
                width={barWidth}
                height={primaryHeight}
                fill="hsl(var(--secondary))"
                onMouseEnter={() => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
                className="cursor-pointer transition-opacity"
                opacity={hoveredBar === index ? 0.8 : 1}
              />
              
              {/* Secondary bar (top) */}
              <rect
                x={x}
                y={margin.top + height - totalHeight + primaryHeight}
                width={barWidth}
                height={secondaryHeight}
                fill="hsl(var(--primary))"
                onMouseEnter={() => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
                className="cursor-pointer transition-opacity"
                opacity={hoveredBar === index ? 0.8 : 1}
              />
              
              {/* Date labels */}
              <text
                x={x + barWidth / 2}
                y={margin.top + height + 20}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize="12"
              >
                {data.date}
              </text>
              
              {/* Tooltip */}
              {hoveredBar === index && (
                <g>
                  <rect
                    x={x + barWidth / 2 - 40}
                    y={margin.top + height - totalHeight - 40}
                    width={80}
                    height={30}
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                    rx="4"
                    ry="4"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={margin.top + height - totalHeight - 20}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="12"
                  >
                    ${(data.primary + data.secondary).toFixed(1)}M
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RevenueChart; 