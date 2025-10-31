// NOTE: Just for Main market

import { useState } from "react";

import BigNumber from "bignumber.js";
import { Pause, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { LENDING_MARKET_ID } from "@suilend/sdk";
import { formatList, getToken } from "@suilend/sui-fe";
import { showErrorToast, useWalletContext } from "@suilend/sui-fe-next";

import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import Card from "@/components/dashboard/Card";
import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import {
  IS_LOOPING_MESSAGE,
  WAS_LOOPING_MESSAGE,
  getIsLooping,
  getLoopedAssetCoinTypes,
  getWasLooping,
  getZeroSharePositions,
} from "@/lib/looping";

interface LoopedPositionProps {
  coinTypes: string[];
}

function LoopedPosition({ coinTypes }: LoopedPositionProps) {
  const { allAppData } = useLoadedAppContext();
  const appData = allAppData.allLendingMarketData[LENDING_MARKET_ID];

  return (
    <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
      <TokenLogo
        token={getToken(coinTypes[0], appData.coinMetadataMap[coinTypes[0]])}
        size={16}
      />
      <TBodySans className="text-xs text-foreground">
        {appData.coinMetadataMap[coinTypes[0]].symbol} deposits{" "}
        {coinTypes[0] === coinTypes[1] ? "and borrows" : "and"}
      </TBodySans>
      {coinTypes[0] !== coinTypes[1] && (
        <>
          <TokenLogo
            token={getToken(
              coinTypes[1],
              appData.coinMetadataMap[coinTypes[1]],
            )}
            size={16}
          />
          <TBodySans className="text-xs text-foreground">
            {appData.coinMetadataMap[coinTypes[1]].symbol} borrows
          </TBodySans>
        </>
      )}
    </div>
  );
}

export default function MainMarketLoopingCard() {
  const { address } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const appData = allAppData.allLendingMarketData[LENDING_MARKET_ID];
  const { refresh, obligationMap, obligationOwnerCapMap } =
    useLoadedUserContext();
  const obligation = obligationMap[LENDING_MARKET_ID];
  const obligationOwnerCap = obligationOwnerCapMap[LENDING_MARKET_ID];

  const { withdraw, borrow } = useActionsModalContext();

  const loopedAssetCoinTypes = getLoopedAssetCoinTypes(appData, obligation);
  const isLooping = getIsLooping(appData, obligation);

  const { deposits: zeroShareDeposits, borrows: zeroShareBorrows } =
    getZeroSharePositions(obligation);
  const wasLooping = getWasLooping(appData, obligation);

  // Restore eligibility
  const [isRestoringEligibility, setIsRestoringEligibility] =
    useState<boolean>(false);

  const restoreEligibility = async () => {
    if (!address) throw Error("Wallet not connected");
    if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

    if (isRestoringEligibility) return;
    setIsRestoringEligibility(true);

    try {
      for (const d of zeroShareDeposits)
        await withdraw(LENDING_MARKET_ID, d.coinType, "1");
      for (const b of zeroShareBorrows)
        await borrow(LENDING_MARKET_ID, b.coinType, "1");

      toast.success("Restored eligibility");
    } catch (err) {
      showErrorToast("Failed to restore eligibility", err as Error);
    } finally {
      setIsRestoringEligibility(false);
      refresh();
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
                        .toFixed(
                          d.reserve.mintDecimals,
                        )} ${d.reserve.token.symbol}`,
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
                        .toFixed(
                          b.reserve.mintDecimals,
                        )} ${b.reserve.token.symbol}`,
                  ),
                )}
              </TLabelSans>
            )}
          </div>
        </CardContent>
      </Card>
    );
  return null;
}
