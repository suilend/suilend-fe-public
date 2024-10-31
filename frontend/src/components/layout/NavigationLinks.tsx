import { ExternalLink, FileWarning } from "lucide-react";

import HeaderPointsPopover from "@/components/points/HeaderPointsPopover";
import Link from "@/components/shared/Link";
import { useAppContext } from "@/contexts/AppContext";
import { getSwapUrl } from "@/contexts/SwapContext";
import { useWalletContext } from "@/contexts/WalletContext";
import {
  ADMIN_URL,
  BRIDGE_URL,
  DASHBOARD_URL,
  POINTS_URL,
  SPRINGSUI_URL,
  SWAP_URL,
} from "@/lib/navigation";

export default function NavigationLinks() {
  const { address } = useWalletContext();
  const { data } = useAppContext();

  return (
    <>
      <Link href={DASHBOARD_URL}>Dashboard</Link>
      <div className="flex h-[20px] shrink-0 flex-row items-center gap-4">
        <Link href={POINTS_URL} className="flex-1">
          Points
        </Link>

        {address && (
          <div className="sm:hidden">
            <HeaderPointsPopover />
          </div>
        )}
      </div>
      <Link href={getSwapUrl()} activeHref={SWAP_URL}>
        Swap
      </Link>
      <Link href={BRIDGE_URL}>Bridge</Link>
      <Link
        href={SPRINGSUI_URL}
        isExternal
        endIcon={<ExternalLink className="h-3 w-3" />}
      >
        SpringSui
      </Link>
      {data?.lendingMarketOwnerCapId && <Link href={ADMIN_URL}>Admin</Link>}
    </>
  );
}
