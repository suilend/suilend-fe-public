import BigNumber from "bignumber.js";
import * as Recharts from "recharts";

import { linearlyInterpolate } from "@suilend/sdk/utils";

import AprRewardsBreakdownRow from "@/components/dashboard/AprRewardsBreakdownRow";
import CartesianGridVerticalLine from "@/components/shared/CartesianGridVerticalLine";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import useIsTouchscreen from "@/hooks/useIsTouchscreen";
import {
  ViewBox,
  axis,
  axisLabel,
  getTooltipStyle,
  line,
  tooltip,
} from "@/lib/chart";
import { formatPercent } from "@/lib/format";

const transform = (value: number) => Math.pow(value, 1 / 2);
const inverseTransform = (value: number) => Math.pow(value, 2);

type ChartData = {
  utilPercent: number;
  aprPercent: number;
};

type TransformedChartData = ChartData & {
  transformedAprPercent: number;
};

interface TooltipContentProps {
  d: ChartData;
  viewBox?: ViewBox;
  x?: number;
}

function TooltipContent({ d, viewBox, x }: TooltipContentProps) {
  if (viewBox === undefined || x === undefined) return null;
  return (
    // Subset of TooltipContent className
    <div
      className="absolute rounded-md border bg-popover px-3 py-1.5 shadow-md"
      style={getTooltipStyle(200, viewBox, x)}
    >
      <div className="flex w-full flex-col gap-2">
        <TBodySans>
          Borrow APR
          <span className="text-xs text-muted-foreground">
            {" at "}
            {formatPercent(new BigNumber(d.utilPercent), { dp: 0 })} util.
          </span>
        </TBodySans>

        <AprRewardsBreakdownRow
          isLast
          value={
            <span className="text-success">
              {formatPercent(new BigNumber(d.aprPercent))}
            </span>
          }
        >
          <TLabelSans>Interest</TLabelSans>
        </AprRewardsBreakdownRow>
      </div>
    </div>
  );
}

interface AprLineChartProps {
  data: ChartData[];
  reference?: ChartData;
}

export default function AprLineChart({ data, reference }: AprLineChartProps) {
  const isTouchscreen = useIsTouchscreen();

  // Data
  const interpolatedData: TransformedChartData[] = Array.from({
    length: 101,
  }).map((_, utilPercent) => ({
    utilPercent,
    aprPercent: +linearlyInterpolate(
      data,
      "utilPercent",
      "aprPercent",
      utilPercent,
    ),
    transformedAprPercent: +linearlyInterpolate(
      data.map((d) => ({
        ...d,
        aprPercent: transform(d.aprPercent),
      })),
      "utilPercent",
      "aprPercent",
      utilPercent,
    ),
  }));

  // Min/max
  const minX = Math.min(...interpolatedData.map((d) => d.utilPercent));
  const maxX = Math.max(...interpolatedData.map((d) => d.utilPercent));

  const minY = 0;
  const maxY = Math.max(
    ...interpolatedData.map((d) => d.transformedAprPercent),
  );

  // Ticks
  const ticksX = Array.from({ length: 5 }).map(
    (_, index, array) => minX + (maxX - minX) * (index / (array.length - 1)),
  );

  const tickFormatterX = (utilPercent: number) =>
    formatPercent(new BigNumber(utilPercent), { dp: 0 });
  const tickFormatterY = (transformedAprPercent: number) =>
    formatPercent(new BigNumber(inverseTransform(transformedAprPercent)), {
      dp: 0,
    });

  // Domain
  const domainX = [minX, maxX];
  const domainY = [minY, maxY];

  return (
    <div className="-mx-4 flex flex-col">
      <div className="w-full px-4">
        <TLabelSans style={{ paddingLeft: 40 }}>
          Borrow APR vs. utilization
        </TLabelSans>
      </div>

      <div
        className="apr-line-chart h-[140px] w-full shrink-0 transform-gpu md:h-[160px]"
        is-loading="false"
      >
        <Recharts.ResponsiveContainer width="100%" height="100%">
          <Recharts.LineChart
            data={interpolatedData}
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
              dataKey="utilPercent"
              ticks={ticksX}
              tickMargin={axis.tickMargin}
              tick={axis.tick}
              axisLine={axis.axisLine}
              tickLine={axis.tickLine}
              tickFormatter={tickFormatterX}
              domain={domainX}
            >
              <Recharts.Label
                value="Utilization"
                offset={-4}
                position="insideBottom"
                style={axisLabel.style}
              />
            </Recharts.XAxis>
            <Recharts.YAxis
              type="number"
              tickMargin={axis.tickMargin}
              tick={axis.tick}
              axisLine={axis.axisLine}
              tickLine={axis.tickLine}
              tickFormatter={tickFormatterY}
              domain={domainY}
            />
            <Recharts.Line
              dataKey="transformedAprPercent"
              isAnimationActive={false}
              stroke="hsl(var(--success))"
              dot={line.dot}
              strokeWidth={line.strokeWidth}
            />
            {reference && (
              <Recharts.ReferenceDot
                x={reference.utilPercent}
                y={
                  +linearlyInterpolate(
                    interpolatedData,
                    "utilPercent",
                    "transformedAprPercent",
                    reference.utilPercent,
                  )
                }
                fill="hsl(var(--foreground))"
                strokeWidth={0}
                r={4}
              />
            )}
            {data.length > 0 && (
              <Recharts.Tooltip
                isAnimationActive={false}
                filterNull={false}
                cursor={tooltip.cursor}
                trigger={isTouchscreen ? "hover" : "hover"}
                wrapperStyle={tooltip.wrapperStyle}
                content={({ active, payload, viewBox, coordinate }) => {
                  if (!active || !payload?.[0]?.payload) return null;
                  return (
                    <TooltipContent
                      d={payload[0].payload as TransformedChartData}
                      viewBox={viewBox as any}
                      x={coordinate?.x}
                    />
                  );
                }}
              />
            )}
          </Recharts.LineChart>
        </Recharts.ResponsiveContainer>
      </div>
    </div>
  );
}
