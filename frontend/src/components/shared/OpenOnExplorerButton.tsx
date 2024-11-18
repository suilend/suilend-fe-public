import { useSettingsContext } from "@suilend/frontend-sui";

import OpenURLButton from "@/components/shared/OpenURLButton";

interface OpenOnExplorerButtonProps {
  url: string;
}

export default function OpenOnExplorerButton({
  url,
}: OpenOnExplorerButtonProps) {
  const { explorer } = useSettingsContext();

  return <OpenURLButton url={url}>Open on {explorer.name}</OpenURLButton>;
}
