import { useEffect, useMemo, useState } from "react";

import BigNumber from "bignumber.js";

import { formatPercent } from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import { MAINNET_CONFIG, PoolInfo, SteammSDK } from "@suilend/steamm-sdk";

import { useAdminContext } from "@/components/admin/AdminContext";
import AddReserveDialog from "@/components/admin/reserves/AddReserveDialog";
import AddRewardsDialog from "@/components/admin/reserves/AddRewardsDialog";
import ClaimFeesDialog from "@/components/admin/reserves/ClaimFeesDialog";
import ReserveConfigDialog from "@/components/admin/reserves/ReserveConfigDialog";
import ReservePropertiesDialog from "@/components/admin/reserves/ReservePropertiesDialog";
import ReserveRewardsDialog from "@/components/admin/reserves/ReserveRewardsDialog";
import OpenURLButton from "@/components/shared/OpenURLButton";
import { TTitle } from "@/components/shared/Typography";
import Value from "@/components/shared/Value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
export default function ReservesTab() {
  const { rpc, explorer } = useSettingsContext();
  const { address } = useWalletContext();

  const { appData } = useAdminContext();

  // Pools
  const steammClient = useMemo(() => {
    const sdk = new SteammSDK({ ...MAINNET_CONFIG, fullRpcUrl: rpc.url });
    sdk.senderAddress =
      address ??
      "0x0000000000000000000000000000000000000000000000000000000000000000"; // Address must be set to use the SDK

    return sdk;
  }, [rpc.url, address]);

  const [poolInfos, setPoolInfos] = useState<PoolInfo[] | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const _poolInfos = await steammClient.getPools();
        setPoolInfos(_poolInfos);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [steammClient]);

  return (
    <div className="flex w-full flex-col gap-2">
      {appData.lendingMarket.reserves.map((reserve) => {
        const poolInfo = poolInfos?.find(
          (poolInfo) => poolInfo.lpTokenType === reserve.token.coinType,
        );

        const getQuoterName = (quoterType: string) => {
          return quoterType.endsWith("omm::OracleQuoter")
            ? "Oracle"
            : quoterType.endsWith("stable::StableQuoter")
              ? "Stable"
              : "CPMM";
        };

        return (
          <Card key={reserve.id}>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <TTitle>
                  {reserve.token.symbol}{" "}
                  {poolInfo && (
                    <>
                      {" "}
                      <span className="rounded-[20px] bg-border px-2 py-0.5 text-xs text-foreground">
                        {getQuoterName(poolInfo.quoterType)}
                      </span>{" "}
                      <span className="rounded-[20px] bg-border px-2 py-0.5 text-xs text-foreground">
                        {formatPercent(
                          new BigNumber(poolInfo.swapFeeBps).div(100),
                        )}
                      </span>
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
