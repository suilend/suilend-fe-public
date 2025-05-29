import { ClassValue } from "clsx";

import { RPCS } from "@suilend/sui-fe";

import StandardSelect from "@/components/shared/StandardSelect";

interface RpcSelectProps {
  className?: ClassValue;
  value: string;
  onChange: (id: string) => void;
}

export default function RpcSelect({
  className,
  value,
  onChange,
}: RpcSelectProps) {
  return (
    <StandardSelect
      className={className}
      items={RPCS}
      value={value}
      onChange={onChange}
    />
  );
}
