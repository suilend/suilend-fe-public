import { intervalToDuration } from "date-fns";
import { ExternalLink } from "lucide-react";

import { getMsafeAppStoreUrl, isInMsafeApp } from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";

import HeaderPointsPopover from "@/components/points/HeaderPointsPopover";
import Link from "@/components/shared/Link";
import { useAppContext } from "@/contexts/AppContext";
import { usePointsContext } from "@/contexts/PointsContext";
import { getSwapUrl } from "@/contexts/SwapContext";
import {
  ADMIN_URL,
  BRIDGE_URL,
  DASHBOARD_URL,
  POINTS_URL,
  SEND_URL,
  SPRINGSUI_URL,
  SWAP_URL,
} from "@/lib/navigation";
import { TGE_TIMESTAMP_MS } from "@/lib/send";

export default function NavigationLinks() {
  const { address } = useWalletContext();
  const { data } = useAppContext();
  const { season } = usePointsContext();

  const getSendLabel = () => {
    if (Date.now() >= TGE_TIMESTAMP_MS) return "TGE";

    const interval = intervalToDuration({
      start: Date.now(),
      end: new Date(TGE_TIMESTAMP_MS),
    });

    if (interval.hours) return `${interval.hours}h to TGE`;
    if (interval.minutes) return `${interval.minutes}m to TGE`;
    if (interval.seconds) return `${interval.seconds}s to TGE`;
    return "TGE";
  };

  return (
    <>
      <Link href={DASHBOARD_URL}>Dashboard</Link>
      <Link href={SEND_URL} label={getSendLabel()}>
        SEND
      </Link>
      <div className="flex h-[20px] shrink-0 flex-row items-center gap-4">
        <Link className="flex-1" href={POINTS_URL} label={`S${season}`}>
          Points
        </Link>

        {address && (
          <div className="sm:hidden">
            <HeaderPointsPopover />
          </div>
        )}
      </div>
      {!isInMsafeApp() && (
        <>
          <Link href={getSwapUrl()} activeHref={SWAP_URL}>
            Swap
          </Link>
          <Link href={BRIDGE_URL}>Bridge</Link>
          {!!data?.lendingMarketOwnerCapId && (
            <Link href={ADMIN_URL}>Admin</Link>
          )}
        </>
      )}
      <Link
        href={
          !isInMsafeApp() ? SPRINGSUI_URL : getMsafeAppStoreUrl("SpringSui")
        }
        isExternal
        endIcon={<ExternalLink className="h-3 w-3" />}
      >
        SpringSui
      </Link>
    </>
  );
}
