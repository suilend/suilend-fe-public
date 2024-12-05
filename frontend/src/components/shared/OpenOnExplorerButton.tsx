import { ClassValue } from "clsx";

import { useSettingsContext } from "@suilend/frontend-sui-next";

import OpenURLButton from "@/components/shared/OpenURLButton";

interface OpenOnExplorerButtonProps {
  className?: ClassValue;
  iconClassName?: ClassValue;
  url: string;
}

export default function OpenOnExplorerButton({
  className,
  iconClassName,
  url,
}: OpenOnExplorerButtonProps) {
  const { explorer } = useSettingsContext();

  return (
    <OpenURLButton
      className={className}
      iconClassName={iconClassName}
      url={url}
    >
      Open on {explorer.name}
    </OpenURLButton>
  );
}
