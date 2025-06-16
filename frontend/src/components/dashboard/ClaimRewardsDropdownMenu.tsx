import { CSSProperties, useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { RewardSummary } from "@suilend/sdk";
import { NORMALIZED_SEND_COINTYPE, Token, getToken } from "@suilend/sui-fe";
import { showErrorToast, useSettingsContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
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
  const submit = async (args: { asSend: boolean; isDepositing: boolean }) => {
    try {
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
          const res = await claimRewards({ [coinType]: rewards }, args);
          const txUrl = explorer.buildTxUrl(res.digest);

          toast.success(
            [
              `${args?.isDepositing ? "Claimed and deposited" : "Claimed"} ${appData.coinMetadataMap[coinType].symbol} rewards`,
              args?.asSend ? "as SEND" : null,
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
        }
      } else {
        const res = await claimRewards(filteredRewardsMap, args);
        const txUrl = explorer.buildTxUrl(res.digest);

        toast.success(
          [
            `${args?.isDepositing ? "Claimed and deposited" : "Claimed"} rewards`,
            args?.asSend ? "as SEND" : null,
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
      }
    } catch (err) {
      showErrorToast(
        [
          "Failed to",
          `${args?.isDepositing ? "claim and deposit" : "claim"} rewards`,
          args?.asSend ? "as SEND" : null,
        ]
          .filter(Boolean)
          .join(" "),
        err as Error,
        undefined,
        true,
      );
    } finally {
      refresh();
    }
  };

  return (
    <DropdownMenu
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className="w-full"
          labelClassName="uppercase"
          endIcon={<Icon />}
        >
          Claim rewards
        </Button>
      }
      contentStyle={{ "--bg-color": "hsl(var(--popover))" } as CSSProperties}
      items={
        <>
          {/* SEND - Claim */}
          <DropdownMenuItem
            className="flex w-full flex-row items-center gap-1.5"
            onClick={() => submit({ asSend: true, isDepositing: false })}
          >
            <TLabelSans className="text-foreground">Claim as SEND</TLabelSans>
            <TokenLogos className="h-4 w-4" tokens={tokens} />
          </DropdownMenuItem>

          {/* SEND - Claim and deposit */}
          {canDepositAsSend && (
            <DropdownMenuItem
              className="flex w-full flex-row items-center gap-1.5"
              onClick={() => submit({ asSend: true, isDepositing: true })}
            >
              <TLabelSans className="text-foreground">
                Claim and deposit as SEND
              </TLabelSans>
              <TokenLogos className="h-4 w-4" tokens={tokens} />
            </DropdownMenuItem>
          )}

          {/* Actual */}
          {tokens.length > 0 && (
            <>
              {/* Claim */}
              <DropdownMenuItem
                className="flex w-full flex-row items-center gap-1.5"
                onClick={() => submit({ asSend: false, isDepositing: false })}
              >
                <TLabelSans className="text-foreground">Claim</TLabelSans>
                <TokenLogos className="h-4 w-4" tokens={tokens} />
              </DropdownMenuItem>

              {/* Claim and deposit */}
              {tokensThatCanBeDeposited.length > 0 && (
                <DropdownMenuItem
                  className="flex w-full flex-row items-center gap-1.5"
                  onClick={() => submit({ asSend: false, isDepositing: true })}
                >
                  <TLabelSans className="text-foreground">
                    Claim and deposit
                  </TLabelSans>
                  <TokenLogos
                    className="h-4 w-4"
                    tokens={tokens.filter((t) =>
                      tokensThatCanBeDeposited
                        .map((_t) => _t.coinType)
                        .includes(t.coinType),
                    )}
                  />
                </DropdownMenuItem>
              )}
            </>
          )}
        </>
      }
    />
  );
}
