import { Transaction, TransactionResult } from "@mysten/sui/transactions";

import { ObligationOwnerCap } from "../_generated/suilend/lending-market/structs";
import { SuilendClient } from "../client";

export const createObligationIfNoneExists = (
  suilendClient: SuilendClient,
  transaction: Transaction,
  obligationOwnerCap?: ObligationOwnerCap<string>,
): { obligationOwnerCapId: string | TransactionResult; didCreate: boolean } => {
  let obligationOwnerCapId;
  let didCreate = false;
  if (obligationOwnerCap) obligationOwnerCapId = obligationOwnerCap.id;
  else {
    obligationOwnerCapId = suilendClient.createObligation(transaction);
    didCreate = true;
  }

  return { obligationOwnerCapId, didCreate };
};

export const sendObligationToUser = (
  obligationOwnerCapId: string | TransactionResult,
  address: string,
  transaction: Transaction,
) => {
  transaction.transferObjects(
    [obligationOwnerCapId],
    transaction.pure.address(address),
  );
};
