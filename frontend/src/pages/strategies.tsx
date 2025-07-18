import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { toast } from "sonner";

import {
  ParsedObligation,
  Side,
  getFilteredRewards,
  getNetAprPercent,
  getStakingYieldAprPercent,
  getTotalAprPercent,
} from "@suilend/sdk";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import {
  LiquidStakingObjectInfo,
  LstClient,
  SPRING_SUI_UPGRADE_CAP_ID,
  getLatestPackageId as getLatestSpringSuiPackageId,
} from "@suilend/springsui-sdk";
import { LiquidStakingInfo } from "@suilend/springsui-sdk/_generated/liquid_staking/liquid-staking/structs";
import { WeightHook } from "@suilend/springsui-sdk/_generated/liquid_staking/weight/structs";
import {
  API_URL,
  MAX_U64,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  TX_TOAST_DURATION,
  formatList,
  formatNumber,
  formatPercent,
  formatToken,
  formatUsd,
} from "@suilend/sui-fe";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import TextLink from "@/components/shared/TextLink";
import {
  TBody,
  TBodySans,
  TLabel,
  TLabelSans,
} from "@/components/shared/Typography";
import { getWeightedBorrowsUsd } from "@/components/shared/UtilizationBar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

const E = 10 ** -4;
const sSUI_DECIMALS = 9;

interface LoopCardProps {
  lstClient: LstClient;
  sSuiRedeemFeePercent: BigNumber;
  suiToSsuiExchangeRate: BigNumber;
  getStakingFee: (suiAmount: BigNumber) => BigNumber;
  obligation: ParsedObligation;
  obligationOwnerCap: ObligationOwnerCap<string>;
}

