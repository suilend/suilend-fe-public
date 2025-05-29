import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import { formatUsd } from "@suilend/sui-fe";

import SectionTitle from "@/components/dashboard/account/SectionTitle";
import { TLabelSans } from "@/components/shared/Typography";
import { BORROW_LIMIT_TOOLTIP } from "@/lib/tooltips";

interface BorrowLimitTitleProps {
  className?: ClassValue;
  noTooltip?: boolean;
  amount?: BigNumber;
}

export default function BorrowLimitTitle({
  className,
  noTooltip,
  amount,
}: BorrowLimitTitleProps) {
  return (
    <SectionTitle
      barSegmentClassName="bg-primary"
      labelClassName={className}
      tooltip={!noTooltip ? BORROW_LIMIT_TOOLTIP : undefined}
      labelEndDecorator={amount && <TLabelSans>{formatUsd(amount)}</TLabelSans>}
    >
      Borrow limit
    </SectionTitle>
  );
}
