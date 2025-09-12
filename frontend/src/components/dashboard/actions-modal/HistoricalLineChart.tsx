import { format } from "date-fns";
import * as Recharts from "recharts";
import { ContentType } from "recharts/types/component/Tooltip";

import useIsTouchscreen from "@suilend/sui-fe-next/hooks/useIsTouchscreen";

import CartesianGridVerticalLine from "@/components/shared/CartesianGridVerticalLine";
import useBreakpoint from "@/hooks/useBreakpoint";
import { axis, line, tooltip } from "@/lib/chart";
import { DAY_S } from "@/lib/events";

export type ChartData = {
  timestampS: number;
  [field: string]: number | undefined;
};

interface HistoricalLineChartProps {
  data: ChartData[];
  tickFormatterY: (value: number) => string;
  fields: string[];
  fieldStackIdMap: Record<string, string>;
  getFieldColor: (field: string) => string;
  tooltipContent: ContentType<any, any>;
}

export default function HistoricalLineChart({
  data,
  tickFormatterY,
  fields,
  fieldStackIdMap,
  getFieldColor,
  tooltipContent,
}: HistoricalLineChartProps) {
  const { sm } = useBreakpoint();
  const isTouchscreen = useIsTouchscreen();

  const sampleIntervalS =
    data.length > 1 ? data[1].timestampS - data[0].timestampS : 1;
  const samplesPerDay = DAY_S / sampleIntervalS;
  const days = data.length / samplesPerDay;

  // Min/max
  const minX = data.length > 0 ? Math.min(...data.map((d) => d.timestampS)) : 0;
  const maxX = data.length > 0 ? Math.max(...data.map((d) => d.timestampS)) : 0;

  const stackData: number[][] = [];
  for (const stackId of Array.from(new Set(Object.values(fieldStackIdMap)))) {
    if (stackId === "0") continue; // Not shown in chart

    const stackFields = fields.filter(
      (field) => fieldStackIdMap[field] === stackId,
    );

    for (let i = 0; i < stackFields.length; i++) {
      stackData.push(
        data.map((d) =>
          stackFields
            .slice(0, i + 1)
            .reduce((acc: number, field) => acc + (d[field] ?? 0), 0),
        ),
      );
    }
  }

  let minY = Math.min(0, ...stackData.reduce((acc, d) => [...acc, ...d], []));
  let maxY = Math.max(0, ...stackData.reduce((acc, d) => [...acc, ...d], []));

  const range = maxY - minY;
  if (minY < 0) minY -= range * 0.1;
  if (maxY > 0) maxY += range * 0.1;

  // Ticks
  const ticksX =
    data.length > 0
      ? data
          .filter((d) => {
            if (days === 1)
              return d.timestampS % ((sm ? 4 : 8) * 60 * 60) === 0;
            if (days === 7) return d.timestampS % ((sm ? 1 : 2) * DAY_S) === 0;
            if (days === 30)
              return d.timestampS % ((sm ? 5 : 10) * DAY_S) === 0;
            return false;
          })
          .map((d) => {
            if (days === 1) return d.timestampS;
            return d.timestampS + new Date().getTimezoneOffset() * 60;
          })
      : [];
  const ticksY =
    data.length > 0
      ? Array.from({ length: 4 }).map(
          (_, index, array) =>
            minY + ((maxY - minY) / (array.length - 1)) * index,
        )
      : [];

  const tickFormatterX = (timestampS: number) => {
    if (days === 1) return format(new Date(timestampS * 1000), "HH:mm");
    return format(new Date(timestampS * 1000), "MM/dd");
  };

  // Domain
  const domainX = data.length > 0 ? [minX, maxX] : undefined;
  const domainY = data.length > 0 ? [minY, maxY] : undefined;

  return (
    <Recharts.ResponsiveContainer width="100%" height="100%">
      <Recharts.AreaChart
        data={data}
        margin={{
          top: 8,
          right: 16 + 8,
          bottom: -30 + 2 + 16,
          left: -60 + (16 + 40),
        }}
      >
        <Recharts.CartesianGrid
          strokeDasharray="1 4"
          stroke="hsla(var(--secondary) / 20%)"
          fill="transparent"
          horizontal={false}
          vertical={(props) => <CartesianGridVerticalLine {...props} />}
        />
        <Recharts.XAxis
          type="number"
          dataKey="timestampS"
          ticks={ticksX}
          tickMargin={axis.tickMargin}
          tick={axis.tick}
          axisLine={axis.axisLine}
          tickLine={axis.tickLine}
          tickFormatter={tickFormatterX}
          domain={domainX}
        />
        <Recharts.YAxis
          type="number"
          ticks={ticksY}
          tickMargin={axis.tickMargin}
          tick={axis.tick}
          axisLine={axis.axisLine}
          tickLine={axis.tickLine}
          tickFormatter={tickFormatterY}
          domain={domainY}
        />
        {fields
          .filter((field) => fieldStackIdMap[field] !== "0")
          .map((field) => {
            const color = getFieldColor(field);

            return (
              <Recharts.Area
                key={field}
                type="monotone"
                stackId={fieldStackIdMap[field]}
                dataKey={field}
                isAnimationActive={false}
                stroke={color}
                fill={color}
                fillOpacity={0.1}
                dot={line.dot}
                strokeWidth={line.strokeWidth}
              />
            );
          })}
        {data.length > 0 && (
          <Recharts.Tooltip
            isAnimationActive={false}
            filterNull={false}
            cursor={tooltip.cursor}
            trigger={isTouchscreen ? "hover" : "hover"}
            wrapperStyle={tooltip.wrapperStyle}
            content={tooltipContent}
          />
        )}
      </Recharts.AreaChart>
    </Recharts.ResponsiveContainer>
  );
}
