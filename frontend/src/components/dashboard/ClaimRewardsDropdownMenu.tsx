import { CSSProperties, useMemo, useState } from "react";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";

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
import DropdownMenu from "@/components/shared/DropdownMenu";
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
  rewardsMap: Record<string, { amount: BigNumber; rewards: RewardSummary[] }>;
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
      r.rewards[0].stats.rewardCoinType,
      appData.coinMetadataMap[r.rewards[0].stats.rewardCoinType],
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

  // Swap
  const canSwapMap: Record<string, boolean> = Object.keys(rewardsMap).reduce(
    (acc, coinType) => ({
      ...acc,
      [coinType]: (appData.rewardPriceMap[coinType] ?? new BigNumber(0))
        .times(rewardsMap[coinType].amount)
        .gte(0.01), // Filter out rewards with value < $0.01 (will most likely fail to get a swap quote)
    }),
    {} as Record<string, boolean>,
  );

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

  const [isSwapping, setIsSwapping] = useLocalStorage<boolean>(
    "claimRewards_isSwapping",
    false,
  );
  const [swappingToCoinType, setSwappingToCoinType] = useLocalStorage<string>(
    "claimRewards_swappingToCoinType",
    NORMALIZED_SUI_COINTYPE,
  );
  const [isDepositing, setIsDepositing] = useLocalStorage<boolean>(
    "claimRewards_isDepositing",
    false,
  );

  const submit = async () => {
    if (isClaiming) return;

    setIsClaiming(true);

    const filteredRewardsMap: Record<
      string,
      { amount: BigNumber; rewards: RewardSummary[] }
    > = (() => {
      const coinTypes = Object.keys(rewardsMap).filter((coinType) => {
        if (isSwapping) {
          if (!canSwapMap[coinType]) return false;
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

  // Notes
  const notes: string[] = useMemo(() => {
    const result: string[] = [];

    if (isSwapping && Object.values(canSwapMap).some((v) => !v)) {
      result.push(
        `Cannot swap ${formatList(
          tokens.filter((t) => !canSwapMap[t.coinType]).map((t) => t.symbol),
        ).replace("and", "or")} (amount too low).`,
      );
    }
    if (isDepositing) {
      if (!isSwapping && tokensThatCanBeDeposited.length < tokens.length)
        result.push(
          `Cannot claim and deposit ${formatList(
            tokens
              .filter(
                (t) =>
                  !tokensThatCanBeDeposited
                    .map((_t) => _t.coinType)
                    .includes(t.coinType),
              )
              .map((t) => t.symbol),
          ).replace("and", "or")} (max 5 deposit positions, no borrows).`,
        );
      if (isSwapping && !canDepositAsMap[swappingToCoinType])
        result.push(
          `Cannot claim and deposit as ${appDataMainMarket.coinMetadataMap[swappingToCoinType].symbol} (max 5 deposit positions, no borrows).`,
        );
    }

    return result;
  }, [
    isSwapping,
    canSwapMap,
    tokens,
    isDepositing,
    tokensThatCanBeDeposited,
    canDepositAsMap,
    swappingToCoinType,
    appDataMainMarket.coinMetadataMap,
  ]);

  return (
    <DropdownMenu
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className="w-[150px]"
          labelClassName="uppercase"
          endIcon={<Icon />}
        >
          Claim rewards
        </Button>
      }
      contentProps={{
        align: "start",
        style: {
          "--bg-color": "hsl(var(--popover))",
          minWidth: "240px",
          maxWidth: "240px",
        } as CSSProperties,
      }}
      items={
        <>
          {/* Claim rewards */}
          <Button
            className="mb-1"
            labelClassName="uppercase"
            disabled={
              isClaiming ||
              (isSwapping && Object.values(canSwapMap).every((v) => !v)) ||
              (isDepositing &&
                ((!isSwapping && tokensThatCanBeDeposited.length === 0) ||
                  (isSwapping && !canDepositAsMap[swappingToCoinType])))
            }
            onClick={() => submit()}
          >
            {isClaiming ? <Spinner size="sm" /> : "Claim rewards"}
          </Button>

          {/* and swap to */}
          <div className="flex w-full flex-row items-center gap-3">
            {/* Checkbox */}
            <button
              className="group flex w-full w-max flex-row items-center gap-2 disabled:pointer-events-none disabled:opacity-50"
              disabled={isClaiming}
              onClick={() => setIsSwapping(!isSwapping)}
            >
              <div
                className={cn(
                  "flex h-4 w-4 flex-row items-center justify-center rounded-sm border border-muted/25 transition-colors",
                  isSwapping
                    ? "border-secondary bg-secondary/25"
                    : "group-hover:border-muted/50",
                )}
              >
                {isSwapping && <Check className="h-4 w-4 text-foreground" />}
              </div>

              <TLabelSans
                className={cn(
                  "transition-colors",
                  isSwapping
                    ? "text-foreground"
                    : "group-hover:text-foreground",
                )}
              >
                and swap to
              </TLabelSans>
            </button>

            {/* Select */}
            <StandardSelect
              className={cn(
                "h-6 w-max min-w-0 px-2",
                isSwapping && "text-foreground",
                isClaiming && "pointer-events-none opacity-50", // Disable select when claiming
              )}
              items={Object.keys(canDepositAsMap).map((coinType) => ({
                id: coinType,
                name: appDataMainMarket.coinMetadataMap[coinType].symbol,
              }))}
              value={swappingToCoinType}
              onChange={setSwappingToCoinType}
            />
          </div>

          {/* and deposit */}
          <button
            className="group flex w-full w-max flex-row items-center gap-2 disabled:pointer-events-none disabled:opacity-50"
            disabled={isClaiming}
            onClick={() => setIsDepositing(!isDepositing)}
          >
            <div
              className={cn(
                "flex h-4 w-4 flex-row items-center justify-center rounded-sm border border-muted/25 transition-colors",
                isDepositing
                  ? "border-secondary bg-secondary/25"
                  : "group-hover:border-muted/50",
              )}
            >
              {isDepositing && <Check className="h-4 w-4 text-foreground" />}
            </div>

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
          </button>

          {/* Notes */}
          {notes.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              <TLabelSans className="text-[10px]">Note:</TLabelSans>

              {notes.map((note) => (
                <TLabelSans key={note} className="text-[10px]">
                  • {note}
                </TLabelSans>
              ))}
            </div>
          )}
        </>
      }
    />
  );
}
