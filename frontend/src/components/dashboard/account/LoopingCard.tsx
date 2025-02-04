import { useState } from "react";

import BigNumber from "bignumber.js";
import { Pause, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { formatList } from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";

import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import Card from "@/components/dashboard/Card";
import LoopedPosition from "@/components/layout/LoopedPosition";
import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  IS_LOOPING_MESSAGE,
  WAS_LOOPING_MESSAGE,
  getIsLooping,
  getLoopedAssetCoinTypes,
  getWasLooping,
  getZeroSharePositions,
} from "@/lib/looping";

export default function LoopingCard() {
  const { address } = useWalletContext();
  const { data, refresh, obligation, obligationOwnerCap } =
    useLoadedAppContext();
  const { withdraw, borrow } = useActionsModalContext();

  const loopedAssetCoinTypes = getLoopedAssetCoinTypes(data, obligation);
  const isLooping = getIsLooping(data, obligation);

  const { deposits: zeroShareDeposits, borrows: zeroShareBorrows } =
    getZeroSharePositions(obligation);
  const wasLooping = getWasLooping(data, obligation);

  // Restore eligibility
  const [isRestoringEligibility, setIsRestoringEligibility] =
    useState<boolean>(false);

  const restoreEligibility = async () => {
    if (!address) throw Error("Wallet not connected");
    if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

    if (isRestoringEligibility) return;
    setIsRestoringEligibility(true);

    try {
      for (const d of zeroShareDeposits) await withdraw(d.coinType, "1");
      for (const b of zeroShareBorrows) await borrow(b.coinType, "1");

      toast.success("Restored eligibility");
    } catch (err) {
      toast.error("Failed to restore eligibility", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      setIsRestoringEligibility(false);
      await refresh();
    }
  };

  if (isLooping)
    return (
      <Card
        className="border-warning/25 bg-warning/10"
        headerProps={{
          titleClassName: "text-warning",
          titleIcon: <TriangleAlert />,
          title: "Looping detected",
          noSeparator: true,
        }}
      >
        <CardContent className="flex flex-col gap-4">
          <TBodySans className="text-xs">{IS_LOOPING_MESSAGE}</TBodySans>

          <div className="flex flex-col gap-2">
            {loopedAssetCoinTypes.map((coinTypes) => (
              <LoopedPosition key={coinTypes.join(".")} coinTypes={coinTypes} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  if (wasLooping)
    return (
      <Card
        className="border-warning/25 bg-warning/10"
        headerProps={{
          titleClassName: "text-warning",
          titleIcon: <Pause />,
          title: "Rewards Paused",
          noSeparator: true,
        }}
      >
        <CardContent className="flex flex-col gap-4">
          <TBodySans className="text-xs">{WAS_LOOPING_MESSAGE}</TBodySans>

          <Button
            className="w-[185px] bg-foreground hover:bg-foreground/75"
            variant="secondary"
            labelClassName="uppercase"
            onClick={restoreEligibility}
            disabled={isRestoringEligibility}
          >
            {isRestoringEligibility ? (
              <Spinner size="sm" />
            ) : (
              "Restore eligibility"
            )}
          </Button>

          <div className="flex w-full flex-col gap-2">
            {zeroShareDeposits.length > 0 && (
              <TLabelSans className="text-foreground/50">
                Withdraws{" "}
                {formatList(
                  zeroShareDeposits.map(
                    (d) =>
                      `${new BigNumber(10)
                        .pow(-d.reserve.mintDecimals)
                        .toFixed(d.reserve.mintDecimals)} ${d.reserve.symbol}`,
                  ),
                )}
              </TLabelSans>
            )}
            {zeroShareBorrows.length > 0 && (
              <TLabelSans className="text-foreground/50">
                Borrows{" "}
                {formatList(
                  zeroShareBorrows.map(
                    (b) =>
                      `${new BigNumber(10)
                        .pow(-b.reserve.mintDecimals)
                        .toFixed(b.reserve.mintDecimals)} ${b.reserve.symbol}`,
                  ),
                )}
              </TLabelSans>
            )}
          </div>
        </CardContent>
      </Card>
    );
}
