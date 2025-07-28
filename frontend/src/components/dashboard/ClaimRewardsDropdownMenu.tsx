import { CSSProperties, useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { RewardSummary } from "@suilend/sdk";
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
import SendTokenLogo from "@/components/shared/SendTokenLogo";
import Spinner from "@/components/shared/Spinner";
import SuiTokenLogo from "@/components/shared/SuiTokenLogo";
import TextLink from "@/components/shared/TextLink";
import { TLabelSans } from "@/components/shared/Typography";
import UsdcTokenLogo from "@/components/shared/UsdcTokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { TX_TOAST_DURATION } from "@/lib/constants";

import { Separator } from "../ui/separator";

interface ClaimRewardsDropdownMenuProps {
  rewardsMap: Record<string, RewardSummary[]>;
}

export default function ClaimRewardsDropdownMenu({
  rewardsMap,
}: ClaimRewardsDropdownMenuProps) {
  const { explorer } = useSettingsContext();
  const { appData, closeLedgerHashDialog } = useLoadedAppContext();
  const { refresh, obligation } = useLoadedUserContext();

  const { claimRewards } = useDashboardContext();

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

  // Claim and deposit as SEND/SUI/USDC
  // SEND
  const canDepositAsSend = !obligation
    ? 1 <= 5
    : (obligation.deposits.some(
        (d) => d.coinType === NORMALIZED_SEND_COINTYPE,
      ) ||
        obligation.deposits.length + 1 <= 5) &&
      !obligation.borrows.some((b) => b.coinType === NORMALIZED_SEND_COINTYPE);

  // SUI
  const canDepositAsSui = !obligation
    ? 1 <= 5
    : (obligation.deposits.some(
        (d) => d.coinType === NORMALIZED_SUI_COINTYPE,
      ) ||
        obligation.deposits.length + 1 <= 5) &&
      !obligation.borrows.some((b) => b.coinType === NORMALIZED_SUI_COINTYPE);

  // USDC
  const canDepositAsUsdc = !obligation
    ? 1 <= 5
    : (obligation.deposits.some(
        (d) => d.coinType === NORMALIZED_USDC_COINTYPE,
      ) ||
        obligation.deposits.length + 1 <= 5) &&
      !obligation.borrows.some((b) => b.coinType === NORMALIZED_USDC_COINTYPE);

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  // Claim
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const submit = async (args?: {
    asSend?: boolean;
    asSui?: boolean;
    asUsdc?: boolean;
    isDepositing?: boolean;
  }) => {
    if (isClaiming) return;

    setIsClaiming(true);

    const filteredRewardsMap: Record<string, RewardSummary[]> = (() => {
      const coinTypes = Object.keys(rewardsMap).filter((coinType) => {
        if (args?.asSend) {
          return args?.isDepositing ? canDepositAsSend : true;
        } else if (args?.asSui) {
          return args?.isDepositing ? canDepositAsSui : true;
        } else if (args?.asUsdc) {
          return args?.isDepositing ? canDepositAsUsdc : true;
        } else {
          return args?.isDepositing
            ? tokensThatCanBeDeposited.some((t) => t.coinType === coinType)
            : true;
        }
      });

      return Object.fromEntries(
        coinTypes.map((coinType) => [coinType, rewardsMap[coinType]]),
      );
    })();

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
          args?.asSend || args?.asSui || args?.asUsdc
            ? `as ${args?.asSend ? "SEND" : args?.asSui ? "SUI" : "USDC"}`
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
          args?.isDepositing ? "claim and deposit" : "claim",
          formatList(
            Object.keys(filteredRewardsMap).map(
              (coinType) => appData.coinMetadataMap[coinType].symbol,
            ),
          ),
          "rewards",
          args?.asSend || args?.asSui || args?.asUsdc
            ? `as ${args?.asSend ? "SEND" : args?.asSui ? "SUI" : "USDC"}`
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
          {/* Claim, claim and deposit */}
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex w-full flex-row gap-2">
              <DropdownMenuItem className="w-full" onClick={() => submit()}>
                <TLabelSans className="text-foreground">Claim</TLabelSans>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="w-full"
                isDisabled={tokensThatCanBeDeposited.length === 0}
                onClick={() => submit({ isDepositing: true })}
              >
                <TLabelSans className="text-foreground">
                  Claim and deposit
                </TLabelSans>
              </DropdownMenuItem>
            </div>

            {tokensThatCanBeDeposited.length < tokens.length && (
              <TLabelSans className="pl-3 text-[10px]">
                {`Note: Cannot claim and deposit ${formatList(
                  tokens
                    .filter(
                      (t) =>
                        !tokensThatCanBeDeposited
                          .map((_t) => _t.coinType)
                          .includes(t.coinType),
                    )
                    .map((t) => t.symbol),
                ).replace("and", "or")} (max 5 deposit positions, no borrows).`}
              </TLabelSans>
            )}
          </div>

          <Separator className="-mx-4 my-1 w-auto" />

          {/* Claim as SEND/SUI/USDC */}
          <div className="flex h-[34px] w-full flex-row items-center justify-between gap-2 rounded-sm bg-gradient-to-r from-border via-transparent to-transparent pl-[13px]">
            <TLabelSans className="text-foreground">Claim as...</TLabelSans>

            <div className="flex flex-row items-center gap-1.5">
              {/* SEND */}
              <DropdownMenuItem
                className="flex h-[34px] w-[34px] flex-row items-center justify-center"
                onClick={() => submit({ asSend: true })}
              >
                <SendTokenLogo size={16} />
              </DropdownMenuItem>

              {/* SUI */}
              <DropdownMenuItem
                className="flex h-[34px] w-[34px] flex-row items-center justify-center"
                onClick={() => submit({ asSui: true })}
              >
                <SuiTokenLogo size={16} />
              </DropdownMenuItem>

              {/* USDC */}
              <DropdownMenuItem
                className="flex h-[34px] w-[34px] flex-row items-center justify-center"
                onClick={() => submit({ asUsdc: true })}
              >
                <UsdcTokenLogo size={16} />
              </DropdownMenuItem>
            </div>
          </div>

          {/* Claim and deposit as SEND/SUI/USDC */}
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex h-[34px] w-full flex-row items-center justify-between gap-2 rounded-sm bg-gradient-to-r from-border via-transparent to-transparent pl-[13px]">
              <TLabelSans className="text-foreground">
                Claim and deposit as...
              </TLabelSans>

              <div className="flex flex-row items-center gap-1.5">
                {/* SEND */}
                <DropdownMenuItem
                  className="flex h-[34px] w-[34px] flex-row items-center justify-center"
                  isDisabled={!canDepositAsSend}
                  onClick={() => submit({ asSend: true, isDepositing: true })}
                >
                  <SendTokenLogo size={16} />
                </DropdownMenuItem>

                {/* SUI */}
                <DropdownMenuItem
                  className="flex h-[34px] w-[34px] flex-row items-center justify-center"
                  isDisabled={!canDepositAsSui}
                  onClick={() => submit({ asSui: true, isDepositing: true })}
                >
                  <SuiTokenLogo size={16} />
                </DropdownMenuItem>

                {/* USDC */}
                <DropdownMenuItem
                  className="flex h-[34px] w-[34px] flex-row items-center justify-center"
                  isDisabled={!canDepositAsUsdc}
                  onClick={() => submit({ asUsdc: true, isDepositing: true })}
                >
                  <UsdcTokenLogo size={16} />
                </DropdownMenuItem>
              </div>
            </div>

            {(!canDepositAsSend || !canDepositAsSui || !canDepositAsUsdc) && (
              <TLabelSans className="pl-3 text-[10px]">
                {`Note: Cannot claim and deposit as ${formatList(
                  [
                    !canDepositAsSend ? "SEND" : null,
                    !canDepositAsSui ? "SUI" : null,
                    !canDepositAsUsdc ? "USDC" : null,
                  ].filter(Boolean) as string[],
                ).replace("and", "or")} (max 5 deposit positions, no borrows).`}
              </TLabelSans>
            )}
          </div>
        </>
      }
    />
  );
}
