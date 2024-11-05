import { ClassValue } from "clsx";

import { ParsedObligation } from "@suilend/sdk/parsers/obligation";

import SectionTitle from "@/components/dashboard/account/SectionTitle";
import { getWeightedBorrowsColor } from "@/components/dashboard/UtilizationBar";
import { useAppContext } from "@/contexts/AppContext";
import { WEIGHTED_BORROWS_TOOLTIP } from "@/lib/tooltips";

interface WeightedBorrowsTitleProps {
  labelClassName?: ClassValue;
  noTooltip?: boolean;
}

export default function WeightedBorrowsTitle({
  labelClassName,
  noTooltip,
}: WeightedBorrowsTitleProps) {
  const appContext = useAppContext();
  const obligation = appContext.obligation as ParsedObligation;

  return (
    <SectionTitle
      barSegmentStyle={{
        backgroundColor: `hsl(var(--${getWeightedBorrowsColor(obligation)}))`,
      }}
      labelClassName={labelClassName}
      tooltip={!noTooltip ? WEIGHTED_BORROWS_TOOLTIP : undefined}
    >
      Weighted borrows
    </SectionTitle>
  );
}
