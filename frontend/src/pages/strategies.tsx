import Head from "next/head";
import { useEffect, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { toast } from "sonner";

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
} from "@suilend/sui-fe";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import TextLink from "@/components/shared/TextLink";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

const E = 10 ** -3;
const sSUI_DECIMALS = 9;

function Page() {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { appData } = useLoadedAppContext();
  const { userData, refresh } = useLoadedUserContext();

  // sSUI -  LST client and liquid staking info
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

  // sSUI - reserve
  const sSuiReserve = appData.reserveMap[NORMALIZED_sSUI_COINTYPE];

  // Obligation
  const obligation = userData.obligations.find(
    (o) =>
      o.id ===
      "0xb3efca4da772f62489dccae0ef7a519a21cfbfc7e4adcd4f70015389df353431",
  );
  const obligationOwnerCap = userData.obligationOwnerCaps.find(
    (o) => o.obligationId === obligation?.id,
  );

  // Loop and unloop
  const loop = async (sSuiAmount: BigNumber, targetExposure: BigNumber) => {
    try {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");
      if (!lstClient || !liquidStakingInfo)
        throw Error("sSUI LST client not found");

      // Exchange rate
      const totalSuiSupply = new BigNumber(
        liquidStakingInfo.storage.totalSuiSupply.toString(),
      ).div(10 ** SUI_DECIMALS);
      const totalSsuiSupply = new BigNumber(
        liquidStakingInfo.lstTreasuryCap.totalSupply.value.toString(),
      ).div(10 ** sSUI_DECIMALS);

      const mintFeePercent = new BigNumber(
        liquidStakingInfo.feeConfig.element?.suiMintFeeBps.toString() ?? 0,
      ).div(100);

      const getStakingFee = (suiAmount: BigNumber) =>
        suiAmount
          .times(mintFeePercent.div(100))
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP);

      const suiToSsuiExchangeRate = !totalSuiSupply.eq(0)
        ? totalSsuiSupply.div(totalSuiSupply)
        : new BigNumber(1);
      console.log("XXX suiToSsuiExchangeRate", +suiToSsuiExchangeRate);

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
        `XXX sSuiAmount: ${sSuiAmount}, targetExposure: ${targetExposure}x, (min, max): (${minExposure}x, ${maxExposure}x)`,
      );

      const transaction = new Transaction();

      // 1) Deposit sSUI (1x exposure)
      await appData.suilendClient.depositIntoObligation(
        address,
        NORMALIZED_sSUI_COINTYPE,
        sSuiAmount
          .times(10 ** sSUI_DECIMALS)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
        transaction,
        obligationOwnerCap.id,
      );

      // 2) Refresh pyth oracles (sSUI and SUI)
      await appData.suilendClient.refreshAll(transaction, undefined, [
        NORMALIZED_sSUI_COINTYPE,
        NORMALIZED_SUI_COINTYPE,
      ]);

      let sSuiDepositedAmount = sSuiAmount;
      let suiBorrowedAmount = new BigNumber(0);
      for (let i = 0; i < 10; i++) {
        let currentExposure = sSuiDepositedAmount.div(sSuiAmount);
        let pendingExposure = targetExposure.minus(currentExposure);
        console.log(
          `XXX ${i} start |`,
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

        // 3.1) Borrow SUI
        const stepMaxBorrowedSuiAmount = new BigNumber(
          new BigNumber(sSuiReserve.config.openLtvPct / 100).times(
            sSuiDepositedAmount,
          ),
        )
          .minus(suiBorrowedAmount)
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN); // SUI and sSUI use the same pyth feeds (=> same USD prices)
        const stepMaxBorrowedSuiAmount_stakedForSsuiAmount = new BigNumber(
          stepMaxBorrowedSuiAmount.minus(
            getStakingFee(stepMaxBorrowedSuiAmount),
          ),
        )
          .times(suiToSsuiExchangeRate)
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxBorrowedAdditionalExposure =
          stepMaxBorrowedSuiAmount_stakedForSsuiAmount.div(sSuiAmount);

        const stepBorrowedSuiAmount = pendingExposure.gt(
          stepMaxBorrowedAdditionalExposure,
        )
          ? stepMaxBorrowedSuiAmount
          : pendingExposure
              .times(
                sSuiAmount
                  .div(suiToSsuiExchangeRate)
                  .div(new BigNumber(1).minus(mintFeePercent.div(100))),
              )
              .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxBorrow = stepBorrowedSuiAmount.eq(stepMaxBorrowedSuiAmount);
        console.log(
          `XXX ${i} borrow |`,
          JSON.stringify(
            {
              stepMaxBorrowedSuiAmount,
              stepMaxBorrowedSuiAmount_stakedForSsuiAmount,
              stepMaxBorrowedAdditionalExposure,
              stepBorrowedSuiAmount,
              isMaxBorrow,
            },
            null,
            2,
          ),
        );

        const [borrowCoin] = await appData.suilendClient.borrow(
          obligationOwnerCap.id,
          obligation.id,
          NORMALIZED_SUI_COINTYPE,
          isMaxBorrow
            ? MAX_U64.toString()
            : stepBorrowedSuiAmount
                .times(10 ** SUI_DECIMALS)
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
          transaction,
          false,
        );
        suiBorrowedAmount = suiBorrowedAmount.plus(stepBorrowedSuiAmount);

        // 3.2) Stake borrowed SUI for sSUI
        const sSuiCoin = lstClient.mint(transaction, borrowCoin);
        lstClient.rebalance(
          transaction,
          lstClient.liquidStakingObject.weightHookId,
        );

        // 3.3) Deposit sSUI
        const stepDepositedSsuiAmount = new BigNumber(
          stepBorrowedSuiAmount.minus(getStakingFee(stepBorrowedSuiAmount)),
        )
          .times(suiToSsuiExchangeRate)
          .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
        console.log(
          `XXX ${i} deposit |`,
          JSON.stringify({ stepDepositedSsuiAmount }, null, 2),
        );

        appData.suilendClient.deposit(
          sSuiCoin,
          NORMALIZED_sSUI_COINTYPE,
          obligationOwnerCap.id,
          transaction,
        );
        sSuiDepositedAmount = sSuiDepositedAmount.plus(stepDepositedSsuiAmount);

        currentExposure = sSuiDepositedAmount.div(sSuiAmount);
        pendingExposure = targetExposure.minus(currentExposure);
        console.log(
          `XXX ${i} end |`,
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

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Looped", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (err) {
      showErrorToast("Failed to loop", err as Error, undefined, true);
    } finally {
      refresh();
    }
  };

  return (
    <>
      <Head>
        <title>Suilend | Strategies</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-8">
        <Button
          onClick={() => loop(new BigNumber(0.01), new BigNumber(3))}
          disabled={!lstClient}
        >
          Loop
        </Button>
        {/* <Button onClick={() => unloop()} disabled={!lstClient}>
          Unloop
        </Button> */}
      </div>
    </>
  );
}

export default function Strategies() {
  return <Page />;
}
