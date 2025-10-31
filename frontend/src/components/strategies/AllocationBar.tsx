import { formatPercent, formatToken } from "@suilend/sui-fe";

import { ParsedVault } from "@/fetchers/parseVault";
import { LENDING_MARKET_METADATA_MAP } from "@/fetchers/useFetchAppData";
import { cn } from "@/lib/utils";

import Tooltip from "../shared/Tooltip";
import { TBody, TLabelSans } from "../shared/Typography";

const ALLOCATION_SEGMENT_COLORS = ["#457AE4", "#60A5FA", "#93C5FD", "#1D4ED8"];

interface AllocationBarProps {
  vault: ParsedVault;
}

type AllocationSegment = {
  name: string;
  percent: BigNumber;
  color: string | undefined;
  tvlAmount: BigNumber;
  apr: BigNumber | undefined;
};

function AllocationBar({ vault }: AllocationBarProps) {
  const totalTvl = vault.tvl;
  const allocationSegments = (
    vault.obligations.map((obligation, index) => ({
      name: LENDING_MARKET_METADATA_MAP[obligation.lendingMarketId].name,
      percent: obligation.deployedAmount.div(totalTvl).times(100),
      color:
        ALLOCATION_SEGMENT_COLORS[index % ALLOCATION_SEGMENT_COLORS.length],
      tvlAmount: obligation.deployedAmount,
      apr: obligation.apr,
    })) as AllocationSegment[]
  ).concat({
    name: "Undeployed",
    percent: vault.undeployedAmount.div(totalTvl).times(100),
    color: undefined,
    tvlAmount: vault.undeployedAmount,
    apr: undefined,
  });

  return (
    <div className="h-[16px] w-full">
      <div className="flex h-full w-full flex-row">
        {allocationSegments
          .filter((seg) => !seg.percent.isNaN())
          .map((seg) => (
            <Tooltip
              key={seg.name}
              content={
                <div className="flex flex-col gap-1">
                  <div
                    key={seg.name}
                    className="flex flex-row items-center justify-between gap-4"
                  >
                    <TBody>{seg.name}</TBody>
                  </div>
                  <div
                    key={seg.name}
                    className="flex flex-row items-center justify-between gap-4"
                  >
                    <TLabelSans>Allocation</TLabelSans>
                    <TBody>{seg.percent.toNumber()}%</TBody>
                  </div>
                  <div
                    key={seg.name}
                    className="flex flex-row items-center justify-between gap-4"
                  >
                    <TLabelSans>Deposited</TLabelSans>
                    <TBody>
                      {formatToken(seg.tvlAmount)}{" "}
                      {vault.baseCoinMetadata?.symbol}
                    </TBody>
                  </div>
                  {seg.apr && (
                    <div
                      key={seg.name}
                      className="flex flex-row items-center justify-between gap-4"
                    >
                      <TLabelSans>APR</TLabelSans>
                      <TBody>{formatPercent(seg.apr, { dp: 0 })}</TBody>
                    </div>
                  )}
                </div>
              }
            >
              <div
                key={seg.name}
                className={cn(
                  "hover:scale(1.1) flex h-full cursor-pointer items-center justify-center overflow-hidden bg-muted/20 transition-all duration-300 hover:scale-105",
                )}
                style={{ width: `${seg.percent}%`, backgroundColor: seg.color }}
              >
                <TBody className="overflow-hidden text-ellipsis whitespace-nowrap px-2 text-center text-[9px]">
                  {seg.name}{" "}
                  {seg.percent
                    ? ` (${formatPercent(seg.percent, { dp: 0 })})`
                    : ""}
                </TBody>
              </div>
            </Tooltip>
          ))}
      </div>
    </div>
  );
}

export default AllocationBar;
