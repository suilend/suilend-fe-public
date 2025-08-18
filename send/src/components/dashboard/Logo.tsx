import Link from "next/link";

import SuilendLogo from "@/components/layout/SuilendLogo";
import { ROOT_URL } from "@/lib/navigation";

const Logo = () => (
  <Link className="flex items-center gap-3" href={ROOT_URL}>
    <SuilendLogo size={32} />
    <span className="text-2xl font--mono text-foreground">SEND</span>
  </Link>
);

export default Logo;
