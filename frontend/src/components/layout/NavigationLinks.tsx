import { ChevronDown, ExternalLink } from "lucide-react";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { getMsafeAppStoreUrl, isInMsafeApp } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import Link from "@/components/shared/Link";
import Tooltip from "@/components/shared/Tooltip";
import { TBodySans } from "@/components/shared/Typography";
import {
  ABOUT_URL,
  ADMIN_URL,
  BRIDGE_URL,
  LEADERBOARD_URL,
  ROOT_URL,
  SEND_URL,
  SPRINGSUI_URL,
  STEAMM_URL,
  STRATEGIES_URL,
  SWAP_URL,
} from "@/lib/navigation";

function More() {
  return (
    <>
      <Link href={LEADERBOARD_URL}>Leaderboard</Link>
      <Link href={SEND_URL}>SEND</Link>
      <Link href={ABOUT_URL}>About</Link>

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
        endIcon={<ExternalLink className="h-3 w-3" />}
      >
        STEAMM
      </Link>
    </>
  );
}

export default function NavigationLinks() {
  const { address } = useWalletContext();

  return (
    <>
      {/* Internal */}
      <Link href={ROOT_URL}>Lend</Link>
      {!isInMsafeApp() && <Link href={STRATEGIES_URL}>Strategies</Link>}
      {!isInMsafeApp() && (
        <Link href={SWAP_URL} startsWithHref={SWAP_URL}>
          Swap
        </Link>
      )}
      {!isInMsafeApp() && <Link href={BRIDGE_URL}>Bridge</Link>}
      {address === ADMIN_ADDRESS && !isInMsafeApp() && (
        <Link href={ADMIN_URL}>Admin</Link>
      )}

      {/* More */}
      <Tooltip
        contentProps={{ className: "rounded-lg bg-background py-2 px-4" }}
        content={
          <div className="flex flex-col gap-3">
            <More />
          </div>
        }
      >
        <div className="group flex h-8 cursor-pointer flex-row items-center gap-1 max-lg:hidden">
          <TBodySans className="text-muted-foreground transition-colors group-hover:text-foreground">
            More
          </TBodySans>
          <ChevronDown className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>
      </Tooltip>

      <div className="flex flex-col gap-6 lg:hidden">
        <More />
      </div>
    </>
  );
}
