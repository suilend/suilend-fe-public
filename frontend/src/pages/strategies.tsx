import Head from "next/head";
import { useEffect, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
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

function Page() {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { appData } = useLoadedAppContext();
  const { userData, refresh } = useLoadedUserContext();

  // sSUI LST client
  const [lstClient, setLstClient] = useState<LstClient | undefined>(undefined);
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
      } catch (err) {
        console.error(err);
      }
    })();
  }, [suiClient]);

  // Obligation
  const obligation = userData.obligations.find(
    (o) =>
      o.id ===
      "0x9d0bf4ea905a4965c4a914c3a1506c597310efc33fb8552d503a31a04a8e9ff7",
  );
  const obligationOwnerCap = userData.obligationOwnerCaps.find(
    (o) => o.obligationId === obligation?.id,
  );
  console.log("XXX", obligation, obligationOwnerCap, lstClient);

  const setUpLoopedPosition = async () => {
    try {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      if (!lstClient) throw Error("sSUI LST client not found");

      const transaction = new Transaction();

      // 1) Deposit sSUI
      await appData.suilendClient.depositIntoObligation(
        address,
        NORMALIZED_sSUI_COINTYPE,
        `${0.1 * 10 ** 9}`,
        transaction,
        obligationOwnerCap.id,
      );

      // 2) Borrow SUI (MAX)
      await appData.suilendClient.refreshAll(transaction, obligation.original, [
        appData.suilendClient.findReserveArrayIndex(NORMALIZED_sSUI_COINTYPE),
      ]);

      const [borrowCoin] = await appData.suilendClient.borrow(
        obligationOwnerCap.id,
        obligation.id,
        NORMALIZED_SUI_COINTYPE,
        MAX_U64.toString(),
        transaction,
      );

      // 3) Stake for sSUI
      const sSuiCoin = lstClient.mint(transaction, borrowCoin);
      lstClient.rebalance(
        transaction,
        lstClient.liquidStakingObject.weightHookId,
      );
      transaction.transferObjects([sSuiCoin], address);

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Deposited sSUI and borrowed SUI", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (err) {
      showErrorToast(
        `Failed to set up looped position`,
        err as Error,
        undefined,
        true,
      );
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
        <Button onClick={setUpLoopedPosition} disabled={!lstClient}>
          Set up looped position
        </Button>
      </div>
    </>
  );
}

export default function Strategies() {
  return <Page />;
}
