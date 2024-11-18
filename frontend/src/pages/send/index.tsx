import Head from "next/head";

import ClaimSection from "@/components/send/ClaimSection";
import DropSourceSection from "@/components/send/DropSourceSection";
import HeroSection from "@/components/send/HeroSection";

export default function Send() {
  return (
    <>
      <Head>
        <title>Suilend | Send</title>
      </Head>

      <div className="flex w-full flex-col gap-12">
        <HeroSection />
        <DropSourceSection />
        <ClaimSection />
      </div>
    </>
  );
}
