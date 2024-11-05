import BigNumber from "bignumber.js";
import { format } from "date-fns";
import * as Recharts from "recharts";

import { Side } from "@suilend/sdk/types";

import CartesianGridVerticalLine from "@/components/shared/CartesianGridVerticalLine";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { AppData, useAppContext } from "@/contexts/AppContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import useIsTouchscreen from "@/hooks/useIsTouchscreen";
import {
  ViewBox,
  axis,
  axisLabel,
  getTooltipStyle,
  line,
  tooltip,
} from "@/lib/chart";
import { COINTYPE_COLOR_MAP } from "@/lib/coinType";
import { DAY_S } from "@/lib/events";
import { formatToken } from "@/lib/format";

export type ChartData = {
  timestampS: number;
  [coinType: string]: number;
};

interface TooltipContentProps {
  side: Side;
  coinTypes: string[];
  d: ChartData;
  viewBox?: ViewBox;
  x?: number;
}

function TooltipContent({
  side,
  coinTypes,
  d,
  viewBox,
  x,
}: TooltipContentProps) {
  const appContext = useAppContext();
  const data = appContext.data as AppData;

  if (viewBox === undefined || x === undefined) return null;
  return (
    // Subset of TooltipContent className
    <div
      className="absolute rounded-md border bg-popover px-3 py-1.5 shadow-md"
      style={getTooltipStyle(200, viewBox, x)}
    >
      <div className="flex w-full flex-col gap-2">
        <TLabelSans>
          {format(new Date(d.timestampS * 1000), "MM/dd HH:mm")}
        </TLabelSans>

        <div className="flex w-full flex-col gap-1.5">
          <TBodySans>
            {side === Side.DEPOSIT ? "Interest earned" : "Interest paid"}
          </TBodySans>

          {coinTypes
            .slice()
            .sort((a, b) => d[b] - d[a])
            .map((coinType) => {
              const coinMetadata = data.coinMetadataMap[coinType];

              return (
                <div
                  key={coinType}
                  className="flex w-full flex-row items-center justify-between gap-4"
                >
                  <div className="flex flex-row items-center gap-1.5">
                    <TokenLogo
                      className="h-4 w-4"
                      token={{
                        coinType,
                        symbol: coinMetadata.symbol,
                        iconUrl: coinMetadata.iconUrl,
                      }}
                    />
                    <TLabelSans>{coinMetadata.symbol}</TLabelSans>
                  </div>

                  <TBody style={{ color: COINTYPE_COLOR_MAP[coinType] }}>
                    {formatToken(new BigNumber(d[coinType] as number), {
                      exact: false,
                    })}
                  </TBody>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

interface EarningsChartProps {
  side: Side;
  isLoading: boolean;
  data: ChartData[];
}

export default function EarningsChart({
  side,
  isLoading,
  data,
}: EarningsChartProps) {
  const { md } = useBreakpoint();
  const isTouchscreen = useIsTouchscreen();

  const dayS = 86400;

  // Data
  const coinTypes =
    data.length > 0
      ? Object.keys(data[0]).filter((key) => key !== "timestampS")
      : [];

  const timestampsS = data.map((d) => d.timestampS).flat();
  const cumInterest = data
    .map((d) => coinTypes.map((coinType) => d[coinType]).flat())
    .flat();

  // Min/max
  const minX = Math.min(...timestampsS);
  const maxX = Math.max(...timestampsS);

  const minY = 0;
  const maxY = Math.max(...cumInterest);

  // Ticks
  const ticksX =
    (maxX - minX) / DAY_S < 1
      ? [minX - (minX % 60)]
      : Array.from(
          new Set(
            Array.from({ length: md ? 7 : 5 }).map((_, index, array) => {
              const timestampS =
                minX + ((maxX - minX) / (array.length - 1)) * index;
              return (
                timestampS -
                (timestampS % dayS) +
                new Date().getTimezoneOffset() * 60
              );
            }),
          ),
        );
  const ticksY = Array.from({ length: 4 }).map(
    (_, index, array) => minY + ((maxY - minY) / (array.length - 1)) * index,
  );

  const tickFormatterX = (timestampS: number) =>
    format(new Date(timestampS * 1000), "MM/dd");
  const tickFormatterY = (value: number) =>
    formatToken(new BigNumber(value), { exact: false });

  // Domain
  const domainX = [minX, maxX];
  const domainY = [minY, maxY];

  // Labels
  const labelY = side === Side.DEPOSIT ? "Interest earned" : "Interest paid";

  return (
    <div
      className="earnings-chart h-[160px] w-full shrink-0 transform-gpu md:h-[200px]"
      is-loading={isLoading ? "true" : "false"}
    >
      <Recharts.ResponsiveContainer width="100%" height="100%">
        <Recharts.LineChart
          data={data}
          margin={{ top: 8, right: 16 + 8, bottom: -12, left: 10 + 16 }}
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
          >
            <Recharts.Label
              value={labelY}
              offset={5 - 10}
              position="insideLeft"
              angle={-90}
              style={axisLabel.style}
            />
          </Recharts.YAxis>
          {/* <Recharts.Legend
            formatter={(coinType) => data.coinMetadataMap[coinType].symbol}
          /> */}
          {coinTypes
            .slice()
            .reverse()
            .map((coinType) => (
              <Recharts.Line
                key={coinType}
                type="monotone"
                dataKey={coinType}
                isAnimationActive={false}
                stroke={COINTYPE_COLOR_MAP[coinType]}
                dot={line.dot}
                strokeWidth={line.strokeWidth}
              />
            ))}
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
                    side={side}
                    coinTypes={coinTypes}
                    d={payload[0].payload as ChartData}
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
  );
}
