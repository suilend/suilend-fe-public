import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { SUI_DECIMALS, normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import { isSui } from "@suilend/frontend-sui";

export const getTotalGasFee = (res: SuiTransactionBlockResponse) =>
  res.effects
    ? new BigNumber(
        +res.effects.gasUsed.computationCost +
          +res.effects.gasUsed.storageCost -
          +res.effects.gasUsed.storageRebate,
      ).div(10 ** SUI_DECIMALS)
    : new BigNumber(0);

export const getBalanceChange = (
  res: SuiTransactionBlockResponse,
  address: string,
  coinType: string,
  decimals: number,
  multiplier: -1 | 1 = 1,
) => {
  if (!res.balanceChanges) return undefined;

  const balanceChanges = res.balanceChanges.filter(
    (bc) =>
      normalizeStructTag(bc.coinType) === coinType &&
      (bc.owner as { AddressOwner: string })?.AddressOwner === address,
  );
  if (balanceChanges.length === 0) return undefined;

  return balanceChanges
    .reduce(
      (acc, balanceChange) => acc.plus(new BigNumber(+balanceChange.amount)),
      new BigNumber(0),
    )
    .div(10 ** decimals)
    .plus(isSui(coinType) ? getTotalGasFee(res) : 0)
    .times(multiplier);
};