function LoopCard({
  lstClient,
  sSuiRedeemFeePercent,
  suiToSsuiExchangeRate,
  getStakingFee,
  obligation,
  obligationOwnerCap,
}: LoopCardProps) {
  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { allAppData, appData } = useLoadedAppContext();
  const { userData, refresh } = useLoadedUserContext();

  // Reserves
  const suiReserve = appData.reserveMap[NORMALIZED_SUI_COINTYPE];
  const sSuiReserve = appData.reserveMap[NORMALIZED_sSUI_COINTYPE];

  const suiBorrowFeePercent = new BigNumber(suiReserve.config.borrowFeeBps).div(
    100,
  );

  // Loop
  const getExposure = (
    sSuiDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
  ) => sSuiDepositedAmount.div(sSuiDepositedAmount.minus(suiBorrowedAmount));

  const loop = async (suiAmount: BigNumber, targetExposure: BigNumber) => {
    try {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");
      if (!lstClient) throw Error("sSUI LST client not found");

      // Exposure
      const minExposure = new BigNumber(1);
      const maxExposure = new BigNumber(
        1 / (1 - sSuiReserve.config.openLtvPct / 100),
      ); // 3.33333...x
      if (!(targetExposure.gt(minExposure) && targetExposure.lt(maxExposure)))
        throw Error(
          `Target exposure must be greater than ${minExposure}x and less than ${maxExposure}x`,
        );
      console.log(
        `[LoopCard] loop - targetExposure: ${targetExposure}x, (min, max): (${minExposure}x, ${maxExposure}x)`,
      );

      //

      const transaction = new Transaction();

      // 1) Refresh pyth oracles (sSUI and SUI) - required when borrowing
      await appData.suilendClient.refreshAll(transaction, undefined, [
        NORMALIZED_sSUI_COINTYPE,
        NORMALIZED_SUI_COINTYPE,
      ]);

      // 2.1) Stake SUI for sSUI
      const sSuiAmount = suiAmount
        .minus(getStakingFee(suiAmount))
        .times(suiToSsuiExchangeRate);
      console.log(
        `[LoopCard] loop - suiAmount: ${suiAmount}, sSuiAmount: ${sSuiAmount}, suiToSsuiExchangeRate: ${suiToSsuiExchangeRate}`,
      );

      const suiCoinToStake = transaction.splitCoins(transaction.gas, [
        suiAmount
          .times(10 ** SUI_DECIMALS)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
      ]);
      const sSuiCoinToDeposit = lstClient.mint(transaction, suiCoinToStake);

      // 2.2) Deposit sSUI (1x exposure)
      appData.suilendClient.deposit(
        sSuiCoinToDeposit,
        NORMALIZED_sSUI_COINTYPE,
        obligationOwnerCap.id,
        transaction,
      );

      let sSuiDepositedAmount = sSuiAmount;
      let suiBorrowedAmount = new BigNumber(0);
      for (let i = 0; i < 20; i++) {
        let currentExposure = getExposure(
          sSuiDepositedAmount,
          suiBorrowedAmount,
        );
        let pendingExposure = targetExposure.minus(currentExposure);
        console.log(
          `[LoopCard] loop - ${i} start |`,
          JSON.stringify(
            {
              sSuiDepositedAmount,
              suiBorrowedAmount,
              currentExposure,
              pendingExposure,
            },
            null,
            2,
          ),
        );
        if (currentExposure.times(1 + E).gte(targetExposure)) break;

        // 3.1) Max calculations
        const stepMaxSuiBorrowedAmount = new BigNumber(
          new BigNumber(
            new BigNumber(sSuiReserve.config.openLtvPct)
              .div(100)
              .times(sSuiReserve.minPrice.div(sSuiReserve.maxPrice)),
          ).times(sSuiDepositedAmount),
        )
          .minus(suiBorrowedAmount)
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxSsuiDepositedAmount = new BigNumber(
          stepMaxSuiBorrowedAmount.minus(
            getStakingFee(stepMaxSuiBorrowedAmount),
          ),
        )
          .times(suiToSsuiExchangeRate)
          .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxExposure = getExposure(
          sSuiDepositedAmount.plus(stepMaxSsuiDepositedAmount),
          suiBorrowedAmount.plus(stepMaxSuiBorrowedAmount),
        ).minus(currentExposure);
        console.log(
          `[LoopCard] loop - ${i} max |`,
          JSON.stringify(
            {
              stepMaxSuiBorrowedAmount,
              stepMaxSsuiDepositedAmount,
              stepMaxExposure,
            },
            null,
            2,
          ),
        );

        // 3.2) Borrow
        const stepSuiBorrowedAmount = pendingExposure.gte(stepMaxExposure)
          ? stepMaxSuiBorrowedAmount
          : stepMaxSuiBorrowedAmount
              .times(pendingExposure.div(stepMaxExposure))
              .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxBorrow = stepSuiBorrowedAmount.eq(stepMaxSuiBorrowedAmount);
        console.log(
          `[LoopCard] loop - ${i} borrow |`,
          JSON.stringify({ stepSuiBorrowedAmount, isMaxBorrow }, null, 2),
        );

        const [borrowedSuiCoin] = await appData.suilendClient.borrow(
          obligationOwnerCap.id,
          obligation.id,
          NORMALIZED_SUI_COINTYPE,
          isMaxBorrow
            ? MAX_U64.toString()
            : stepSuiBorrowedAmount
                .times(10 ** SUI_DECIMALS)
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
          transaction,
          false,
        );
        suiBorrowedAmount = suiBorrowedAmount.plus(stepSuiBorrowedAmount);

        // 3.3) Stake borrowed SUI for sSUI
        const sSuiCoin = lstClient.mint(transaction, borrowedSuiCoin);

        // 3.4) Deposit sSUI
        const stepSsuiDepositedAmount = new BigNumber(
          stepSuiBorrowedAmount.minus(getStakingFee(stepSuiBorrowedAmount)),
        )
          .times(suiToSsuiExchangeRate)
          .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
        console.log(
          `[LoopCard] loop - ${i} deposit |`,
          JSON.stringify({ stepSsuiDepositedAmount }, null, 2),
        );

        appData.suilendClient.deposit(
          sSuiCoin,
          NORMALIZED_sSUI_COINTYPE,
          obligationOwnerCap.id,
          transaction,
        );
        sSuiDepositedAmount = sSuiDepositedAmount.plus(stepSsuiDepositedAmount);

        currentExposure = getExposure(sSuiDepositedAmount, suiBorrowedAmount);
        pendingExposure = targetExposure.minus(currentExposure);
        console.log(
          `[LoopCard] loop - ${i} end |`,
          JSON.stringify(
            {
              sSuiDepositedAmount,
              suiBorrowedAmount,
              currentExposure,
              pendingExposure,
            },
            null,
            2,
          ),
        );
        if (currentExposure.times(1 + E).gte(targetExposure)) break;
      }

      // 4) Rebalance sSUI
      lstClient.rebalance(
        transaction,
        lstClient.liquidStakingObject.weightHookId,
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(`Opened position (${suiAmount} SUI, ${targetExposure}x)`, {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (err) {
      showErrorToast("Failed to open position", err as Error, undefined, true);
    } finally {
      refresh();
    }
  };

  // State
  const [suiAmount, setSuiAmount] = useState<string>("0.5");
  const [exposure, setExposure] = useState<string>("3.00");

  // Calculations
  const sSuiDepositedAmount = useMemo(
    () =>
      new BigNumber(suiAmount || 0).eq(0)
        ? new BigNumber(0)
        : new BigNumber(suiAmount).times(suiToSsuiExchangeRate).times(exposure),
    [suiAmount, suiToSsuiExchangeRate, exposure],
  );
  const sSuiDepositedAmountUsd = useMemo(
    () => sSuiDepositedAmount.times(sSuiReserve.price),
    [sSuiDepositedAmount, sSuiReserve.price],
  );

  const suiBorrowedAmount = useMemo(
    () =>
      new BigNumber(suiAmount || 0).eq(0) || new BigNumber(exposure || 0).eq(0)
        ? new BigNumber(0)
        : new BigNumber(suiAmount)
            .times(suiToSsuiExchangeRate)
            .times(new BigNumber(exposure).minus(1)),
    [suiAmount, exposure, suiToSsuiExchangeRate],
  );
  const suiBorrowedAmountUsd = useMemo(
    () => suiBorrowedAmount.times(suiReserve.price),
    [suiBorrowedAmount, suiReserve.price],
  );

  // Fees
  const suiOpenFeesAmount = useMemo(
    () => suiBorrowedAmount.times(suiBorrowFeePercent.div(100)),
    [suiBorrowedAmount, suiBorrowFeePercent],
  );

  const sSuiCloseFeesAmount = useMemo(
    () => sSuiDepositedAmount.times(sSuiRedeemFeePercent.div(100)),
    [sSuiDepositedAmount, sSuiRedeemFeePercent],
  );

  // APR
  const netAprPercent = useMemo(() => {
    const depositAprPercent = getTotalAprPercent(
      Side.DEPOSIT,
      sSuiReserve.depositAprPercent,
      getFilteredRewards(userData.rewardMap[NORMALIZED_sSUI_COINTYPE].deposit),
      getStakingYieldAprPercent(
        Side.DEPOSIT,
        NORMALIZED_sSUI_COINTYPE,
        allAppData.lstAprPercentMap,
      ),
    );
    const weightedDepositAprPercent = depositAprPercent.times(
      sSuiDepositedAmountUsd,
    );

    const borrowAprPercent = getTotalAprPercent(
      Side.BORROW,
      suiReserve.borrowAprPercent,
      getFilteredRewards(userData.rewardMap[NORMALIZED_SUI_COINTYPE].borrow),
    );
    const weightedBorrowAprPercent =
      borrowAprPercent.times(suiBorrowedAmountUsd);

    const tvlUsd = sSuiDepositedAmountUsd.minus(suiBorrowedAmountUsd);

    return !tvlUsd.eq(0)
      ? new BigNumber(
          weightedDepositAprPercent.minus(weightedBorrowAprPercent),
        ).div(tvlUsd)
      : new BigNumber(0);
  }, [
    sSuiDepositedAmountUsd,
    sSuiReserve.depositAprPercent,
    userData.rewardMap,
    allAppData.lstAprPercentMap,
    suiBorrowedAmountUsd,
    suiReserve.borrowAprPercent,
  ]);

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-sm border p-4">
      <div className="flex w-full flex-col gap-1">
        <TBodySans>sSUI/SUI</TBodySans>
        <TLabelSans>
          Loops sSUI/SUI by depositing sSUI and borrowing SUI
        </TLabelSans>
      </div>

      <Separator />

      {/* Config */}
      <div className="flex w-full flex-col gap-3">
        {/* Size */}
        <Input
          label="Size"
          id="amount"
          value={suiAmount}
          onChange={setSuiAmount}
          endDecorator="SUI"
        />

        {/* Exposure */}
        <Input
          label="Exposure"
          id="exposure"
          value={exposure}
          onChange={setExposure}
          endDecorator="x"
        />
      </div>

      {/* Stats */}
      <div className="flex w-full flex-col gap-3">
        {/* Net APR */}
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <TLabelSans>APR</TLabelSans>
          <TBody>{formatPercent(netAprPercent)}</TBody>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex w-full flex-col gap-3">
        {/* Submit */}
        <Button
          className="w-full"
          labelClassName="uppercase"
          size="lg"
          onClick={() =>
            loop(
              new BigNumber(suiAmount).decimalPlaces(
                SUI_DECIMALS,
                BigNumber.ROUND_DOWN,
              ),
              new BigNumber(exposure).decimalPlaces(2, BigNumber.ROUND_DOWN),
            )
          }
        >
          Loop
        </Button>

        {/* Open fees */}
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <TLabelSans>Open fees (added to borrows)</TLabelSans>
          <TBody>
            {formatToken(suiOpenFeesAmount, { dp: SUI_DECIMALS })} SUI
          </TBody>
        </div>

        {/* Close fees */}
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <TLabelSans>Close fees (deducted when closing)</TLabelSans>
          <TBody>
            {formatToken(sSuiCloseFeesAmount, { dp: sSUI_DECIMALS })} sSUI
          </TBody>
        </div>
      </div>
    </div>
  );
}

interface UnloopCardProps {
  lstClient: LstClient;
  sSuiRedeemFeePercent: BigNumber;
  obligation: ParsedObligation;
  obligationOwnerCap: ObligationOwnerCap<string>;
}

function UnloopCard({
  lstClient,
  sSuiRedeemFeePercent,
  obligation,
  obligationOwnerCap,
}: UnloopCardProps) {
  const { explorer } = useSettingsContext();
  const { address, dryRunTransaction, signExecuteAndWaitForTransaction } =
    useWalletContext();
  const { allAppData, appData } = useLoadedAppContext();
  const { userData, refresh } = useLoadedUserContext();

  // Reserves
  const suiReserve = appData.reserveMap[NORMALIZED_SUI_COINTYPE];
  const sSuiReserve = appData.reserveMap[NORMALIZED_sSUI_COINTYPE];

  // Unloop
  const unloop = async () => {
    try {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");
      if (!lstClient) throw Error("sSUI LST client not found");

      // Calls
      const addRepayCalls = (
        transaction: Transaction,
        suiCoin: TransactionObjectArgument,
        addTransferCall?: boolean,
      ) => {
        appData.suilendClient.repay(
          obligation.id,
          NORMALIZED_SUI_COINTYPE,
          suiCoin,
          transaction,
        ); // Repay will throw if no SUI left to repay

        if (addTransferCall) transaction.transferObjects([suiCoin], address);

        return suiCoin;
      };

      //

      const transaction = new Transaction();

      // 1) Refresh pyth oracles (sSUI and SUI) - required when withdrawing
      await appData.suilendClient.refreshAll(transaction, undefined, [
        NORMALIZED_sSUI_COINTYPE,
        NORMALIZED_SUI_COINTYPE,
      ]);

      let suiCoin: TransactionObjectArgument | undefined = undefined;
      for (let i = 0; i < 10; i++) {
        // 2.1) Withdraw sSUI
        const [withdrawnSsuiCoin] = await appData.suilendClient.withdraw(
          obligationOwnerCap.id,
          obligation.id,
          NORMALIZED_sSUI_COINTYPE,
          MAX_U64.toString(),
          transaction,
          false,
        );

        // 2.2) Unstake withdrawn sSUI for SUI
        const stepSuiCoin = lstClient.redeem(transaction, withdrawnSsuiCoin);
        if (suiCoin) transaction.mergeCoins(suiCoin, [stepSuiCoin]);
        else suiCoin = stepSuiCoin;

        // 2.3) Repay SUI (will throw if no SUI left to repay)
        try {
          const txCopy = Transaction.from(transaction);
          addRepayCalls(txCopy, suiCoin, true);
          await dryRunTransaction(txCopy);

          addRepayCalls(transaction, suiCoin);
        } catch (err) {
          if (!suiCoin) throw new Error("No SUI to transfer to user"); // Should not happen

          // 2.4) Transfer remaining SUI to user
          transaction.transferObjects([suiCoin], address);

          break;
        }
      }

      // 3) Rebalance sSUI
      lstClient.rebalance(
        transaction,
        lstClient.liquidStakingObject.weightHookId,
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Closed position", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (err) {
      showErrorToast("Failed to close position", err as Error, undefined, true);
    } finally {
      refresh();
    }
  };

  // Calculations
  const sSuiDeposit = obligation.deposits.find(
    (d) => d.coinType === NORMALIZED_sSUI_COINTYPE,
  )!;
  const suiBorrow = obligation.borrows.find(
    (b) => b.coinType === NORMALIZED_SUI_COINTYPE,
  )!;

  const sSuiDepositedAmount = sSuiDeposit.depositedAmount;
  const suiBorrowedAmount = suiBorrow.borrowedAmount;

  const exposure = sSuiDepositedAmount.div(
    sSuiDepositedAmount.minus(suiBorrowedAmount),
  );

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-sm border p-4">
      <div className="flex w-full flex-col gap-1">
        <TBodySans>sSUI/SUI</TBodySans>
        <TLabelSans>
          Loops sSUI/SUI by depositing sSUI and borrowing SUI
        </TLabelSans>
      </div>

      <Separator />

      {/* Stats */}
      <div className="flex w-full flex-col gap-3">
        {/* Deposited sSUI */}
        <div className="flex w-full flex-row items-start justify-between gap-2">
          <TLabelSans className="my-[2px]">Deposited</TLabelSans>
          <div className="flex flex-col items-end gap-1">
            <TBody>
              {formatToken(sSuiDepositedAmount, { dp: SUI_DECIMALS })} sSUI
            </TBody>
            <TLabel>
              {formatUsd(sSuiDepositedAmount.times(sSuiReserve.price))}
            </TLabel>
          </div>
        </div>

        {/* Borrowed SUI */}
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <TLabelSans>Borrowed</TLabelSans>
          <div className="flex flex-col items-end gap-1">
            <TBody>
              {formatToken(suiBorrowedAmount, { dp: SUI_DECIMALS })} SUI
            </TBody>
            <TLabel>
              {formatUsd(suiBorrowedAmount.times(suiReserve.price))}
            </TLabel>
          </div>
        </div>

        {/* Net APR */}
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <TLabelSans>APR</TLabelSans>
          <TBody>
            {formatPercent(
              getNetAprPercent(
                obligation,
                userData.rewardMap,
                allAppData.lstAprPercentMap,
              ),
            )}
          </TBody>
        </div>

        {/* Exposure */}
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <TLabelSans>Exposure</TLabelSans>
          <TBody>{formatNumber(exposure, { dp: 2 })}x</TBody>
        </div>

        {/* Health */}
        <div className="flex w-full flex-col gap-1.5">
          <div className="flex w-full flex-row items-center justify-between gap-2">
            <TLabelSans>Health</TLabelSans>
            <TBody>
              {formatPercent(
                new BigNumber(1)
                  .minus(
                    new BigNumber(
                      getWeightedBorrowsUsd(obligation)
                        .div(obligation.unhealthyBorrowValueUsd)
                        .minus(0.8887),
                    ).div(1 - 0.8887),
                  )
                  .times(100),
              )}
            </TBody>
          </div>
          <div className="h-3 w-full bg-muted/20">
            <div
              className="h-full w-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              style={{
                clipPath: `polygon(${[
                  "0% 0%",
                  `${new BigNumber(1)
                    .minus(
                      new BigNumber(
                        getWeightedBorrowsUsd(obligation)
                          .div(obligation.unhealthyBorrowValueUsd)
                          .minus(0.8887),
                      ).div(1 - 0.8887),
                    )
                    .times(100)
                    .decimalPlaces(2)}% 0%`,
                  `${new BigNumber(1)
                    .minus(
                      new BigNumber(
                        getWeightedBorrowsUsd(obligation)
                          .div(obligation.unhealthyBorrowValueUsd)
                          .minus(0.8887),
                      ).div(1 - 0.8887),
                    )
                    .times(100)
                    .decimalPlaces(2)}% 100%`,
                  "0% 100%",
                ].join(", ")}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex w-full flex-col gap-3">
        {/* Submit */}
        <Button
          className="w-full"
          labelClassName="uppercase"
          size="lg"
          onClick={() => unloop()}
        >
          Unloop
        </Button>

        {/* Close fees */}
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <TLabelSans>Close fees (deducted when closing)</TLabelSans>
          <TBody>
            {formatToken(
              sSuiDepositedAmount.times(sSuiRedeemFeePercent).div(100),
              { dp: sSUI_DECIMALS },
            )}{" "}
            sSUI
          </TBody>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const { suiClient } = useSettingsContext();
  const { userData } = useLoadedUserContext();

  // sSUI
  const [lstClient, setLstClient] = useState<LstClient | undefined>(undefined);
  const [liquidStakingInfo, setLiquidStakingInfo] = useState<
    LiquidStakingInfo<string> | undefined
  >(undefined);

  useEffect(() => {
    (async () => {
      try {
        const publishedAt = await getLatestSpringSuiPackageId(
          suiClient,
          SPRING_SUI_UPGRADE_CAP_ID,
        );

        const lstInfoRes = await fetch(
          `${API_URL}/springsui/lst-info?${new URLSearchParams({
            coinType: NORMALIZED_sSUI_COINTYPE,
          })}`,
        );
        const lstInfoJson: {
          LIQUID_STAKING_INFO: LiquidStakingObjectInfo;
          liquidStakingInfo: LiquidStakingInfo<string>;
          weightHook: WeightHook<string>;
          apy: string;
        } = await lstInfoRes.json();
        if ((lstInfoRes as any)?.statusCode === 500)
          throw new Error("Failed to fetch sSUI LST info");

        const _lstClient = await LstClient.initialize(
          suiClient,
          lstInfoJson.LIQUID_STAKING_INFO,
          publishedAt,
        );
        setLstClient(_lstClient);
        setLiquidStakingInfo(lstInfoJson.liquidStakingInfo);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [suiClient]);

  const mintFeePercent = useMemo(
    () =>
      liquidStakingInfo === undefined
        ? undefined
        : new BigNumber(
            liquidStakingInfo.feeConfig.element?.suiMintFeeBps.toString() ?? 0,
          ).div(100),
    [liquidStakingInfo],
  );
  const redeemFeePercent = useMemo(
    () =>
      liquidStakingInfo === undefined
        ? undefined
        : new BigNumber(
            liquidStakingInfo.feeConfig.element?.redeemFeeBps.toString() ?? 0,
          ).div(100),
    [liquidStakingInfo],
  );

  const getStakingFee = useCallback(
    (suiAmount: BigNumber) => {
      if (mintFeePercent === undefined)
        throw new Error("mintFeePercent is undefined");

      return suiAmount
        .times(mintFeePercent.div(100))
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP);
    },
    [mintFeePercent],
  );

  const suiToSsuiExchangeRate = useMemo(() => {
    if (liquidStakingInfo === undefined) return undefined;

    const totalSuiSupply = new BigNumber(
      liquidStakingInfo.storage.totalSuiSupply.toString(),
    ).div(10 ** SUI_DECIMALS);
    const totalSsuiSupply = new BigNumber(
      liquidStakingInfo.lstTreasuryCap.totalSupply.value.toString(),
    ).div(10 ** sSUI_DECIMALS);

    return !totalSuiSupply.eq(0)
      ? totalSsuiSupply.div(totalSuiSupply)
      : new BigNumber(1);
  }, [liquidStakingInfo]);
  console.log(`[Page] suiToSsuiExchangeRate: ${suiToSsuiExchangeRate}`);

  // Obligation
  const OBLIGATION_ID =
    "0xf8dfef417a82155d5cbf485c4e7e061ff11dc1ddfa1370c6a46f0d7dfe4017f0";
  const obligation = userData.obligations.find((o) => o.id === OBLIGATION_ID);
  const obligationOwnerCap = userData.obligationOwnerCaps.find(
    (o) => o.obligationId === obligation?.id,
  );

  return (
    <>
      <Head>
        <title>Suilend | Strategies</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-8">
        {!obligation ? (
          <p>Invalid obligation id ({OBLIGATION_ID})</p>
        ) : obligation.depositPositionCount === 0 &&
          obligation.borrowPositionCount === 0 ? (
          <>
            {!lstClient ||
            !redeemFeePercent ||
            !suiToSsuiExchangeRate ||
            !obligation ||
            !obligationOwnerCap ? (
              <Skeleton className="h-16 w-64" />
            ) : (
              <LoopCard
                lstClient={lstClient}
                sSuiRedeemFeePercent={redeemFeePercent}
                getStakingFee={getStakingFee}
                suiToSsuiExchangeRate={suiToSsuiExchangeRate}
                obligation={obligation}
                obligationOwnerCap={obligationOwnerCap}
              />
            )}
          </>
        ) : obligation.depositPositionCount === 1 &&
          obligation.deposits.some(
            (d) => d.coinType === NORMALIZED_sSUI_COINTYPE,
          ) &&
          obligation.borrowPositionCount === 1 &&
          obligation.borrows.some(
            (b) => b.coinType === NORMALIZED_SUI_COINTYPE,
          ) ? (
          <>
            {!lstClient ||
            !redeemFeePercent ||
            !obligation ||
            !obligationOwnerCap ? (
              <Skeleton className="h-16 w-64" />
            ) : (
              <UnloopCard
                lstClient={lstClient}
                sSuiRedeemFeePercent={redeemFeePercent}
                obligation={obligation}
                obligationOwnerCap={obligationOwnerCap}
              />
            )}
          </>
        ) : (
          <p>
            Invalid obligation
            <br />
            (deposits:{" "}
            {formatList(obligation.deposits.map((d) => d.reserve.token.symbol))}
            , borrows:{" "}
            {formatList(obligation.borrows.map((b) => b.reserve.token.symbol))})
          </p>
        )}
      </div>
    </>
  );
}

export default function Strategies() {
  return <Page />;
}
