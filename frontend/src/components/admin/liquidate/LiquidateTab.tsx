import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID, normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import pLimit from "p-limit";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { WAD } from "@suilend/sdk";
import { forgive } from "@suilend/sdk/_generated/suilend/lending-market/functions";
import { MAX_U64, formatUsd } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import LiquidateDialog from "@/components/admin/liquidate/LiquidateDialog";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import { TLabelSans, TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LiquidateTabProps {
  obligationId?: string;
}

export default function LiquidateTab({ obligationId }: LiquidateTabProps) {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();

  const { appData } = useAdminContext();

  // Forgive
  // Forgive - Borrow coinType
  const [borrowCoinType, setBorrowCoinType] = useState<string>("");

  // Forgive - Obligation IDs
  const [obligationIds, setObligationIds] = useState<string>("");

  // Forgive - Amount
  const [amount, setAmount] = useState<string>("");

  const onMaxClick = () => {
    setAmount(MAX_U64.toString());
  };

  // Forgive - Submit
  const forgiveObligations = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    const transaction = new Transaction();
    transaction.setSender(address);

    try {
      const borrowReserve = appData.reserveMap[borrowCoinType];
      if (!borrowReserve) throw new Error("Error: borrowReserve not found");

      const obligationIdsSplit = obligationIds
        .split(",")
        .map((id) => id.trim());

      const limit = pLimit(10);
      const obligations = await Promise.all(
        obligationIdsSplit.map((id) =>
          limit(() => appData.suilendClient.getObligation(id)),
        ),
      );

      const submitAmount =
        amount === MAX_U64.toString()
          ? MAX_U64.toString()
          : new BigNumber(amount)
              .times(10 ** borrowReserve.mintDecimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString();

      for (const obligation of obligations) {
        const totalDepositedAmountUsd = new BigNumber(
          obligation.depositedValueUsd.value.toString(),
        ).div(WAD);
        if (!totalDepositedAmountUsd.eq(0))
          throw new Error(
            `Error: obligation ${obligation.id} has non-zero depositedValueUsd (${formatUsd(totalDepositedAmountUsd)})`,
          );

        const borrow = obligation.borrows.find(
          (b) =>
            normalizeStructTag(b.coinType.name) ===
            normalizeStructTag(borrowReserve.coinType),
        );
        if (!borrow)
          throw new Error(
            `Error: obligation ${obligation.id} has no borrow with coinType ${borrowReserve.coinType}`,
          );

        const borrowedAmount = new BigNumber(
          borrow.borrowedAmount.value.toString(),
        )
          .div(WAD)
          .div(10 ** borrowReserve.mintDecimals);
        if (!borrowedAmount.gt(0))
          throw new Error(
            `Error: obligation ${obligation.id} has no borrowed amount with coinType ${borrowReserve.coinType}`,
          );

        await appData.suilendClient.refreshAll(transaction, obligation);
        forgive(
          transaction,
          [
            appData.suilendClient.lendingMarket.$typeArgs[0],
            borrowReserve.coinType,
          ],
          {
            lendingMarketOwnerCap: appData.lendingMarket.ownerCapId,
            lendingMarket: appData.lendingMarket.id,
            reserveArrayIndex: borrowReserve.arrayIndex,
            obligationId: obligation.id,
            clock: SUI_CLOCK_OBJECT_ID,
            maxForgiveAmount: BigInt(submitAmount),
          },
        );
      }

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Forgave debt");
      setObligationIds("");
      setBorrowCoinType("");
      setAmount("");
    } catch (err) {
      toast.error("Failed to forgive debt", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <TTitle className="uppercase">Liquidate</TTitle>
        </CardHeader>
        <CardContent className="flex flex-row flex-wrap gap-2">
          <LiquidateDialog initialObligationId={obligationId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <TTitle className="uppercase">Batch Forgive</TTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <TLabelSans>Borrow coinType</TLabelSans>
            <Input
              id="borrowCoinType"
              value={borrowCoinType}
              onChange={setBorrowCoinType}
            />
          </div>

          <div className="flex flex-col gap-2">
            <TLabelSans>Obligation IDs (comma separated)</TLabelSans>
            <TextareaAutosize
              id="obligationIds"
              className="border-divider flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={obligationIds}
              onChange={(e) => setObligationIds(e.target.value)}
              minRows={1}
            />
          </div>

          <div className="flex flex-col gap-2">
            <TLabelSans>Amount to forgive</TLabelSans>
            <div className="flex flex-row gap-1">
              <Input id="amount" value={amount} onChange={setAmount} />
              <Button
                className="h-10"
                variant="secondaryOutline"
                onClick={onMaxClick}
              >
                MAX
              </Button>
            </div>
          </div>

          <Button
            className="w-max"
            labelClassName="uppercase"
            onClick={forgiveObligations}
          >
            Forgive
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
