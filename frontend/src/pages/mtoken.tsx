import Head from "next/head";

import { bcs } from "@mysten/bcs";
import init, * as template from "@mysten/move-bytecode-template";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { toast } from "sonner";

import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import { SendContextProvider } from "@/contexts/SendContext";
import { mintMTokens } from "@/lib/send";

// Initialize the WebAssembly module
let moduleInitialized = false;
let moduleInitPromise: Promise<void> | null = null;

async function ensureModuleInitialized() {
  if (moduleInitialized) return;

  if (!moduleInitPromise) {
    moduleInitPromise = (async () => {
      try {
        console.log("Initializing WASM module...");
        await init("/move_bytecode_template_bg.wasm");
        console.log("WASM module initialized successfully");
        moduleInitialized = true;
      } catch (err) {
        console.error("Failed to initialize WASM module:", err);
        // Reset the promise so we can try again
        moduleInitPromise = null;
        throw new Error(
          "Failed to initialize token creation module. Please refresh the page and try again.",
        );
      }
    })();
  }

  return moduleInitPromise;
}

// Get the update_identifiers and update_constants functions from the template
const { update_identifiers, update_constants } = template;

// Helper function to generate a token bytecode using a template
const generateTokenBytecode = async (params: {
  tokenSymbol: string;
  tokenName: string;
  tokenDescription: string;
  iconUrl: string;
  tokenDecimals: number;
}): Promise<Uint8Array> => {
  try {
    // Ensure the WASM module is initialized before using any of its functions
    await ensureModuleInitialized();

    // Create sanitized module and type names
    const moduleName = params.tokenSymbol
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    const typeName = params.tokenSymbol
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");

    // Base64 encoded bytecode template for a standard coin module with decimals parameter
    const bytecode = Buffer.from(
      "oRzrCwYAAAAKAQAMAgweAyonBFEIBVlMB6UBywEI8AJgBtADXQqtBAUMsgQoABABCwIGAhECEgITAAICAAEBBwEAAAIADAEAAQIDDAEAAQQEAgAFBQcAAAkAAQABDwUGAQACBwgJAQIDDAUBAQwDDQ0BAQwEDgoLAAUKAwQAAQQCBwQMAwICCAAHCAQAAQsCAQgAAQoCAQgFAQkAAQsBAQkAAQgABwkAAgoCCgIKAgsBAQgFBwgEAgsDAQkACwIBCQABBggEAQUBCwMBCAACCQAFDENvaW5NZXRhZGF0YQZPcHRpb24IVEVNUExBVEULVHJlYXN1cnlDYXAJVHhDb250ZXh0A1VybARjb2luD2NyZWF0ZV9jdXJyZW5jeQtkdW1teV9maWVsZARpbml0FW5ld191bnNhZmVfZnJvbV9ieXRlcwZvcHRpb24TcHVibGljX3NoYXJlX29iamVjdA9wdWJsaWNfdHJhbnNmZXIGc2VuZGVyBHNvbWUIdGVtcGxhdGUIdHJhbnNmZXIKdHhfY29udGV4dAN1cmwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAQkKAgUEVE1QTAoCDg1UZW1wbGF0ZSBDb2luCgIaGVRlbXBsYXRlIENvaW4gRGVzY3JpcHRpb24KAiEgaHR0cHM6Ly9leGFtcGxlLmNvbS90ZW1wbGF0ZS5wbmcAAgEIAQAAAAACEgsABwAHAQcCBwMHBBEGOAAKATgBDAILAS4RBTgCCwI4AwIA",
      "base64",
    );

    // Update module and type names in the bytecode
    let updated = update_identifiers(bytecode, {
      TEMPLATE: typeName,
      template: moduleName,
    });

    // Update token symbol
    updated = update_constants(
      updated,
      bcs.string().serialize(params.tokenSymbol).toBytes(),
      bcs.string().serialize("TMPL").toBytes(),
      "Vector(U8)",
    );

    // Update token name
    updated = update_constants(
      updated,
      bcs.string().serialize(params.tokenName).toBytes(),
      bcs.string().serialize("Template Coin").toBytes(),
      "Vector(U8)",
    );

    // Update token description
    updated = update_constants(
      updated,
      bcs
        .string()
        .serialize(params.tokenDescription || "")
        .toBytes(),
      bcs.string().serialize("Template Coin Description").toBytes(),
      "Vector(U8)",
    );

    // Use custom icon URL if provided, otherwise use default
    const iconUrl =
      params.iconUrl || "https://steamm-assets.s3.amazonaws.com/token-icon.png";
    updated = update_constants(
      updated,
      bcs.string().serialize(iconUrl).toBytes(),
      bcs.string().serialize("https://example.com/template.png").toBytes(),
      "Vector(U8)",
    );

    // Update decimals in the create_currency call
    const decimalsBytes = new Uint8Array(1);
    decimalsBytes[0] = params.tokenDecimals;
    updated = update_constants(
      updated,
      decimalsBytes,
      new Uint8Array([9]), // Default decimals in template's create_currency call
      "U8",
    );

    return updated;
  } catch (error) {
    console.error("Error generating token bytecode:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate token bytecode: ${error.message}`);
    } else {
      throw new Error(`Failed to generate token bytecode: ${String(error)}`);
    }
  }
};

