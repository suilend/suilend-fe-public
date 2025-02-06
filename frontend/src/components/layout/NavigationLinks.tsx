import { ExternalLink } from "lucide-react";

import { getMsafeAppStoreUrl, isInMsafeApp } from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";

import HeaderPointsPopover from "@/components/points/HeaderPointsPopover";
import Link from "@/components/shared/Link";
import { useAppContext } from "@/contexts/AppContext";
import { getSwapUrl } from "@/contexts/SwapContext";
import {
  ABOUT_URL,
  ADMIN_URL,
  BRIDGE_URL,
  POINTS_URL,
  ROOT_URL,
  SEND_URL,
  SPRINGSUI_URL,
  STEAMM_URL,
  SWAP_URL,
} from "@/lib/navigation";

export default function NavigationLinks() {
  const { address } = useWalletContext();
  const { data } = useAppContext();

  return (
    <>
      {/* Internal */}
      <Link href={ROOT_URL}>Lend</Link>
      {!isInMsafeApp() && (
        <Link href={getSwapUrl()} startsWithHref={SWAP_URL}>
          Swap
        </Link>
      )}
      {!isInMsafeApp() && <Link href={BRIDGE_URL}>Bridge</Link>}

      <div className="flex h-[20px] shrink-0 flex-row items-center gap-4">
        <Link className="flex-1" href={POINTS_URL}>
          Points
        </Link>

        {address && (
          <div className="sm:hidden">
            <HeaderPointsPopover />
          </div>
        )}
      </div>
      <Link href={SEND_URL}>SEND</Link>
      <Link href={ABOUT_URL}>About</Link>
      {!!data?.lendingMarketOwnerCapId && !isInMsafeApp() && (
        <Link href={ADMIN_URL}>Admin</Link>
      )}

      {/* External */}
      <Link
        href={
          !isInMsafeApp() ? SPRINGSUI_URL : getMsafeAppStoreUrl("SpringSui")
        }
        isExternal
        endIcon={<ExternalLink className="h-3 w-3" />}
      >
        SpringSui
      </Link>
      <Link
        href={STEAMM_URL}
        isExternal
        label="Coming soon"
        endIcon={<ExternalLink className="h-3 w-3" />}
      >
        STEAMM
      </Link>
    </>
  );
}
