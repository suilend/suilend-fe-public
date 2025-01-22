import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import SectionTitle from "@/components/dashboard/account/SectionTitle";
import { TLabelSans } from "@/components/shared/Typography";
import { formatUsd } from "@/lib/format";
import { LIQUIDATION_THRESHOLD_TOOLTIP } from "@/lib/tooltips";

interface LiquidationThresholdTitleProps {
  className?: ClassValue;
  noTooltip?: boolean;
  amount?: BigNumber;
}

export default function LiquidationThresholdTitle({
  className,
  noTooltip,
  amount,
}: LiquidationThresholdTitleProps) {
  return (
    <SectionTitle
      barSegmentClassName="bg-secondary"
      labelClassName={className}
      tooltip={!noTooltip ? LIQUIDATION_THRESHOLD_TOOLTIP : undefined}
      labelEndDecorator={amount && <TLabelSans>{formatUsd(amount)}</TLabelSans>}
    >
      Liquidation threshold
    </SectionTitle>
  );
}
