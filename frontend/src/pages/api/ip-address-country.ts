import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const resp = await fetch(
    `https://api.ipregistry.co/?${new URLSearchParams({ key: process.env.IP_REGISTRY_API_KEY as string })}`,
  );
  if (!resp.ok) {
    res.status(500).send({ error: "Failed to fetch data" });
    return;
  }

  const json = await resp.json();
  const country = json?.location?.country;

  res.status(200).json({ country });
}
