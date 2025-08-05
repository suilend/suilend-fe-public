import SuilendLogo from "@/components/layout/SuilendLogo";

const Logo = () => (
  <div className="flex items-center gap-3">
    <SuilendLogo size={32} />
    <span className="text-2xl font--mono text-foreground">SEND</span>
  </div>
);

export default Logo;
