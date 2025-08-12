import { ClassValue } from "clsx";

import DiscordIcon from "@/components/assets/DiscordIcon";
import XIcon from "@/components/assets/XIcon";
import Link from "@/components/shared/Link";
import { DISCORD_URL, DOCS_URL, TWITTER_URL } from "@/lib/navigation";

interface FooterLinksProps {
  className?: ClassValue;
}

export default function FooterLinks({ className }: FooterLinksProps) {
  return (
    <>
      <Link href={DOCS_URL} className={className} isExternal>
        Docs
      </Link>
      <Link
        href={TWITTER_URL}
        className={className}
        isExternal
        startIcon={<XIcon />}
      />
      <Link
        href={DISCORD_URL}
        className={className}
        isExternal
        startIcon={<DiscordIcon />}
      />
    </>
  );
}
