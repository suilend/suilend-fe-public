import { useState } from "react";

import BigNumber from "bignumber.js";
import { toast } from "sonner";

import { formatToken, formatUsd } from "@suilend/sui-fe";

import Button from "@/components/shared/Button";
import LabelWithValue from "@/components/shared/LabelWithValue";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TBodySans } from "@/components/shared/Typography";
import { Input } from "@/components/ui/input";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useVaultContext } from "@/contexts/VaultContext";
import { ParsedVault } from "@/fetchers/parseVault";
import { VaultParsedObligation } from "@/fetchers/parseVault";
import { cn } from "@/lib/utils";

export default function VaultObligationCard({
  vaultData,
  obligation,
}: {
  vaultData: ParsedVault;
  obligation: VaultParsedObligation;
}) {
  const { LENDING_MARKET_METADATA_MAP } = useLoadedAppContext();
  const { deployFunds, withdrawDeployedFunds } = useVaultContext();

  const [useMaxWithdrawAmount, setUseMaxWithdrawAmount] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const onMaxWithdrawClick = () => {
    setUseMaxWithdrawAmount(true);
    setWithdrawAmount(
      obligation.depositedCTokenAmount
        .div(new BigNumber(10).pow(vaultData.baseCoinMetadata?.decimals ?? 0))
        .toString(),
    );
  };

  const [useMaxDeployAmount, setUseMaxDeployAmount] = useState(false);
  const [deployAmount, setDeployAmount] = useState("");

  const onMaxDeployClick = () => {
    setUseMaxDeployAmount(true);
    setDeployAmount(vaultData.undeployedAmountToken.toString());
  };

  const baseCoinType = vaultData.baseCoinType;

  return (
    <div className="flex flex-col gap-3 py-4">
      <TBody>
        {LENDING_MARKET_METADATA_MAP[obligation.lendingMarketId]?.name}
      </TBody>
      <LabelWithValue
        label="Obligation ID"
        value={obligation.obligationId}
        horizontal
        isId
      />
      <LabelWithValue
        label="Market type"
        value={obligation.marketType || "-"}
        horizontal
        isType
      />
      <LabelWithValue
        label="Lending market ID"
        value={obligation.lendingMarketId ?? "Unresolved"}
        horizontal
        isId
      />
      {Boolean(obligation.parsedObligation?.deposits?.length) && (
        <div className="flex w-full flex-col gap-3">
          <TBodySans>Deposits</TBodySans>
          {obligation.parsedObligation?.deposits?.map((d) => (
            <div
              key={d.coinType}
              className="flex w-full items-center justify-between"
            >
              <div className="flex flex-row items-center gap-2">
                <TokenLogo token={d.reserve.token} size={24} />
                <div className="flex flex-col gap-1">
                  <TBody>{d.reserve.token.symbol}</TBody>
                  <TBody className="text-xs text-muted-foreground">
                    {formatUsd(d.depositedAmount)}
                  </TBody>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <TBody>{formatToken(d.depositedAmount)}</TBody>
                <TBody className="text-xs text-muted-foreground">
                  {formatUsd(d.depositedAmountUsd)}
                </TBody>
              </div>
            </div>
          ))}
        </div>
      )}
      {Boolean(obligation.parsedObligation?.borrows?.length) && (
        <div className="flex w-full flex-col gap-3">
          <TBodySans>Borrows</TBodySans>
          {obligation.parsedObligation?.borrows?.map((b) => (
            <div
              key={b.coinType}
              className="flex w-full items-center justify-between"
            >
              <div className="flex flex-row items-center gap-2">
                <TokenLogo token={b.reserve.token} size={24} />
                <div className="flex flex-col gap-1">
                  <TBody>{b.reserve.token.symbol}</TBody>
                  <TBody className="text-xs text-muted-foreground">
                    {formatUsd(b.borrowedAmount)}
                  </TBody>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <TBody>{formatToken(b.borrowedAmount)}</TBody>
                <TBody className="text-xs text-muted-foreground">
                  {formatUsd(b.borrowedAmountUsd)}
                </TBody>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Deploy */}
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          const amount = (form.elements.namedItem("amount") as HTMLInputElement)
            .value;
          try {
            if (!vaultData || !baseCoinType)
              throw new Error("Vault not loaded");
            if (!vaultData.managerCapId)
              throw new Error("Manager cap not found in connected wallet");

            const baseAmount = new BigNumber(amount).times(
              new BigNumber(10).pow(vaultData.baseCoinMetadata?.decimals ?? 0),
            );

            await deployFunds({
              vault: vaultData,
              lendingMarketId: obligation.lendingMarketId,
              amount: baseAmount.toString(),
            });
            (form.elements.namedItem("amount") as HTMLInputElement).value = "";
          } catch (err: any) {
            toast.error(err?.message || "Failed to deploy");
          }
        }}
      >
        <TBodySans>Deploy funds</TBodySans>
        <div className="flex flex-row gap-2">
          <Input
            name="amount"
            inputMode="numeric"
            value={deployAmount}
            onChange={(e) => {
              setDeployAmount(e.target.value);
              setUseMaxDeployAmount(false);
            }}
          />
          <Button type="submit" className="h-full">
            DEPLOY
          </Button>
          <Button
            className={cn(
              useMaxDeployAmount &&
                "border-secondary bg-secondary/5 disabled:opacity-100",
              "h-full",
            )}
            labelClassName={cn(
              "uppercase",
              useMaxDeployAmount && "text-primary-foreground",
            )}
            variant="secondaryOutline"
            onClick={onMaxDeployClick}
            disabled={useMaxDeployAmount}
          >
            Max
          </Button>
        </div>
      </form>

      {/* Withdraw */}
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          const ctokenAmount = (
            form.elements.namedItem("ctokenAmount") as HTMLInputElement
          ).value;
          try {
            if (!vaultData || !baseCoinType)
              throw new Error("Vault not loaded");
            if (!vaultData.managerCapId)
              throw new Error("Manager cap not found in connected wallet");
            await withdrawDeployedFunds({
              vault: vaultData,
              lendingMarketId: obligation.lendingMarketId,
              ctokenAmount: new BigNumber(ctokenAmount)
                .times(
                  new BigNumber(10).pow(
                    vaultData.baseCoinMetadata?.decimals ?? 0,
                  ),
                )
                .toString(),
            });
            (
              form.elements.namedItem("ctokenAmount") as HTMLInputElement
            ).value = "";
          } catch (err: any) {
            toast.error(err?.message || "Failed to withdraw");
          }
        }}
      >
        <TBodySans>Withdraw funds</TBodySans>
        <div className="flex flex-row gap-2">
          <Input
            name="ctokenAmount"
            inputMode="numeric"
            value={withdrawAmount}
            onChange={(e) => {
              setWithdrawAmount(e.target.value);
              setUseMaxWithdrawAmount(false);
            }}
          />
          <Button type="submit" className="h-full">
            WITHDRAW
          </Button>
          <Button
            className={cn(
              useMaxWithdrawAmount &&
                "border-secondary bg-secondary/5 disabled:opacity-100",
              "h-full",
            )}
            labelClassName={cn(
              "uppercase",
              useMaxWithdrawAmount && "text-primary-foreground",
            )}
            variant="secondaryOutline"
            onClick={onMaxWithdrawClick}
            disabled={useMaxWithdrawAmount}
          >
            Max
          </Button>
        </div>
      </form>
    </div>
  );
}
