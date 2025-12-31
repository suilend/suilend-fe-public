import { API_URL, KEYPAIR_SEED_MESSAGE, createKeypair } from "@suilend/sui-fe";

export const createKeypairAndSaveMapping = async (
  address: string,
  signPersonalMessage: (message: Uint8Array) => Promise<{
    bytes: string;
    signature: string;
  }>,
) => {
  const message = Buffer.from(KEYPAIR_SEED_MESSAGE);
  const { signature } = await signPersonalMessage(message);

  const createKeypairResult = await createKeypair(signature);

  try {
    await fetch(`${API_URL}/steamm/proxy-wallet-mapping`, {
      method: "POST",
      body: JSON.stringify({
        proxyWalletAddress: createKeypairResult.address,
        ownerAddress: address,
        signature,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error(err);
  }

  return createKeypairResult;
};
