import { CSSProperties, useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { RewardSummary } from "@suilend/sdk";
import {
  NORMALIZED_SEND_COINTYPE,
  Token,
  formatList,
  getToken,
} from "@suilend/sui-fe";
import { showErrorToast, useSettingsContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import SendTokenLogo from "@/components/shared/SendTokenLogo";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import TokenLogos from "@/components/shared/TokenLogos";
import { TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { TX_TOAST_DURATION } from "@/lib/constants";

interface ClaimRewardsDropdownMenuProps {
  rewardsMap: Record<string, RewardSummary[]>;
}

export default function ClaimRewardsDropdownMenu({
  rewardsMap,
}: ClaimRewardsDropdownMenuProps) {
  const { explorer } = useSettingsContext();
  const { appData } = useLoadedAppContext();
  const { refresh, obligation } = useLoadedUserContext();

  const { claimRewards } = useDashboardContext();

  const tokens: Token[] = Object.values(rewardsMap).map((r) =>
    getToken(
      r[0].stats.rewardCoinType,
      appData.coinMetadataMap[r[0].stats.rewardCoinType],
    ),
  );

  // Deposit SEND
  const canDepositAsSend = !obligation
    ? 1 <= 5
    : obligation.deposits.some(
        (d) => d.coinType === NORMALIZED_SEND_COINTYPE,
      ) || obligation.deposits.length + 1 <= 5;

  // Tokens that can be deposited
  const tokensThatCanBeDeposited = (() => {
    const tokensWithReserves = tokens.filter((t) =>
      Object.keys(appData.reserveMap).includes(t.coinType),
    );

    return !obligation
      ? tokensWithReserves.slice(0, 5)
      : [
          ...tokensWithReserves.filter((t) =>
            obligation.deposits.some((d) => d.coinType === t.coinType),
          ),
          ...tokensWithReserves
            .filter(
              (t) =>
                !obligation.deposits.some((d) => d.coinType === t.coinType),
            )
            .slice(0, 5 - obligation.deposits.length),
        ];
  })();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  // Claim
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const submit = async (args: { asSend: boolean; isDepositing: boolean }) => {
    if (isClaiming) return;

    setIsClaiming(true);

    const filteredRewardsMap: Record<string, RewardSummary[]> = (() => {
      const coinTypes = Object.keys(rewardsMap).filter((coinType) => {
        if (args?.asSend) {
          if (args?.isDepositing) return canDepositAsSend;
          return true;
        } else {
          if (args?.isDepositing)
            return tokensThatCanBeDeposited.some(
              (t) => t.coinType === coinType,
            );
          return true;
        }
      });

      return Object.fromEntries(
        coinTypes.map((coinType) => [coinType, rewardsMap[coinType]]),
      );
    })();

    if (args?.asSend) {
      for (const [coinType, rewards] of Object.entries(filteredRewardsMap)) {
        try {
          const res = await claimRewards({ [coinType]: rewards }, args);
          const txUrl = explorer.buildTxUrl(res.digest);

          toast.success(
            [
              args?.isDepositing ? "Claimed and deposited" : "Claimed",
              appData.coinMetadataMap[coinType].symbol,
              "rewards as SEND",
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
              args?.isDepositing ? "claim and deposit" : "claim",
              appData.coinMetadataMap[coinType].symbol,
              "rewards as SEND",
            ]
              .filter(Boolean)
              .join(" "),
            err as Error,
            undefined,
            true,
          );
          break;
        } finally {
          refresh();
        }
      }

      setIsClaiming(false);
    } else {
      try {
        const res = await claimRewards(filteredRewardsMap, args);
        const txUrl = explorer.buildTxUrl(res.digest);

        toast.success(
          [
            args?.isDepositing ? "Claimed and deposited" : "Claimed",
            formatList(
              Object.keys(filteredRewardsMap).map(
                (coinType) => appData.coinMetadataMap[coinType].symbol,
              ),
            ),
            "rewards",
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
            args?.isDepositing ? "claim and deposit" : "claim",
            formatList(
              Object.keys(filteredRewardsMap).map(
                (coinType) => appData.coinMetadataMap[coinType].symbol,
              ),
            ),
            "rewards",
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
      }
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
          {/* Actual - claim */}
          <DropdownMenuItem
            className="flex w-full flex-row items-center justify-between gap-1.5"
            onClick={() => submit({ asSend: false, isDepositing: false })}
          >
            <TLabelSans className="text-foreground">Claim</TLabelSans>
            <TokenLogos className="h-4 w-4" tokens={tokens} />
          </DropdownMenuItem>

          {/* SEND - claim */}
          <DropdownMenuItem
            className="flex w-full flex-row items-center justify-between gap-1.5"
            onClick={() => submit({ asSend: true, isDepositing: false })}
          >
            <TLabelSans className="text-foreground">Claim as SEND</TLabelSans>
            <SendTokenLogo className="h-4 w-4" />
          </DropdownMenuItem>

          {/* Actual - claim and deposit */}
          <div className="flex w-full flex-col gap-1.5">
            <DropdownMenuItem
              className="flex w-full flex-row items-center justify-between gap-1.5"
              isDisabled={tokensThatCanBeDeposited.length === 0}
              onClick={() => submit({ asSend: false, isDepositing: true })}
            >
              <TLabelSans className="text-foreground">
                Claim and deposit
              </TLabelSans>
              <TokenLogos className="h-4 w-4" tokens={tokens} />
            </DropdownMenuItem>
            {tokensThatCanBeDeposited.length < tokens.length && (
              <TLabelSans className="mb-1 pl-3 text-[10px]">
                {`Cannot claim and deposit ${formatList(
                  tokens
                    .filter(
                      (t) =>
                        !tokensThatCanBeDeposited
                          .map((_t) => _t.coinType)
                          .includes(t.coinType),
                    )
                    .map((t) => t.symbol),
                ).replace("and", "or")} (max 5 deposit positions).`}
                {tokensThatCanBeDeposited.length > 0 &&
                  ` Only ${formatList(tokensThatCanBeDeposited.map((t) => t.symbol))} will be claimed and deposited.`}
              </TLabelSans>
            )}
          </div>

          {/* SEND - claim and deposit */}
          <div className="flex w-full flex-col gap-1.5">
            <DropdownMenuItem
              className="flex w-full flex-row items-center justify-between gap-1.5"
              isDisabled={!canDepositAsSend}
              onClick={() => submit({ asSend: true, isDepositing: true })}
            >
              <TLabelSans className="text-foreground">
                Claim and deposit as SEND
              </TLabelSans>
              <SendTokenLogo className="h-4 w-4" />
            </DropdownMenuItem>

            {!canDepositAsSend && (
              <TLabelSans className="pl-3 text-[10px]">
                Cannot claim and deposit SEND (max 5 deposit positions).
              </TLabelSans>
            )}
          </div>
        </>
      }
    />
  );
}
