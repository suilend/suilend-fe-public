import Head from "next/head";

import useBreakpoint from "@/hooks/useBreakpoint";
import DropSourceCard from "@/components/send/DropSourceCard";
import { SendContextProvider } from "@/contexts/SendContext";
import HeroSection from "@/components/send/HeroSection";
import DropSourceSection from "@/components/send/DropSourceSection";
import ClaimSection from "@/components/send/ClaimSection";

export default function Dashboard() {
  const { lg } = useBreakpoint();

  return (
    <SendContextProvider>
      <Head>
        <title>Suilend | Send</title>
      </Head>

        <div className="w-full h-full flex flex-col items-center">
            <HeroSection/>
            <DropSourceSection/>
            <ClaimSection/>
        </div>
    </SendContextProvider>
  );
}
