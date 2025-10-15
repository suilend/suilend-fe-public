import { useRouter } from "next/router";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { X } from "lucide-react";
import { toast } from "sonner";

import { ADMIN_ADDRESS, ParsedReserve, Side } from "@suilend/sdk";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import AddReserveDialog from "@/components/admin/reserves/AddReserveDialog";
import AddRewardsDialog from "@/components/admin/reserves/AddRewardsDialog";
import ClaimFeesDialog from "@/components/admin/reserves/ClaimFeesDialog";
import ReserveConfigDialog from "@/components/admin/reserves/ReserveConfigDialog";
import ReservePropertiesDialog from "@/components/admin/reserves/ReservePropertiesDialog";
import ReserveRewardsDialog from "@/components/admin/reserves/ReserveRewardsDialog";
import SteammPoolBadges from "@/components/admin/reserves/SteammPoolBadges";
import Button from "@/components/shared/Button";
import OpenURLButton from "@/components/shared/OpenURLButton";
import TextLink from "@/components/shared/TextLink";
import {
  TBody,
  TLabel,
  TLabelSans,
  TTitle,
} from "@/components/shared/Typography";
import Value from "@/components/shared/Value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { getPoolInfo } from "@/lib/admin";
import { TX_TOAST_DURATION } from "@/lib/constants";
import { cn } from "@/lib/utils";

enum QueryParams {
  COIN_TYPE = "coinType",
}

