import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";

import { useSettingsContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import AddReserveDialog from "@/components/admin/reserves/AddReserveDialog";
import AddRewardsDialog from "@/components/admin/reserves/AddRewardsDialog";
import ClaimFeesDialog from "@/components/admin/reserves/ClaimFeesDialog";
import ReserveConfigDialog from "@/components/admin/reserves/ReserveConfigDialog";
import ReservePropertiesDialog from "@/components/admin/reserves/ReservePropertiesDialog";
import ReserveRewardsDialog from "@/components/admin/reserves/ReserveRewardsDialog";
import SteammPoolBadges from "@/components/admin/reserves/SteammPoolBadges";
import OpenURLButton from "@/components/shared/OpenURLButton";
import { TTitle } from "@/components/shared/Typography";
import Value from "@/components/shared/Value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { getPoolInfo } from "@/lib/admin";
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

  const { appData, steammPoolInfos } = useAdminContext();

  // coinType
  useEffect(() => {
    if (!queryParams[QueryParams.COIN_TYPE]) return;

    const id = `reserve-${queryParams[QueryParams.COIN_TYPE]}`;
    const elem = document.getElementById(id);
    if (!elem) return;

    window.scrollTo({ top: elem.offsetTop - 100, behavior: "smooth" });
  }, [queryParams]);

  return (
    <div className="flex w-full flex-col gap-2">
      {appData.lendingMarket.reserves.map((reserve) => {
        const poolInfo = getPoolInfo(steammPoolInfos, reserve.token.coinType);

        return (
          <Card
            key={reserve.id}
            id={`reserve-${reserve.token.coinType}`}
            className={cn(
              queryParams[QueryParams.COIN_TYPE] === reserve.token.coinType &&
                "border-secondary",
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

      <div className="flex flex-row flex-wrap gap-2">
        <AddReserveDialog />
        <AddRewardsDialog />
        <ClaimFeesDialog />
      </div>
    </div>
  );
}
