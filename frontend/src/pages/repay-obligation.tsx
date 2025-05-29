import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";

import { TX_TOAST_DURATION } from "@suilend/sui-fe";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import TextLink from "@/components/shared/TextLink";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function RepayObligation() {
  const { explorer } = useSettingsContext();
  const { appData } = useLoadedAppContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();

  const [obligationId, setObligationId] = useState<string>("");
  const [coinType, setCoinType] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const repay = async () => {
    try {
      if (!address) throw new Error("Wallet not connected");

      const transaction = new Transaction();

      await appData.suilendClient.repayIntoObligation(
        address,
        obligationId,
        coinType,
        amount,
        transaction,
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Successfully repaid", {
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
      <input
        className="border bg-background text-foreground"
        placeholder="coinType"
        value={coinType}
        onChange={(e) => setCoinType(e.target.value)}
      />
      <input
        className="border bg-background text-foreground"
        placeholder="Amount (in MIST)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={() => repay()}>Repay</button>
    </div>
  );
}
