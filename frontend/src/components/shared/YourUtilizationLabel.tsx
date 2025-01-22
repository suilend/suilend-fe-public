import { ParsedObligation } from "@suilend/sdk";

import FromToArrow from "@/components/shared/FromToArrow";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBody } from "@/components/shared/Typography";
import UtilizationBar from "@/components/shared/UtilizationBar";
import { formatPercent } from "@/lib/format";

interface YourUtilizationLabelProps {
  obligation?: ParsedObligation;
  newObligation?: ParsedObligation;
}

export default function YourUtilizationLabel({
  obligation,
  newObligation,
}: YourUtilizationLabelProps) {
  return (
    <LabelWithValue
      labelClassName="my-0.5 shrink-0"
      label="Your utilization"
      customChild={
        !obligation ? (
          <TBody>N/A</TBody>
        ) : (
          <div className="flex flex-row items-center">
            <div className="flex flex-row items-center gap-3">
              <TBody>
                {formatPercent(
                  obligation.weightedConservativeBorrowUtilizationPercent,
                )}
              </TBody>
              <div className="w-[35px] md:w-[60px]">
                <UtilizationBar
                  thresholdClassName="w-0.5"
                  obligation={obligation}
                />
              </div>
            </div>

            {newObligation && (
              <>
                <FromToArrow className="ml-2.5 block" />
                <div className="flex flex-row items-center gap-3">
                  <TBody>
                    {formatPercent(
                      newObligation.weightedConservativeBorrowUtilizationPercent,
                    )}
                  </TBody>
                  <div className="w-[35px] md:w-[60px]">
                    <UtilizationBar
                      thresholdClassName="w-0.5"
                      obligation={newObligation}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )
      }
      horizontal
      value="0"
    />
  );
}
