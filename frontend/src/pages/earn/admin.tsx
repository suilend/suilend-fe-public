import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

import { ChevronLeftIcon, PlusIcon } from "lucide-react";

import { TBody, TLabelSans } from "@/components/shared/Typography";
import CreateVaultDialog from "@/components/strategies/CreateVaultDialog";
import VaultCard from "@/components/strategies/VaultCard";
import { Button } from "@/components/ui/button";
import { VaultContextProvider, useVaultContext } from "@/contexts/VaultContext";

function Page() {
  const { vaults } = useVaultContext();
  const [isCreatingVault, setIsCreatingVault] = useState(false);

  return (
    <>
      <CreateVaultDialog
        isOpen={isCreatingVault}
        onClose={() => setIsCreatingVault(false)}
      />
      <Head>
        <title>Suilend | Vaults Admin</title>
      </Head>

      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex flex-row items-center gap-2">
            <Link href="/earn" className="flex flex-row items-center gap-2">
              <ChevronLeftIcon className="h-4 w-4" />
            </Link>
            <TBody className="uppercase">Vaults Admin</TBody>
          </div>
          <Button onClick={() => setIsCreatingVault(true)}>
            <PlusIcon className="h-4 w-4" />
            Create vault
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {vaults.length === 0 ? (
            <TLabelSans>You do not own any vaults.</TLabelSans>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {vaults.map((v) => (
                <Link href={`/earn/admin/${v.id}`} key={v.id}>
                  <VaultCard vault={v} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminVaults() {
  return (
    <VaultContextProvider>
      <Page />
    </VaultContextProvider>
  );
}
