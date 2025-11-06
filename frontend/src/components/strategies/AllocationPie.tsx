import BigNumber from "bignumber.js";

import { formatPercent, formatToken } from "@suilend/sui-fe";

import { ParsedVault } from "@/fetchers/parseVault";
import { LENDING_MARKET_METADATA_MAP } from "@/fetchers/useFetchAppData";

import Tooltip from "../shared/Tooltip";
import { TBody, TLabelSans } from "../shared/Typography";

const ALLOCATION_SEGMENT_COLORS = ["#457AE4", "#60A5FA", "#93C5FD", "#1D4ED8"];

interface AllocationPieProps {
  vault: ParsedVault;
  size?: number; // px
  strokeWidth?: number; // px slice thickness
}

type AllocationSegment = {
  name: string;
  percent: BigNumber;
  color: string | undefined;
  tvlAmount: BigNumber;
  apr: BigNumber | undefined;
};

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export default function AllocationPie({
  vault,
  size = 160,
  strokeWidth = 20,
}: AllocationPieProps) {
  const totalTvl = vault.tvl;
  const allocationSegments = (
    vault.obligations.map((obligation, index) => ({
      name: LENDING_MARKET_METADATA_MAP[obligation.lendingMarketId].name,
      percent: obligation.deployedAmountToken.div(totalTvl).times(100),
      color:
        ALLOCATION_SEGMENT_COLORS[index % ALLOCATION_SEGMENT_COLORS.length],
      tvlAmount: obligation.deployedAmountToken,
      apr: obligation.apr,
    })) as AllocationSegment[]
  ).concat({
    name: "Undeployed",
    percent: vault.undeployedAmount.div(totalTvl).times(100),
    color: undefined,
    tvlAmount: vault.undeployedAmount,
    apr: undefined,
  });

  const filtered = allocationSegments.filter((seg) => !seg.percent.isNaN());

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  // Build cumulative angles
  let currentAngle = 0;
  const slices = filtered.map((seg) => {
    const sweep = Math.max(0, Math.min(360, seg.percent.toNumber() * 3.6));
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;
    return { seg, startAngle, endAngle };
  });

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-row items-start gap-4">
        <div style={{ width: size, height: size, position: "relative" }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Base ring */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {slices.map(({ seg, startAngle, endAngle }, idx) => {
              const path = describeArc(cx, cy, r, startAngle, endAngle);
              return (
                <path
                  key={idx}
                  d={path}
                  fill="none"
                  stroke={seg.color ?? "#E5E7EB"}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                />
              );
            })}
          </svg>

          {/* Tooltip triggers at centroids */}
          {slices.map(({ seg, startAngle, endAngle }, idx) => {
            const mid = (startAngle + endAngle) / 2;
            const { x, y } = polarToCartesian(cx, cy, r, mid);
            return (
              <Tooltip
                key={`tip-${idx}`}
                content={
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-row items-center justify-between gap-4">
                      <TBody>{seg.name}</TBody>
                    </div>
                    <div className="flex flex-row items-center justify-between gap-4">
                      <TLabelSans>Allocation</TLabelSans>
                      <TBody>{formatPercent(seg.percent, { dp: 0 })}</TBody>
                    </div>
                    <div className="flex flex-row items-center justify-between gap-4">
                      <TLabelSans>Deposited</TLabelSans>
                      <TBody>
                        {formatToken(seg.tvlAmount)}{" "}
                        {vault.baseCoinMetadata?.symbol}
                      </TBody>
                    </div>
                    {seg.apr && (
                      <div className="flex flex-row items-center justify-between gap-4">
                        <TLabelSans>APR</TLabelSans>
                        <TBody>{formatPercent(seg.apr, { dp: 0 })}</TBody>
                      </div>
                    )}
                  </div>
                }
              >
                <div
                  style={{
                    position: "absolute",
                    left: x - 8,
                    top: y - 8,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                />
              </Tooltip>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {filtered.map((seg, idx) => (
            <div key={`legend-${idx}`} className="flex justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: seg.color ?? "#9CA3AF" }}
                />
                <TBody className="flex-1 truncate">
                  {seg.name}{" "}
                  {seg.apr && (
                    <TLabelSans>
                      {formatPercent(seg.apr, { dp: 2 })} APR
                    </TLabelSans>
                  )}
                </TBody>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <TLabelSans>{formatPercent(seg.percent, { dp: 0 })}</TLabelSans>
                <TLabelSans>
                  {formatToken(seg.tvlAmount)} {vault.baseCoinMetadata?.symbol}
                </TLabelSans>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
