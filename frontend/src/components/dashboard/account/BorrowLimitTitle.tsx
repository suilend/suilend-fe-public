import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
import { formatUsd } from "@suilend/sui-fe";

import SectionTitle from "@/components/dashboard/account/SectionTitle";
import { TLabelSans } from "@/components/shared/Typography";
import { BORROW_LIMIT_TOOLTIP } from "@/lib/tooltips";

interface BorrowLimitTitleProps {
  className?: ClassValue;
  noTooltip?: boolean;
  obligation?: ParsedObligation;
  amount?: BigNumber;
}

export default function BorrowLimitTitle({
  className,
  noTooltip,
  obligation,
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
