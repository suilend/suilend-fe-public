import Head from "next/head";

import { useWalletContext } from "@suilend/sui-fe-next";

function Page() {
  const { address } = useWalletContext();

  return (
    <>
      <Head>
        <title>Suilend | Strategies</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-8"></div>
    </>
  );
}

export default function Strategies() {
  return <Page />;
}
