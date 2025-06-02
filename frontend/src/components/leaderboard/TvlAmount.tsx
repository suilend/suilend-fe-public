import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import { formatUsd } from "@suilend/sui-fe";

import { TBody } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TvlAmountProps {
  labelClassName?: ClassValue;
  amount?: BigNumber;
}

export default function TvlAmount({ labelClassName, amount }: TvlAmountProps) {
  return (
    <div className="flex w-max flex-row items-center gap-1.5">
      {amount === undefined ? (
        <Skeleton className="h-5 w-10" />
      ) : amount.eq(-1) ? (
        <TBody className={cn(labelClassName)}>N/A</TBody>
      ) : (
        <TBody className={cn(labelClassName)}>
          {formatUsd(amount, { exact: true })}
        </TBody>
      )}
    </div>
  );
}
