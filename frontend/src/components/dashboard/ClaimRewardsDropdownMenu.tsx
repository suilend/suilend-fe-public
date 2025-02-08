import { CSSProperties, useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { useSettingsContext } from "@suilend/frontend-sui-next";
import { RewardSummary } from "@suilend/sdk";

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
import { Token } from "@/lib/types";

interface ClaimRewardsDropdownMenuProps {
  rewardsMap: Record<string, RewardSummary[]>;
}

export default function ClaimRewardsDropdownMenu({
  rewardsMap,
}: ClaimRewardsDropdownMenuProps) {
  const { explorer } = useSettingsContext();
  const { appData } = useLoadedAppContext();
  const { refresh } = useLoadedUserContext();

  const { claimRewards } = useDashboardContext();

  const tokens: Token[] = Object.values(rewardsMap).map((r) => ({
    coinType: r[0].stats.rewardCoinType,
    symbol: r[0].stats.symbol,
    iconUrl: r[0].stats.iconUrl,
  }));
  const tokensWithReserves = tokens.filter((token) =>
    appData.reserveCoinTypes.includes(token.coinType),
  );

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  // Claim
  const submit = async (isDepositing: boolean) => {
    try {
      const res = await claimRewards(rewardsMap, isDepositing);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        `${isDepositing ? "Claimed and deposited" : "Claimed"} rewards`,
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
      toast.error(
        `Failed to ${isDepositing ? "claim and deposit" : "claim"} rewards`,
        {
          description: (err as Error)?.message || "An unknown error occurred",
          duration: TX_TOAST_DURATION,
        },
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
          <DropdownMenuItem
            className="flex flex-row items-center justify-between gap-2"
            onClick={() => submit(false)}
          >
            <TLabelSans>Claim to wallet</TLabelSans>
            <TokenLogos className="h-4 w-4" tokens={tokens} />
          </DropdownMenuItem>

          {tokensWithReserves.length > 0 && (
            <DropdownMenuItem
              className="flex flex-row items-center justify-between gap-2"
              onClick={() => submit(true)}
            >
              <TLabelSans>Claim and deposit</TLabelSans>
              <TokenLogos className="h-4 w-4" tokens={tokensWithReserves} />
            </DropdownMenuItem>
          )}
        </>
      }
    />
  );
}
