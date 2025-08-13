import Link from "next/link";
import { useCallback, useState } from "react";

import { Menu, X } from "lucide-react";

import HeaderBase from "@/components/layout/HeaderBase";
import Logo from "@/components/layout/Logo";
import NavigationLinks from "@/components/layout/NavigationLinks";
import Button from "@/components/shared/Button";

import HeaderMenu from "./HeaderMenu";

export default function AppHeader() {
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
  return (
    <HeaderBase>
      {/* Start */}
      <div className="flex shrink-0 flex-row items-center gap-12 justify-between lg:justify-start w-full">
        <Link href="https://suilend.com">
          <Logo />
        </Link>

        {/* Links */}
        <div className="flex flex-row items-center gap-8 max-lg:hidden">
          <NavigationLinks />
        </div>

        {/* Menu */}
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
