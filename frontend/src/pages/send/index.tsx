import Head from "next/head";

import AllocationCardsSection from "@/components/send/AllocationCardsSection";
import HeroSection from "@/components/send/HeroSection";
import SendHeader from "@/components/send/SendHeader";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";

export default function Send() {
  return (
    <>
      <Head>
        <title>Suilend | SEND</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-12">
        <div className="flex w-full flex-col items-center gap-6">
          <SendHeader />
          <ImpersonationModeBanner />
        </div>

        <HeroSection />
        <AllocationCardsSection />
      </div>
    </>
  );
}
