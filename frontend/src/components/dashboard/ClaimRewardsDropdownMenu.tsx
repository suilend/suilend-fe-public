import { CSSProperties, useState } from "react";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { LENDING_MARKETS, RewardSummary } from "@suilend/sdk";
import {
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  Token,
  formatList,
  getToken,
} from "@suilend/sui-fe";
import { showErrorToast, useSettingsContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import Spinner from "@/components/shared/Spinner";
import StandardSelect from "@/components/shared/StandardSelect";
import TextLink from "@/components/shared/TextLink";
import { TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { TX_TOAST_DURATION } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ClaimRewardsDropdownMenuProps {
  rewardsMap: Record<string, RewardSummary[]>;
}

export default function ClaimRewardsDropdownMenu({
  rewardsMap,
}: ClaimRewardsDropdownMenuProps) {
  const { explorer } = useSettingsContext();
  const { allAppData, appData, closeLedgerHashDialog } = useLoadedAppContext();
  const { refresh, obligation } = useLoadedUserContext();

  const { claimRewards } = useDashboardContext();

  const appDataMainMarket =
    allAppData.allLendingMarketData[LENDING_MARKETS[0].id];

  const tokens: Token[] = Object.values(rewardsMap).map((r) =>
    getToken(
      r[0].stats.rewardCoinType,
      appData.coinMetadataMap[r[0].stats.rewardCoinType],
    ),
  );

  const tokensThatCanBeDeposited = (() => {
    const tokensWithReserves = tokens.filter((t) =>
      Object.keys(appData.reserveMap).includes(t.coinType),
    );

    return !obligation
      ? tokensWithReserves.slice(0, 5)
      : [
          ...tokensWithReserves.filter(
            (t) =>
              obligation.deposits.some((d) => d.coinType === t.coinType) &&
              !obligation.borrows.some((b) => b.coinType === t.coinType),
          ),
          ...tokensWithReserves
            .filter(
              (t) =>
                !obligation.deposits.some((d) => d.coinType === t.coinType) &&
                !obligation.borrows.some((b) => b.coinType === t.coinType),
            )
            .slice(0, 5 - obligation.deposits.length),
        ];
  })();

  // Claim and deposit as SUI/USDC/SEND
  const canDepositAsMap: Record<string, boolean> = [
    NORMALIZED_SUI_COINTYPE,
    NORMALIZED_USDC_COINTYPE,
    NORMALIZED_SEND_COINTYPE,
  ].reduce(
    (acc, coinType) => ({
      ...acc,
      [coinType]: !obligation
        ? 1 <= 5
        : (obligation.deposits.some((d) => d.coinType === coinType) ||
            obligation.deposits.length + 1 <= 5) &&
          !obligation.borrows.some((b) => b.coinType === coinType),
    }),
    {} as Record<string, boolean>,
  );

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  // Claim
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swappingToCoinType, setSwappingToCoinType] = useState<string>(
    NORMALIZED_SUI_COINTYPE,
  );
  const [isDepositing, setIsDepositing] = useState<boolean>(false);

  const submit = async () => {
    if (isClaiming) return;

    setIsClaiming(true);

    const filteredRewardsMap: Record<string, RewardSummary[]> = (() => {
      const coinTypes = Object.keys(rewardsMap).filter((coinType) => {
        if (isSwapping) {
          return isDepositing ? canDepositAsMap[swappingToCoinType] : true;
        } else {
          return isDepositing
            ? tokensThatCanBeDeposited.some((t) => t.coinType === coinType)
            : true;
        }
      });

      return Object.fromEntries(
        coinTypes.map((coinType) => [coinType, rewardsMap[coinType]]),
      );
    })();

    try {
      const res = await claimRewards(filteredRewardsMap, {
        isSwapping,
        swappingToCoinType,
        isDepositing,
      });
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        [
          isDepositing ? "Claimed and deposited" : "Claimed",
          formatList(
            Object.keys(filteredRewardsMap).map(
              (coinType) => appData.coinMetadataMap[coinType].symbol,
            ),
          ),
          "rewards",
          isSwapping
            ? `as ${appDataMainMarket.coinMetadataMap[swappingToCoinType].symbol}`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      showErrorToast(
        [
          "Failed to",
          isDepositing ? "claim and deposit" : "claim",
          formatList(
            Object.keys(filteredRewardsMap).map(
              (coinType) => appData.coinMetadataMap[coinType].symbol,
            ),
          ),
          "rewards",
          isSwapping
            ? `as ${appDataMainMarket.coinMetadataMap[swappingToCoinType].symbol}`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsClaiming(false);
      refresh();

      closeLedgerHashDialog();
    }
  };

  return (
    <DropdownMenu
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className="w-[150px]"
          labelClassName="uppercase"
          endIcon={isClaiming ? undefined : <Icon />}
          disabled={isClaiming}
        >
          {isClaiming ? <Spinner size="sm" /> : "Claim rewards"}
        </Button>
      }
      contentProps={{
        align: "start",
        style: { "--bg-color": "hsl(var(--popover))" } as CSSProperties,
      }}
      items={
        <>
          {/* Claim */}
          <DropdownMenuItem className="w-full" onClick={() => submit()}>
            <TLabelSans className="text-foreground">Claim</TLabelSans>
          </DropdownMenuItem>

          {/* and deposit */}
          <div className="mt-1 flex w-full flex-col gap-1.5">
            {/* Checkbox */}
            <div
              className="group flex w-full w-max cursor-pointer flex-row items-center gap-2"
              onClick={() => setIsDepositing(!isDepositing)}
            >
              <button
                className={cn(
                  "flex h-4 w-4 flex-row items-center justify-center rounded-sm border border-muted/25 transition-colors",
                  isDepositing
                    ? "border-secondary bg-secondary/25"
                    : "group-hover:border-muted/50",
                )}
              >
                {isDepositing && <Check className="h-4 w-4 text-foreground" />}
              </button>

              <TLabelSans
                className={cn(
                  "transition-colors",
                  isDepositing
                    ? "text-foreground"
                    : "group-hover:text-foreground",
                )}
              >
                and deposit
              </TLabelSans>
            </div>

            {/* Note */}
            {isDepositing &&
              !isSwapping &&
              tokensThatCanBeDeposited.length < tokens.length && (
                <TLabelSans className="text-[10px]">
                  {`Note: Cannot claim and deposit ${formatList(
                    tokens
                      .filter(
                        (t) =>
                          !tokensThatCanBeDeposited
                            .map((_t) => _t.coinType)
                            .includes(t.coinType),
                      )
                      .map((t) => t.symbol),
                  ).replace(
                    "and",
                    "or",
                  )} (max 5 deposit positions, no borrows).`}
                </TLabelSans>
              )}
          </div>

          {/* and swap to... */}
          <div className="mt-1 flex w-full flex-col gap-1.5">
            <div className="flex flex-row items-center gap-4">
              {/* Checkbox */}
              <div
                className="group flex w-full w-max cursor-pointer flex-row items-center gap-2"
                onClick={() => setIsSwapping(!isSwapping)}
              >
                <button
                  className={cn(
                    "flex h-4 w-4 flex-row items-center justify-center rounded-sm border border-muted/25 transition-colors",
                    isSwapping
                      ? "border-secondary bg-secondary/25"
                      : "group-hover:border-muted/50",
                  )}
                >
                  {isSwapping && <Check className="h-4 w-4 text-foreground" />}
                </button>

                <TLabelSans
                  className={cn(
                    "transition-colors",
                    isSwapping
                      ? "text-foreground"
                      : "group-hover:text-foreground",
                  )}
                >
                  and swap to...
                </TLabelSans>
              </div>

              {/* Select */}
              <StandardSelect
                className={cn(
                  "h-6 w-max min-w-0 px-2",
                  isSwapping && "text-foreground",
                )}
                items={Object.keys(canDepositAsMap).map((coinType) => ({
                  id: coinType,
                  name: appDataMainMarket.coinMetadataMap[coinType].symbol,
                }))}
                value={swappingToCoinType}
                onChange={setSwappingToCoinType}
              />
            </div>

            {/* Note */}
            {isDepositing &&
              isSwapping &&
              !canDepositAsMap[swappingToCoinType] && (
                <TLabelSans className="text-[10px]">
                  {`Note: Cannot claim and deposit as ${appDataMainMarket.coinMetadataMap[swappingToCoinType].symbol} (max 5 deposit positions, no borrows).`}
                </TLabelSans>
              )}
          </div>
        </>
      }
    />
  );
}
