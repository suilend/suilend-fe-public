import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { useSettingsContext } from "@suilend/frontend-sui-next";
import { RewardSummary } from "@suilend/sdk";

import Button from "@/components/shared/Button";
import Popover from "@/components/shared/Popover";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { TX_TOAST_DURATION } from "@/lib/constants";

interface ClaimRewardsPopoverProps {
  rewardsMap: Record<string, RewardSummary[]>;
}

export default function ClaimRewardsPopover({
  rewardsMap,
}: ClaimRewardsPopoverProps) {
  const { explorer } = useSettingsContext();
  const { refresh } = useLoadedAppContext();
  const { claimRewards } = useDashboardContext();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  // Claim
  const [isSubmitting_claim, setIsSubmitting_claim] = useState<boolean>(false);
  const [isSubmitting_claimAndDeposit, setIsSubmitting_claimAndDeposit] =
    useState<boolean>(false);

  const submit = async (isDepositing: boolean) => {
    if (isDepositing) {
      if (isSubmitting_claimAndDeposit) return;
    } else {
      if (isSubmitting_claim) return;
    }

    const setIsSubmitting = isDepositing
      ? setIsSubmitting_claimAndDeposit
      : setIsSubmitting_claim;
    setIsSubmitting(true);

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
      setIsSubmitting(false);
      await refresh();
    }
  };

  return (
    <Popover
      id="claim-rewards"
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button labelClassName="uppercase" endIcon={<Icon />}>
          Claim rewards
        </Button>
      }
      contentProps={{
        align: "start",
        className: "p-0 flex flex-col gap-px",
        style: {
          width: "var(--radix-popover-trigger-width)",
        },
      }}
    >
      <Button
        className="justify-start text-muted-foreground"
        labelClassName="text-xs font-sans"
        variant="ghost"
        onClick={() => submit(false)}
      >
        {isSubmitting_claim ? <Spinner size="sm" /> : "Claim"}
      </Button>

      <Button
        className="justify-start text-muted-foreground"
        labelClassName="text-xs font-sans"
        variant="ghost"
        onClick={() => submit(true)}
      >
        {isSubmitting_claimAndDeposit ? (
          <Spinner size="sm" />
        ) : (
          "Claim and deposit"
        )}
      </Button>
    </Popover>
  );
}
