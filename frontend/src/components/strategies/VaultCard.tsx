import router from "next/router";
import { useCallback } from "react";

import { LENDING_MARKET_ID } from "@suilend/sdk";
import {
  formatPercent,
  formatToken,
  formatUsd,
  getToken,
} from "@suilend/sui-fe";
import { shallowPushQuery } from "@suilend/sui-fe-next";

import LabelWithValue from "@/components/shared/LabelWithValue";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import EarnHeader from "@/components/strategies/EarnHeader";
import { QueryParams as LstStrategyDialogQueryParams } from "@/components/strategies/LstStrategyDialog";
import PnlLabelWithValue from "@/components/strategies/PnlLabelWithValue";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useVaultContext } from "@/contexts/VaultContext";
import { ParsedVault } from "@/fetchers/parseVault";
import { ASSETS_URL } from "@/lib/constants";

interface VaultCardProps {
  vault: ParsedVault;
}

export default function VaultCard({ vault }: VaultCardProps) {
  const { allAppData } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];
  const { userPnls } = useVaultContext();
  // Open
  const openVaultDialog = useCallback(() => {
    shallowPushQuery(router, {
      ...router.query,
      [LstStrategyDialogQueryParams.STRATEGY_NAME]: vault?.metadata?.queryParam,
    });
  }, [vault?.metadata?.queryParam]);

  const globalTvlAmountUsd = vault.deployedAmount
    .plus(vault.undeployedAmount)
    .times(appDataMainMarket.reserveMap[vault.baseCoinType].price);
  const hasPosition = vault.userSharesBalance.gt(0);

  const totalPnl = userPnls[vault.id];

  return (
    <div
      className="group relative w-full cursor-pointer rounded-[4px] bg-gradient-to-tr from-border via-border to-[#457AE4] p-[1px]"
      onClick={openVaultDialog}
    >
      {vault.new && (
        <div className="absolute -left-0.5 -top-0.5 z-[4] rounded-[4px] bg-secondary px-1">
          <TLabelSans className="text-[10px] leading-4 text-secondary-foreground">
            New
          </TLabelSans>
        </div>
      )}

      <div className="relative z-[3] flex flex-col gap-4 rounded-[3px] p-4">
        <div className="flex w-full flex-row justify-between">
          {/* Left */}
          <EarnHeader
            title={vault.metadata?.name ?? "NO METADATA"}
            tooltip={vault.metadata?.description ?? "NO METADATA"}
            type="Vault"
            tokens={[
              getToken(
                vault.baseCoinType,
                appDataMainMarket.coinMetadataMap[vault.baseCoinType],
              ),
            ]}
          />

          {/* Right */}
          <div className="flex flex-row justify-end gap-6">
            {/* Global TVL */}
            <div className="flex w-fit flex-col items-end gap-1">
              <TLabelSans>TVL</TLabelSans>
              {globalTvlAmountUsd === undefined ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <Tooltip
                  title={
                    globalTvlAmountUsd !== null
                      ? formatUsd(globalTvlAmountUsd, { exact: true })
                      : undefined
                  }
                >
                  <TBody className="text-right">
                    {globalTvlAmountUsd !== null
                      ? formatUsd(globalTvlAmountUsd)
                      : "--"}
                  </TBody>
                </Tooltip>
              )}
            </div>

            {/* APR/Max APR */}
            <div className="flex w-fit flex-col items-end gap-1">
              <TLabelSans>APR</TLabelSans>
              <TBody className="text-right">
                {vault.apr.isNaN() ? "-" : formatPercent(vault.apr)}
              </TBody>
            </div>
          </div>
        </div>

        {hasPosition && (
          <>
            <Separator className="bg-gradient-to-r from-border via-border to-[#457AE4]" />

            <div className="flex w-full flex-col gap-3">
              {/* Equity */}
              <LabelWithValue
                label="Equity"
                value="0"
                horizontal
                customChild={
                  <div className="flex flex-row items-baseline gap-2">
                    <Tooltip title={`${formatUsd(vault.tvl, { exact: true })}`}>
                      <TLabel>{formatUsd(vault.tvl)}</TLabel>
                    </Tooltip>

                    <Tooltip
                      title={`${formatToken(vault.tvl, {
                        dp: appDataMainMarket.coinMetadataMap[
                          vault.baseCoinType
                        ].decimals,
                      })} ${appDataMainMarket.coinMetadataMap[vault.baseCoinType].symbol}`}
                    >
                      <TBody>
                        {formatToken(vault.tvl, { exact: false })}{" "}
                        {
                          appDataMainMarket.coinMetadataMap[vault.baseCoinType]
                            .symbol
                        }
                      </TBody>
                    </Tooltip>
                  </div>
                }
              />

              {/* Total PnL */}
              <PnlLabelWithValue
                reserve={appDataMainMarket.reserveMap[vault.baseCoinType]}
                label="Total PnL"
                labelTooltip="Total PnL is the difference between the sum of your Equity and unclaimed rewards, and the net amount deposited."
                pnlAmount={totalPnl}
              />

              <LabelWithValue
                label="Utilization"
                value={`${formatPercent(vault.utilization.times(100), { dp: 1 })}`}
                valueTooltip={`${formatPercent(vault.utilization.times(100), { dp: 6 })}`}
                horizontal
              />

              <LabelWithValue
                label="mNAV"
                value={`${formatToken(vault.navPerShare, { dp: 2 })}x`}
                horizontal
              />
            </div>
          </>
        )}
      </div>

      <div
        className="absolute inset-px z-[2] rounded-[3px] opacity-40 transition-opacity group-hover:opacity-50"
        style={{
          backgroundImage: `url('${ASSETS_URL}/strategies/card-bg.png')`,
          backgroundPosition: "top right",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="absolute inset-px z-[1] rounded-[3px] bg-card" />
    </div>
  );
}
