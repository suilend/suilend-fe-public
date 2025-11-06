import router from "next/router";
import { useCallback } from "react";

import BigNumber from "bignumber.js";

import { formatUsd } from "@suilend/sui-fe";
import { shallowPushQuery } from "@suilend/sui-fe-next";

import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { QueryParams as LstStrategyDialogQueryParams } from "@/components/strategies/LstStrategyDialog";
import { useVaultContext } from "@/contexts/VaultContext";
import { ParsedVault } from "@/fetchers/parseVault";

import VaultCard from "./VaultCard";
import VaultDialog from "./VaultDialog";

function ComingSoonStrategyCard() {
  return (
    <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm border bg-card">
      <TLabelSans>Coming soon</TLabelSans>
    </div>
  );
}

export default function VaultPanel() {
  const { vaults } = useVaultContext();

  const usedVaults = vaults.filter((vault) => vault.userShares.gt(0));
  const unusedVaults = vaults.filter((vault) => vault.userShares.eq(0));

  const openVaultDialog = useCallback(
    (vault: ParsedVault) => {
      shallowPushQuery(router, {
        ...router.query,
        [LstStrategyDialogQueryParams.STRATEGY_NAME]:
          vault.metadata?.queryParam,
      });
    },
    [router],
  );

  return (
    <>
      {vaults.map((vault) => (
        <VaultDialog key={vault.id} vault={vault} />
      ))}
      <div className="flex w-full flex-col gap-6">
        {/* Open positions */}
        {usedVaults.length > 0 && (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-row items-center gap-2">
                <TBody className="uppercase">Open vaults</TBody>
                <TLabel>
                  {formatUsd(
                    usedVaults.reduce((acc, vault) => {
                      return acc.plus(vault.userSharesBalance);
                    }, new BigNumber(0)),
                  )}
                </TLabel>
              </div>
            </div>

            {/* Min card width: 400px */}
            <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1316px]:grid-cols-3">
              {usedVaults.map((vault) => (
                <VaultCard
                  key={vault.id}
                  vault={vault}
                  onClick={() => openVaultDialog(vault)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All strategies */}
        <div className="flex w-full flex-col gap-4">
          <TBody className="uppercase">All vaults</TBody>

          {/* Min card width: 400px */}
          <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1316px]:grid-cols-3">
            {unusedVaults.map((vault) => {
              return (
                <VaultCard
                  key={vault.id}
                  vault={vault}
                  onClick={() => openVaultDialog(vault)}
                />
              );
            })}

            <ComingSoonStrategyCard />
          </div>
        </div>
      </div>
    </>
  );
}
