import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import { ParsedObligation } from "@suilend/sdk/parsers/obligation";

import SectionTitle from "@/components/dashboard/account/SectionTitle";
import { TLabelSans } from "@/components/shared/Typography";
import { getWeightedBorrowsColor } from "@/components/shared/UtilizationBar";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatUsd } from "@/lib/format";
import { WEIGHTED_BORROWS_TOOLTIP } from "@/lib/tooltips";

interface WeightedBorrowsTitleProps {
  className?: ClassValue;
  noTooltip?: boolean;
  amount?: BigNumber;
}

export default function WeightedBorrowsTitle({
  className,
  noTooltip,
  amount,
}: WeightedBorrowsTitleProps) {
  const appContext = useLoadedAppContext();
  const obligation = appContext.obligation as ParsedObligation;

  return (
    <SectionTitle
      barSegmentStyle={{
        backgroundColor: `hsl(var(--${getWeightedBorrowsColor(obligation)}))`,
      }}
      labelClassName={className}
      tooltip={!noTooltip ? WEIGHTED_BORROWS_TOOLTIP : undefined}
      labelEndDecorator={amount && <TLabelSans>{formatUsd(amount)}</TLabelSans>}
    >
      Weighted borrows
    </SectionTitle>
  );
}
