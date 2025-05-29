import { ClassValue } from "clsx";

import { EXPLORERS } from "@suilend/sui-fe";

import StandardSelect from "@/components/shared/StandardSelect";

interface ExplorerSelectProps {
  className?: ClassValue;
  value: string;
  onChange: (id: string) => void;
}

export default function ExplorerSelect({
  className,
  value,
  onChange,
}: ExplorerSelectProps) {
  return (
    <StandardSelect
      className={className}
      items={EXPLORERS}
      value={value}
      onChange={onChange}
    />
  );
}