function Page() {
  const { explorer } = useSettingsContext();
  const { address } = useWalletContext();
  const { signExecuteAndWaitForTransaction } = useWalletContext();
  return (
    <>
      <Head>
        <title>Suilend | SEND</title>
      </Head>

      <div className="relative flex w-full flex-col items-center">
        <div className="flex w-full flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-background p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-4 text-2xl font-bold">Instructions</h2>
            <p className="text-sm text-muted-foreground">
              This page will allow you to publish token types and mint
              tokens/mtokens.
            </p>
            <p className="text-sm text-muted-foreground">
              Prerequisites:
              <br />
              - Publish a new token type for ATTN
              <br />
              - Mint ATTN tokens (only need to do this once)
              <br />
              <br />
              Each time we want to mint mtokens of new series, we need to:
              <br />
              - Publish a new mToken type for the new series
              <br />
              - On Suiscan, find the necesssary fields for the new series
              <br />- Mint the new mTokens with those fields
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-background p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-4 text-2xl font-bold">1. Publish Tokens</h2>

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();

                if (!address) {
                  toast.error("No wallet connected", {
                    duration: 5000,
                  });
                  return;
                }

                try {
                  const formData = new FormData(e.target as HTMLFormElement);
                  const tokenConfig = {
                    tokenSymbol: formData.get("tokenSymbol") as string,
                    tokenName: formData.get("tokenName") as string,
                    tokenDescription: formData.get(
                      "tokenDescription",
                    ) as string,
                    iconUrl: formData.get("iconData") as string,
                    tokenDecimals: parseInt(
                      formData.get("tokenDecimals") as string,
                    ),
                  };

                  // Initialize the WASM module
                  await ensureModuleInitialized();

                  // Generate token bytecode using our template
                  const bytecode = await generateTokenBytecode(tokenConfig);

                  // Create the transaction to publish the module
                  const transaction = new Transaction();

                  // Publish the module
                  const [upgradeCap] = transaction.publish({
                    modules: [[...bytecode]],
                    dependencies: [
                      normalizeSuiAddress("0x1"),
                      normalizeSuiAddress("0x2"),
                    ],
                  });

                  // Transfer the upgrade cap to the sender
                  transaction.transferObjects(
                    [upgradeCap],
                    transaction.pure.address(address),
                  );

                  // Execute the transaction
                  const res =
                    await signExecuteAndWaitForTransaction(transaction);

                  // Extract the TreasuryCap and CoinMetadata IDs from the transaction results
                  const treasuryCapChange = res.objectChanges?.find(
                    (change) =>
                      change.type === "created" &&
                      change.objectType.includes("TreasuryCap"),
                  );

                  const coinMetadataChange = res.objectChanges?.find(
                    (change) =>
                      change.type === "created" &&
                      change.objectType.includes("CoinMetadata"),
                  );

                  if (
                    !treasuryCapChange ||
                    treasuryCapChange.type !== "created" ||
                    !coinMetadataChange ||
                    coinMetadataChange.type !== "created"
                  ) {
                    throw new Error(
                      "Failed to find created token objects in transaction results",
                    );
                  }

                  // Extract the token type from the TreasuryCap object type
                  const tokenType =
                    treasuryCapChange.objectType.split("<")[1]?.split(">")[0] ||
                    "";

                  // Update any fields in the second form based on the results
                  const mtokenForm = document.querySelector(
                    '[name="mTokenType"]',
                  ) as HTMLInputElement;
                  if (mtokenForm) {
                    mtokenForm.value = tokenType;
                  }

                  const treasuryCapForm = document.querySelector(
                    '[name="treasuryCap"]',
                  ) as HTMLInputElement;
                  if (treasuryCapForm && treasuryCapChange.objectId) {
                    treasuryCapForm.value = treasuryCapChange.objectId;
                  }

                  toast.success("Token type published successfully", {
                    description: `Token type: ${tokenType}`,
                    duration: 5000,
                  });
                } catch (err: any) {
                  toast.error("Failed to publish token type", {
                    description: err.message,
                    duration: 5000,
                  });
                }
              }}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Symbol</label>
                  <input
                    name="tokenSymbol"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="BBB"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    3-4 letter symbol for your token
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Name</label>
                  <input
                    name="tokenName"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="My Token"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Full name of your token
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Token Description</label>
                <textarea
                  name="tokenDescription"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  placeholder="A description of what this token is for"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Decimals</label>
                  <input
                    name="tokenDecimals"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="9"
                    min="0"
                    max="36"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of decimal places in token
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Icon</label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-md border border-input">
                      <img
                        id="iconPreview"
                        src="https://steamm-assets.s3.amazonaws.com/token-icon.png"
                        alt="Token icon preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <input
                      type="file"
                      id="iconUpload"
                      accept="image/*"
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            // Update the preview image
                            const previewImg = document.getElementById(
                              "iconPreview",
                            ) as HTMLImageElement;
                            if (
                              previewImg &&
                              typeof reader.result === "string"
                            ) {
                              previewImg.src = reader.result;

                              // Store the base64 data in a hidden input
                              const iconDataInput = document.getElementById(
                                "iconData",
                              ) as HTMLInputElement;
                              if (iconDataInput) {
                                iconDataInput.value = reader.result;
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <input
                      id="iconData"
                      name="iconData"
                      className="text-background"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload an image to use as the token icon (PNG or JPG
                    recommended)
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Publish mToken Type
              </button>
            </form>
          </div>
          <div className="rounded-xl border border-slate-200 bg-background p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-4 text-2xl font-bold">1.5. Mint Tokens</h2>

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();

                if (!address) {
                  toast.error("No wallet connected", {
                    duration: 5000,
                  });
                  return;
                }

                try {
                  const formData = new FormData(e.target as HTMLFormElement);
                  const treasuryCapId = formData.get(
                    "mintTreasuryCap",
                  ) as string;
                  const initialSupply = formData.get("initialSupply") as string;
                  const tokenDecimals = parseInt(
                    formData.get("mintTokenDecimals") as string,
                  );
                  const tokenType = formData.get("mintTokenType") as string;

                  // Create a new transaction for minting initial supply
                  const mintTransaction = new Transaction();

                  // Convert initialSupply to the smallest denomination based on decimals
                  const initialSupplyAmount = BigInt(
                    Math.floor(
                      parseFloat(initialSupply) * Math.pow(10, tokenDecimals),
                    ),
                  );

                  // Create mint transaction using the standard coin::mint function
                  // and providing our token type as a type argument
                  const mintedCoin = mintTransaction.moveCall({
                    target: `0x2::coin::mint`,
                    arguments: [
                      mintTransaction.object(treasuryCapId),
                      mintTransaction.pure.u64(initialSupplyAmount.toString()),
                    ],
                    typeArguments: [tokenType],
                  });

                  // Transfer the minted coins to the creator's address
                  mintTransaction.transferObjects(
                    [mintedCoin],
                    mintTransaction.pure.address(address),
                  );

                  // Execute the mint transaction
                  const mintRes =
                    await signExecuteAndWaitForTransaction(mintTransaction);

                  const txUrl = explorer.buildTxUrl(mintRes.digest);
                  toast.success("Tokens minted successfully", {
                    description: `View tx on ${explorer.name}`,
                    action: (
                      <a
                        className="block text-blue-500 hover:underline"
                        href={txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View tx on {explorer.name}
                      </a>
                    ),
                    duration: 5000,
                  });
                } catch (err: any) {
                  toast.error("Failed to mint tokens", {
                    description: err.message,
                    duration: 5000,
                  });
                }
              }}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Treasury Cap ID</label>
                  <input
                    name="mintTreasuryCap"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0x..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Treasury cap ID of the token type
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Type</label>
                  <input
                    name="mintTokenType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0x123::module::TYPE"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Full token type path
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Initial Supply</label>
                  <input
                    name="initialSupply"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="1000000"
                    min="0"
                    step="1"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount of tokens to mint
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Decimals</label>
                  <input
                    name="mintTokenDecimals"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="9"
                    min="0"
                    max="36"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of decimal places in token
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Mint Tokens
              </button>
            </form>
          </div>
          <div className="rounded-xl border border-slate-200 bg-background p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-4 text-2xl font-bold">2. Mint mTokens</h2>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();

                const formData = new FormData(e.target as HTMLFormElement);
                const treasuryCap = formData.get("treasuryCap") as string;
                const mTokenType = formData.get("mTokenType") as string;
                const vestingType = formData.get("vestingType") as string;
                const penaltyType = formData.get("penaltyType") as string;
                const vestingCoin = formData.get("vestingCoin") as string;
                const amount = parseFloat(formData.get("amount") as string);
                const tokenDecimals = parseInt(
                  formData.get("tokenDecimals") as string,
                );
                const startPenaltyNumerator = parseInt(
                  formData.get("startPenaltyNumerator") as string,
                );
                const endPenaltyNumerator = parseInt(
                  formData.get("endPenaltyNumerator") as string,
                );
                const penaltyDenominator = parseInt(
                  formData.get("penaltyDenominator") as string,
                );
                const startTimeS = parseInt(
                  formData.get("startTimeS") as string,
                );
                const endTimeS = parseInt(formData.get("endTimeS") as string);

                try {
                  const transaction = new Transaction();
                  const [adminCap, manager, sendCoin] = mintMTokens({
                    transaction,
                    treasuryCap,
                    mTokenType,
                    vestingType,
                    penaltyType,
                    vestingCoin,
                    amount,
                    tokenDecimals,
                    startPenaltyNumerator,
                    endPenaltyNumerator,
                    penaltyDenominator,
                    startTimeS,
                    endTimeS,
                  });

                  // Transfer all objects to the user
                  if (address) {
                    transaction.transferObjects(
                      [adminCap, manager, sendCoin],
                      transaction.pure.address(address),
                    );

                    signExecuteAndWaitForTransaction(transaction)
                      .then((res) => {
                        const txUrl = explorer.buildTxUrl(res.digest);
                        toast.success("Minted mToken", {
                          description: `View tx on ${explorer.name}`,
                          action: (
                            <a
                              className="block text-blue-500 hover:underline"
                              href={txUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View tx on {explorer.name}
                            </a>
                          ),
                          duration: 5000,
                        });
                      })
                      .catch((err) => {
                        toast.error("Failed to mint mToken", {
                          description: err.message,
                          duration: 5000,
                        });
                      });
                  } else {
                    toast.error("No wallet connected", {
                      duration: 5000,
                    });
                  }
                } catch (err: any) {
                  toast.error("Failed to create transaction", {
                    description: err.message,
                    duration: 5000,
                  });
                }
              }}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Treasury Cap ID</label>
                  <input
                    name="treasuryCap"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="0x49f5dcf29664da53e80f567bc123399a2a6862da4ed6b3c2c088857eba5ec632"
                    placeholder="0x..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Vesting Coin ID</label>
                  <input
                    name="vestingCoin"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="0x94ca8af2a0ef3c3c9a2b99bae6e17533d8bab42e7b4c3d955d18081056b6c67a"
                    placeholder="0x..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <input
                    name="amount"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="100"
                    min="0.000001"
                    step="0.000001"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount of tokens to vest
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Decimals</label>
                  <input
                    name="tokenDecimals"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="9"
                    min="0"
                    max="36"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of decimal places in token
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Start Penalty Numerator
                  </label>
                  <input
                    name="startPenaltyNumerator"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="25"
                    min="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    End Penalty Numerator
                  </label>
                  <input
                    name="endPenaltyNumerator"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="0"
                    min="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Penalty Denominator
                  </label>
                  <input
                    name="penaltyDenominator"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="100"
                    min="1"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    E.g. 25/100 = 25% penalty
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Start Time (Unix seconds)
                  </label>
                  <input
                    name="startTimeS"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue={Math.floor(Date.now() / 1000) + 3600}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Default: 1 hour from now
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    End Time (Unix seconds)
                  </label>
                  <input
                    name="endTimeS"
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue={
                      Math.floor(Date.now() / 1000) + 30 * 24 * 3600
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Default: 30 days from now
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">MToken Type</label>
                  <input
                    name="mTokenType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="0xbd3c3b64636d3ccb95411da98d4fd172c18f53f011b26f29162dfb1ecc2d412e::bbb::BBB"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Vesting Type</label>
                  <input
                    name="vestingType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="0x6f596972c25ef75b61a67b52b43f7b49494caa212efd395b210e94876aa38cb6::xcvxcv::XCVXCV"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Penalty Type</label>
                  <input
                    name="penaltyType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue="0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Mint mTokens
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Send() {
  return (
    <SendContextProvider>
      <Page />
    </SendContextProvider>
  );
}
