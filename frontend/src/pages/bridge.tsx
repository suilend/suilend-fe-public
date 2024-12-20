import Head from "next/head";

import WormholeConnect from "@/components/bridge/WormholeConnect";

export default function Bridge() {
  return (
    <>
      <Head>
        <title>Suilend | Bridge</title>
      </Head>

      <WormholeConnect />
    </>
  );
}
