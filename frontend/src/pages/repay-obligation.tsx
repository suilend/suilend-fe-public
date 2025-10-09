import { useEffect, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { toast } from "sonner";

import {
  LENDING_MARKET_ID,
  ParsedObligation,
  SuilendClient,
  parseObligation,
} from "@suilend/sdk";
import * as simulate from "@suilend/sdk/utils/simulate";
import { TX_TOAST_DURATION, formatToken, isSui } from "@suilend/sui-fe";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import StandardSelect from "@/components/shared/StandardSelect";
import TextLink from "@/components/shared/TextLink";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { MAX_BALANCE_SUI_SUBTRACTED_AMOUNT } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function RepayObligation() {
  const { explorer, suiClient } = useSettingsContext();
  const { allAppData } = useLoadedAppContext();
  const { getBalance } = useLoadedUserContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();

  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];

  const [obligationId, setObligationId] = useState<string>("");
  const [obligation, setObligation] = useState<ParsedObligation | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!obligationId) return;

    (async () => {
      try {
        const rawObligation = await SuilendClient.getObligation(
          obligationId,
          appDataMainMarket.suilendClient.lendingMarket.$typeArgs,
          suiClient,
        );
        const refreshedObligation = simulate.refreshObligation(
          rawObligation,
          appDataMainMarket.refreshedRawReserves,
        );
        const obligation = parseObligation(
          refreshedObligation,
          appDataMainMarket.reserveMap,
        );

        setObligation(obligation);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [
    obligationId,
    appDataMainMarket.suilendClient.lendingMarket.$typeArgs,
    suiClient,
    appDataMainMarket.refreshedRawReserves,
    appDataMainMarket.reserveMap,
  ]);

  const [coinType, setCoinType] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [isMax, setIsMax] = useState<boolean>(false);

  const repay = async () => {
    const balance = getBalance(coinType);
    const borrowedAmount = obligation?.borrows.find(
      (borrow) => borrow.coinType === coinType,
    )?.borrowedAmount;
    if (!borrowedAmount) return;

    if (!coinType) return;
    if (!isMax) {
      if (!value) return;
      if (new BigNumber(value).gt(balance)) {
        showErrorToast(
          "Failed to repay",
          new Error("Insufficient SUI"),
          undefined,
          true,
        );
        return;
      }
    }

    try {
      if (!address) throw new Error("Wallet not connected");

      const transaction = new Transaction();

      const reserve = appDataMainMarket.reserveMap[coinType];
      const borrowedAmountUsd = borrowedAmount.times(reserve.price);
      const fullRepaymentAmount = (
        borrowedAmountUsd.lt(0.1)
          ? new BigNumber(0.1).div(reserve.price) // $0.1 in borrow coinType
          : borrowedAmountUsd.lt(1)
            ? borrowedAmount.times(1.1) // 10% buffer
            : borrowedAmountUsd.lt(10)
              ? borrowedAmount.times(1.01) // 1% buffer
              : borrowedAmount.times(1.001)
      ) // 0.1% buffer
        .decimalPlaces(reserve.token.decimals, BigNumber.ROUND_DOWN);

      const submitAmount = isMax
        ? BigNumber.min(
            BigNumber.max(
              0,
              balance.minus(
                isSui(reserve.coinType) ? MAX_BALANCE_SUI_SUBTRACTED_AMOUNT : 0,
              ),
            ),
            fullRepaymentAmount,
          )
            .times(10 ** reserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString()
        : new BigNumber(value)
            .times(10 ** reserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString();
      console.log("XXXX", +balance, +submitAmount);

      await appDataMainMarket.suilendClient.repayIntoObligation(
        address,
        obligationId,
        coinType,
        submitAmount,
        transaction,
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(`Successfully repaid ${reserve.token.symbol}`, {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (err) {
      showErrorToast("Failed to repay", err as Error, undefined, true);
      console.error(err);
    }
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <p className="text-lg font-bold">Repay obligation borrows</p>
      <input
        className="border bg-background text-foreground"
        placeholder="Obligation ID"
        value={obligationId}
        onChange={(e) => setObligationId(e.target.value)}
      />

      <StandardSelect
        items={(obligation?.borrows ?? []).map((borrow) => ({
          id: borrow.coinType,
          name: `${formatToken(borrow.borrowedAmount, {
            dp: appDataMainMarket.coinMetadataMap[borrow.coinType].decimals,
            trimTrailingZeros: true,
          })} ${appDataMainMarket.coinMetadataMap[borrow.coinType].symbol}`,
        }))}
        value={coinType}
        onChange={setCoinType}
      />

      <div className="flex flex-row items-stretch gap-2">
        <input
          className="flex-1 rounded-sm border bg-background text-foreground"
          placeholder="Amount"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setIsMax(false);
          }}
        />
        <button
          className={cn(
            "h-10 rounded-sm border px-2",
            isMax && "border-secondary bg-secondary/5",
          )}
          onClick={() => {
            setValue("");
            setIsMax((is) => !is);
          }}
        >
          MAX
        </button>
      </div>

      <button onClick={() => repay()}>Repay</button>
    </div>
  );
}
