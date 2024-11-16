import DropSourceCard from "@/components/send/DropSourceCard";

export default function Dashboard() {

  return (
    <div className="w-full flex flex-wrap gap-6 items-center p-6 justify-between">
        <DropSourceCard />
        <DropSourceCard />
        <DropSourceCard />
    </div>
  );
}
