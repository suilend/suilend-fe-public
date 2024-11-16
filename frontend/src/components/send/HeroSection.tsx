import { TBody, TTitle } from "@/components/shared/Typography";
import ConnectWalletButton from "@/components/layout/ConnectWalletButton";
import Image from "next/image";
import senderBanner from "@/public/assets/send_banner.png";

export default function HeroSection() {
  return (
        <div>
            <Image
                src={senderBanner}
                alt="Send banner"
                className="w-full -mx-4"
            />
            <div className="flex flex-col gap-3">
            <TTitle>
                Claim $SEND Tokens
            </TTitle>
            <TTitle>
                Connect your wallet to check eligibility and claim your $SEND tokens.
            </TTitle>
            <ConnectWalletButton/>
            <TBody>
                498,554 wallets are eligible for the airdrop
            </TBody>
            </div>
        </div>
  );
}
