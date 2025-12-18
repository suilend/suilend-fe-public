import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";

import { TX_TOAST_DURATION } from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import {
  TRANSFER_POLICY,
  TRANSFER_POLICY_CAP,
} from "@/components/admin/thirdPartyFees/RootletsCard";
import TextLink from "@/components/shared/TextLink";
import { ROOTLETS_TYPE } from "@/lib/mSend";

const PERSONAL_KIOSK_RULE_PACKAGE_ID =
  "0x434b5bd8f6a7b05fede0ff46c6e511d71ea326ed38056e3bcd681d2d7c2a7879";

export default function RepayObligation() {
  const { explorer } = useSettingsContext();
  const { signExecuteAndWaitForTransaction } = useWalletContext();

  const submit = async () => {
    try {
      const transaction = new Transaction();

      transaction.moveCall({
        target: "0x2::transfer_policy::remove_rule",
        arguments: [
          transaction.object(TRANSFER_POLICY),
          transaction.object(TRANSFER_POLICY_CAP),
        ],
        typeArguments: [
          ROOTLETS_TYPE,
          "0x0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802::personal_kiosk_rule::Rule",
          "bool",
        ],
      });

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Removed rule", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (err) {
      toast.error("Failed to remove rule", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    }
  };

  return <button onClick={submit}>Submit</button>;
}
