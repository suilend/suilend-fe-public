import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import { formatUsd } from "@suilend/frontend-sui";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";

import SectionTitle from "@/components/dashboard/account/SectionTitle";
import { TLabelSans } from "@/components/shared/Typography";
import { getWeightedBorrowsColor } from "@/components/shared/UtilizationBar";
import { useLoadedUserContext } from "@/contexts/UserContext";
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
  const userContext = useLoadedUserContext();
  const obligation = userContext.obligation as ParsedObligation;

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
