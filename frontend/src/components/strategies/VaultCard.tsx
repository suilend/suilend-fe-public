import router from "next/router";
import { useCallback } from "react";  
import BigNumber from "bignumber.js";
import { formatPercent, formatToken, formatUsd, getToken } from "@suilend/sui-fe";
import { shallowPushQuery } from "@suilend/sui-fe-next";
import LabelWithValue from "@/components/shared/LabelWithValue";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { QueryParams as LstStrategyDialogQueryParams } from "@/components/strategies/LstStrategyDialog";
import PnlLabelWithValue from "@/components/strategies/PnlLabelWithValue";
import EarnHeader from "@/components/strategies/EarnHeader";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ASSETS_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ParsedVault } from "@/fetchers/parseVault";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { LENDING_MARKET_ID } from "@suilend/sdk";

interface VaultCardProps {
  vault: ParsedVault;
}

export default function VaultCard({ vault }: VaultCardProps) {
  const { allAppData } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];

  // Open
  const openVaultDialog = useCallback(() => {
    shallowPushQuery(router, {
      ...router.query,
      [LstStrategyDialogQueryParams.VAULT_NAME]: vault.metadata.queryParam,
    });
  }, [router, vault.metadata.queryParam]);

  const globalTvlAmountUsd = vault.deployedAmount.plus(vault.undeployedAmount).times(appDataMainMarket.reserveMap[vault.baseCoinType].price);
  const hasPosition = vault.

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
            title={vault.metadata.name}
            tooltip={vault.metadata.description}
            type={vault.baseCoinType}
            tokens={[getToken(vault.baseCoinType, appDataMainMarket.coinMetadataMap[vault.baseCoinType])]}
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
              <TLabelSans>
                APR
              </TLabelSans>
              <TBody className="text-right">{formatPercent(vault.apr)}</TBody>
            </div>
          </div>
        </div>

        {!!obligation && hasPosition(obligation) && (
          <>
            <Separator className="bg-gradient-to-r from-border via-border to-[#457AE4]" />

            <div className="flex w-full flex-col gap-3">
              {/* Equity */}
              <LabelWithValue
                label="Equity"
                labelTooltip={
                  <>
                    Equity is calculated as the sum of the net amount deposited,
                    deposit interest, LST staking yield (if applicable), and
                    claimed rewards, minus borrow interest.
                    <br />
                    <span className="mt-2 block">
                      Equity does not include unclaimed rewards.
                    </span>
                  </>
                }
                value="0"
                horizontal
                customChild={
                  <div className="flex flex-row items-baseline gap-2">
                    <Tooltip
                      title={`${formatUsd(
                        tvlAmount.times(defaultCurrencyReserve.price),
                        { exact: true },
                      )}`}
                    >
                      <TLabel>
                        {formatUsd(
                          tvlAmount.times(defaultCurrencyReserve.price),
                        )}
                      </TLabel>
                    </Tooltip>

                    <Tooltip
                      title={`${formatToken(tvlAmount, {
                        dp: defaultCurrencyReserve.token.decimals,
                      })} ${defaultCurrencyReserve.token.symbol}`}
                    >
                      <TBody>
                        {formatToken(tvlAmount, { exact: false })}{" "}
                        {defaultCurrencyReserve.token.symbol}
                      </TBody>
                    </Tooltip>
                  </div>
                }
              />

              {/* Total PnL */}
              <PnlLabelWithValue
                reserve={defaultCurrencyReserve}
                label="Total PnL"
                labelTooltip="Total PnL is the difference between the sum of your Equity and unclaimed rewards, and the net amount deposited."
                pnlAmount={totalPnlAmount}
                pnlTooltip={
                  realizedPnlAmount === undefined ||
                  totalPnlAmount === undefined ? undefined : (
                    <div className="flex flex-col gap-2">
                      {/* Realized PnL */}
                      <div className="flex flex-row items-center justify-between gap-4">
                        <TLabelSans>Realized PnL</TLabelSans>
                        <TBody
                          className={cn(
                            realizedPnlAmount.gt(0) && "text-success",
                            realizedPnlAmount.lt(0) && "text-destructive",
                          )}
                        >
                          {new BigNumber(realizedPnlAmount).eq(0)
                            ? null
                            : new BigNumber(realizedPnlAmount).gte(0)
                              ? "+"
                              : "-"}
                          {formatToken(realizedPnlAmount.abs(), {
                            dp: defaultCurrencyReserve.token.decimals,
                          })}{" "}
                          {defaultCurrencyReserve.token.symbol}
                        </TBody>
                      </div>

                      {/* Unclaimed rewards */}
                      <div className="flex flex-row items-center justify-between gap-4">
                        <TLabelSans>Unclaimed rewards</TLabelSans>
                        <TBody
                          className={cn(
                            unclaimedRewardsAmountSnapshotRef.current.gt(0) &&
                              "text-success",
                            unclaimedRewardsAmountSnapshotRef.current.lt(0) &&
                              "text-destructive",
                          )}
                        >
                          {new BigNumber(
                            unclaimedRewardsAmountSnapshotRef.current,
                          ).eq(0)
                            ? null
                            : new BigNumber(
                                  unclaimedRewardsAmountSnapshotRef.current,
                                ).gte(0)
                              ? "+"
                              : "-"}
                          {formatToken(
                            unclaimedRewardsAmountSnapshotRef.current.abs(),
                            { dp: defaultCurrencyReserve.token.decimals },
                          )}{" "}
                          {defaultCurrencyReserve.token.symbol}
                        </TBody>
                      </div>

                      <Separator />

                      {/* Total PnL */}
                      <div className="flex flex-row items-center justify-between gap-4">
                        <TLabelSans>Total PnL</TLabelSans>
                        <TBody
                          className={cn(
                            totalPnlAmount.gt(0) && "text-success",
                            totalPnlAmount.lt(0) && "text-destructive",
                          )}
                        >
                          {new BigNumber(totalPnlAmount).eq(0)
                            ? null
                            : new BigNumber(totalPnlAmount).gte(0)
                              ? "+"
                              : "-"}
                          {formatToken(totalPnlAmount.abs(), {
                            dp: defaultCurrencyReserve.token.decimals,
                          })}{" "}
                          {defaultCurrencyReserve.token.symbol}
                        </TBody>
                      </div>
                    </div>
                  )
                }
              />

              {/* Exposure */}
              <LabelWithValue
                label="Leverage"
                value={`${exposure.toFixed(1)}x`}
                valueTooltip={`${exposure.toFixed(6)}x`}
                horizontal
              />

              {/* Health */}
              <div className="flex w-full flex-col gap-2">
                <LabelWithValue
                  label="Health"
                  value={formatPercent(healthPercent, { dp: 0 })}
                  horizontal
                />

                <div className="flex w-full flex-row justify-between">
                  {Array.from({ length: 50 + 1 }).map((_, i, arr) => (
                    <div
                      key={i}
                      className="h-[16px] w-[max(0.5%,2px)] rounded-sm bg-muted/20"
                      style={{
                        backgroundColor: healthPercent.gte(
                          i * (100 / (arr.length - 1)),
                        )
                          ? healthColorRange(i / (arr.length - 1)).toString()
                          : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
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
