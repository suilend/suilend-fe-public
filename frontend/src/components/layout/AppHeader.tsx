import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

import { Menu, RotateCw, X } from "lucide-react";

import { useWalletContext } from "@suilend/frontend-sui-next";

import ConnectWalletButton from "@/components/layout/ConnectWalletButton";
import HeaderBase from "@/components/layout/HeaderBase";
import HeaderMenu from "@/components/layout/HeaderMenu";
import Logo from "@/components/layout/Logo";
import NavigationLinks from "@/components/layout/NavigationLinks";
import SettingsDialog from "@/components/layout/SettingsDialog";
import HeaderPointsPopover from "@/components/points/HeaderPointsPopover";
import Button from "@/components/shared/Button";
import { useAppContext } from "@/contexts/AppContext";

export default function AppHeader() {
  const router = useRouter();

  const { address } = useWalletContext();
  const { refresh } = useAppContext();

  // Menu
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const openMenu = () => {
    setIsMenuOpen(true);
  };
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const onMenuToggle = () => {
    if (isMenuOpen) closeMenu();
    else openMenu();
  };

  useEffect(() => {
    router.events.on("routeChangeComplete", closeMenu);
    return () => {
      router.events.off("routeChangeComplete", closeMenu);
    };
  }, [router, closeMenu]);

  return (
    <HeaderBase>
      {/* Start */}
      <div className="flex shrink-0 flex-row items-center gap-12">
        <Logo />

        {/* Links */}
        <div className="hidden flex-row gap-8 lg:flex">
          <NavigationLinks />
        </div>
      </div>

      {/* End */}
      <div className="flex min-w-0 flex-row items-center gap-2">
        <div className="flex shrink-0 flex-row items-center">
          <Button
            className="text-muted-foreground"
            icon={<RotateCw />}
            variant="ghost"
            size="icon"
            onClick={refresh}
          >
            Refresh
          </Button>

          <SettingsDialog />
        </div>

        {address && (
          <div className="hidden shrink-0 sm:flex">
            <HeaderPointsPopover />
          </div>
        )}

        <ConnectWalletButton />

        <Button
          className="shrink-0 lg:hidden"
          icon={!isMenuOpen ? <Menu /> : <X />}
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
        >
          Menu
        </Button>
        {isMenuOpen && <HeaderMenu />}
      </div>
    </HeaderBase>
  );
}
