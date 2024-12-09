import { PropsWithChildren } from "react";

import BigNumber from "bignumber.js";
import { formatDate } from "date-fns";
import * as Recharts from "recharts";
import { CartesianViewBox } from "recharts/types/util/types";

import { NORMALIZED_BETA_mSEND_COINTYPE } from "@suilend/frontend-sui";

import { useLoadedSendContext } from "@/contexts/SendContext";
import { formatToken } from "@/lib/format";

interface LabelProps extends Recharts.LabelProps, PropsWithChildren {
  fill: string;
}

export function Label({ fill, children, ...props }: LabelProps) {
  return (
    <text
      offset={props.offset}
      x={(props.viewBox as CartesianViewBox).x}
      y={10}
      fontSize={12}
      fontFamily="var(--font-mono)"
      fill={fill}
    >
      <tspan text-anchor="middle">{children}</tspan>
    </text>
  );
}

type ChartData = {
  timestampS: number;
  penaltySui: number;
};

export default function PenaltyLineChart() {
  const { mSendObjectMap } = useLoadedSendContext();

  const mSendObject = mSendObjectMap[NORMALIZED_BETA_mSEND_COINTYPE]; // TODO

  // Data
  const n = 1; // 1 + (n - 1) + 1 + (n - 1) + 1 = 2n + 1 points
  const diffS = mSendObject.penaltyEndTimeS.minus(
    mSendObject.penaltyStartTimeS,
  );
  const diffPenaltySui = mSendObject.endPenaltySui.minus(
    mSendObject.startPenaltySui,
  );

  const data: ChartData[] = [];
  data.push({
    timestampS: +mSendObject.penaltyStartTimeS.plus(diffS.div(n).times(0)),
    penaltySui: +mSendObject.startPenaltySui.plus(
      diffPenaltySui.div(n).times(0),
    ),
  });
  for (let i = 1; i < n; i++) {
    data.push({
      timestampS: +mSendObject.penaltyStartTimeS.plus(diffS.div(n).times(i)),
      penaltySui: +mSendObject.startPenaltySui.plus(
        diffPenaltySui.div(n).times(i),
      ),
    });
  }
  data.push({
    timestampS: +mSendObject.penaltyEndTimeS,
    penaltySui: +mSendObject.endPenaltySui,
  });
  for (let i = 1; i < n; i++) {
    data.push({
      timestampS: +mSendObject.penaltyEndTimeS.plus(diffS.div(n).times(i)),
      penaltySui: +mSendObject.endPenaltySui,
    });
  }
  data.push({
    timestampS: +mSendObject.penaltyEndTimeS.plus(diffS.div(n).times(n)),
    penaltySui: +mSendObject.endPenaltySui,
  });

  // Min/max
  const minX = Math.min(...data.map((d) => d.timestampS));
  const maxX = Math.max(...data.map((d) => d.timestampS));

  const minY = 0;
  const maxY = Math.max(...data.map((d) => d.penaltySui));

  // Ticks
  const ticksX = Array.from({ length: 5 }).map(
    (_, index, array) => minX + ((maxX - minX) / (array.length - 1)) * index,
  );
  const ticksY = Array.from({ length: 5 }).map(
    (_, index, array) => minY + ((maxY - minY) / (array.length - 1)) * index,
  );

  const tickFormatterX = (timestampS: number) =>
    formatDate(new Date(timestampS * 1000), "MMM yy").toUpperCase();
  const tickFormatterY = (penaltySui: number) =>
    `${penaltySui === 0 ? "0" : formatToken(new BigNumber(penaltySui), { dp: 1 })} SUI`;

  // Domain
  const domainX = [minX, maxX];
  const domainY = [minY, maxY];

  return (
    <div className="-mr-[16px] h-[200px] shrink-0 transform-gpu md:-mr-[24px]">
      <Recharts.ResponsiveContainer width="100%" height="100%">
        <Recharts.ComposedChart
          data={data}
          margin={{
            top: 8 + 14,
            right: 24,
            bottom: -30 + 8 + 20,
            left: -60 + 16 + 64,
          }}
        >
          <Recharts.CartesianGrid
            stroke="hsla(var(--muted) / 25%)"
            strokeDasharray="1 4"
            fill="transparent"
            horizontal
            vertical={false}
          />
          <Recharts.XAxis
            type="number"
            dataKey="timestampS"
            ticks={ticksX}
            tickMargin={16}
            tick={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              fill: "hsl(var(--muted-foreground))",
            }}
            axisLine={{
              stroke: "transparent",
            }}
            tickLine={{
              stroke: "transparent",
            }}
            tickSize={0}
            tickFormatter={tickFormatterX}
            domain={domainX}
          />
          <Recharts.YAxis
            type="number"
            ticks={ticksY}
            tickMargin={16}
            tick={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              fill: "hsl(var(--muted-foreground))",
            }}
            axisLine={{
              stroke: "transparent",
            }}
            tickLine={{
              stroke: "transparent",
            }}
            tickSize={0}
            tickFormatter={tickFormatterY}
            domain={domainY}
          />

          <Recharts.ReferenceArea
            x1={+mSendObject.penaltyEndTimeS}
            x2={data[data.length - 1].timestampS}
            y1={minY}
            y2={maxY}
            fill="#7CE3CB"
            fillOpacity={0.15}
            stroke="transparent"
            strokeWidth={2}
          />
          <Recharts.Line
            dataKey="penaltySui"
            isAnimationActive={false}
            stroke="#FF0088"
            strokeDasharray="6 6"
            strokeWidth={2}
            dot={{
              stroke: "transparent",
              strokeWidth: 0,
              fill: "transparent",
            }}
          />

          <Recharts.ReferenceLine
            x={+mSendObject.penaltyEndTimeS}
            stroke="#7CE3CB"
            strokeWidth={2}
            label={(props) => (
              <Label fill="#7CE3CB" {...props}>
                NO PENALTY
              </Label>
            )}
          />
          {Date.now() / 1000 < +mSendObject.penaltyEndTimeS && (
            <Recharts.ReferenceLine
              x={Date.now() / 1000}
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              label={(props) => (
                <Label fill="hsl(var(--foreground))" {...props}>
                  NOW
                </Label>
              )}
            />
          )}
        </Recharts.ComposedChart>
      </Recharts.ResponsiveContainer>
    </div>
  );
}