export default function ReservesTab() {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.COIN_TYPE]: router.query[QueryParams.COIN_TYPE] as string,
    }),
    [router.query],
  );

  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { featuredReserveIds, deprecatedReserveIds } = useLoadedAppContext();
  const { refresh } = useLoadedUserContext();

  const { appData, steammPoolInfos } = useAdminContext();

  const isEditable = address === ADMIN_ADDRESS;

  // coinType
  useEffect(() => {
    if (!queryParams[QueryParams.COIN_TYPE]) return;

    const id = `reserve-${queryParams[QueryParams.COIN_TYPE]}`;
    const elem = document.getElementById(id);
    if (!elem) return;

    window.scrollTo({ top: elem.offsetTop - 100, behavior: "smooth" });
  }, [queryParams]);

  // Close rewards
  const getCloseRewardsTransaction = useCallback(() => {
    // if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    const transaction = new Transaction();

    let closableRewardCount = 0;
    let notClosableRewardCount = 0;
    for (const reserve of appData.lendingMarket.reserves) {
      for (const side of Object.values(Side)) {
        const poolRewardManager =
          side === Side.DEPOSIT
            ? reserve.depositsPoolRewardManager
            : reserve.borrowsPoolRewardManager;

        for (const poolReward of poolRewardManager.poolRewards) {
          const isClosable =
            Date.now() > new Date(poolReward.endTimeMs).getTime() &&
            +poolReward.numUserRewardManagers.toString() === 0;

          if (isClosable) {
            const reserveArrayIndex = reserve.arrayIndex;
            const isDepositReward = side === Side.DEPOSIT;
            const rewardIndex = BigInt(poolReward.rewardIndex);
            const rewardCoinType = poolReward.coinType;

            const [unclaimedRewards] = appData.suilendClient.closeReward(
              appData.lendingMarket.ownerCapId,
              reserveArrayIndex,
              isDepositReward,
              rewardIndex,
              rewardCoinType,
              transaction,
            );
            if (address)
              transaction.transferObjects([unclaimedRewards], address);

            closableRewardCount++;
          } else {
            notClosableRewardCount++;
          }
        }
      }
    }

    return { transaction, closableRewardCount, notClosableRewardCount };
  }, [
    address,
    appData.lendingMarket.ownerCapId,
    appData.lendingMarket.reserves,
    appData.suilendClient,
  ]);
  const { closableRewardCount, notClosableRewardCount } = useMemo(
    () => getCloseRewardsTransaction(),
    [getCloseRewardsTransaction],
  );

  const [isClosingRewards, setIsClosingRewards] = useState<boolean>(false);
  const onCloseRewardsClick = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    try {
      const { transaction } = getCloseRewardsTransaction();

      setIsClosingRewards(true);

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        `Closed ${closableRewardCount} reward${closableRewardCount !== 1 ? "s" : ""}`,
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      toast.error("Failed to close rewards", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
      setIsClosingRewards(false);
    }
  };

  // Reserves
  const reserveSectionMap = useMemo(() => {
    const result: Record<
      "featured" | "main" | "isolated" | "deprecated",
      ParsedReserve[]
    > = {
      featured: [],
      main: [],
      isolated: [],
      deprecated: [],
    };

    for (const reserve of appData.lendingMarket.reserves) {
      if ((deprecatedReserveIds ?? []).includes(reserve.id)) {
        result.deprecated.push(reserve);
      } else if ((featuredReserveIds ?? []).includes(reserve.id)) {
        result.featured.push(reserve);
      } else if (reserve.config.isolated) {
        result.isolated.push(reserve);
      } else {
        result.main.push(reserve);
      }
    }

    return result;
  }, [
    appData.lendingMarket.reserves,
    deprecatedReserveIds,
    featuredReserveIds,
  ]);

  return (
    <div className="flex w-full flex-col gap-2">
      {Object.entries(reserveSectionMap).map(([section, reserves], index) => {
        if (reserves.length === 0) return null;
        return (
          <Fragment key={section}>
            <div
              className={cn(
                "mb-2 flex flex-row items-center gap-2",
                index !== 0 && "mt-2",
              )}
            >
              <TBody className="uppercase">{section}</TBody>
              <TLabel>{reserves.length}</TLabel>
            </div>

            {reserves.map((reserve) => {
              const poolInfo = getPoolInfo(
                steammPoolInfos,
                reserve.token.coinType,
              );

              return (
                <Card
                  key={reserve.id}
                  id={`reserve-${reserve.token.coinType}`}
                  className={cn(
                    queryParams[QueryParams.COIN_TYPE] ===
                      reserve.token.coinType && "border-secondary",
                  )}
                >
                  <CardHeader>
                    <div className="flex flex-row items-center justify-between">
                      <TTitle>
                        {reserve.token.symbol}
                        {poolInfo && (
                          <>
                            {" "}
                            <SteammPoolBadges poolInfo={poolInfo} />
                          </>
                        )}
                      </TTitle>

                      {poolInfo && (
                        <div className="-m-1.5 flex flex-row items-center">
                          <OpenURLButton
                            url={`https://steamm.fi/pool/${poolInfo.poolId}`}
                          >
                            View pool on STEAMM
                          </OpenURLButton>
                        </div>
                      )}
                    </div>
                    <CardDescription>
                      <Value
                        value={reserve.id}
                        isId
                        url={explorer.buildObjectUrl(reserve.id)}
                        isExplorerUrl
                      />
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex flex-row flex-wrap gap-2">
                    <ReserveConfigDialog reserve={reserve} />
                    <ReservePropertiesDialog reserve={reserve} />
                    <ReserveRewardsDialog reserve={reserve} />
                    <ClaimFeesDialog reserve={reserve} />
                  </CardContent>
                </Card>
              );
            })}
          </Fragment>
        );
      })}

      <div className="flex flex-row flex-wrap gap-2">
        <AddReserveDialog />
        <AddRewardsDialog />
        <ClaimFeesDialog />

        <div className="flex flex-col items-center gap-1.5">
          <Button
            className="w-fit"
            labelClassName={cn("uppercase")}
            startIcon={<X />}
            variant="secondary"
            disabled={
              !isEditable || closableRewardCount === 0 || isClosingRewards
            }
            onClick={onCloseRewardsClick}
          >
            {closableRewardCount === 0
              ? "Close rewards"
              : `Close ${closableRewardCount} reward${closableRewardCount !== 1 ? "s" : ""}`}
          </Button>
          <TLabelSans>
            {notClosableRewardCount} non-closable reward
            {notClosableRewardCount !== 1 ? "s" : ""}
          </TLabelSans>
        </div>
      </div>
    </div>
  );
}
