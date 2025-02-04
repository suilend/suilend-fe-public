import { formatUsd } from "@suilend/frontend-sui";
import { ParsedObligation } from "@suilend/sdk";

import FromToArrow from "@/components/shared/FromToArrow";
import LabelWithValue from "@/components/shared/LabelWithValue";

interface YourBorrowLimitlabelProps {
  obligation?: ParsedObligation;
  newObligation?: ParsedObligation;
}

export default function YourBorrowLimitlabel({
  obligation,
  newObligation,
}: YourBorrowLimitlabelProps) {
  return (
    <LabelWithValue
      label="Your borrow limit"
      value={
        !obligation ? (
          "N/A"
        ) : newObligation ? (
          <>
            {formatUsd(obligation.minPriceBorrowLimitUsd)}
            <FromToArrow />
            {formatUsd(newObligation.minPriceBorrowLimitUsd)}
          </>
        ) : (
          formatUsd(obligation.minPriceBorrowLimitUsd)
        )
      }
      horizontal
    />
  );
}
