import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import { ParsedObligation } from "@suilend/sdk";
import { formatUsd } from "@suilend/sui-fe";

import SectionTitle from "@/components/dashboard/account/SectionTitle";
import { TLabelSans } from "@/components/shared/Typography";
import { LIQUIDATION_THRESHOLD_TOOLTIP } from "@/lib/tooltips";

interface LiquidationThresholdTitleProps {
  className?: ClassValue;
  noTooltip?: boolean;
  obligation?: ParsedObligation;
  amount?: BigNumber;
}

export default function LiquidationThresholdTitle({
  className,
  noTooltip,
  obligation,
  amount,
}: LiquidationThresholdTitleProps) {
  return (
    <SectionTitle
      barSegmentClassName="bg-secondary"
      labelClassName={className}
      tooltip={!noTooltip ? LIQUIDATION_THRESHOLD_TOOLTIP : undefined}
      labelEndDecorator={amount && <TLabelSans>{formatUsd(amount)}</TLabelSans>}
    >
      Liq. threshold
    </SectionTitle>
  );
}
