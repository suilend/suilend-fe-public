import DropSourceCard from "@/components/send/DropSourceCard";
import { TBody, TTitle } from "@/components/shared/Typography";

export default function ClaimSection() {
  return (
    <div className="w-full flex flex-col gap-6 items-center p-6 justify-between relative">
        <div className="absolute w-screen left-[50%] ml-[-50vmax] bg-card h-full"/>
        <TTitle>
            Claim SEND tokens!
        </TTitle>
        <div className="z-10 w-[500px] rounded-[5px] bg-secondary border border-line> flex flex-col p-6">
            <TTitle>
                Claim
            </TTitle>
            <TBody>
                500 SEND
            </TBody>
        </div>
    </div>
  );
}
