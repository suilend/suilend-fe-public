import FooterLinks from "@/components/layout/FooterLinks";
import NavigationLinks from "@/components/layout/NavigationLinks";

export default function HeaderMenu() {
  return (
    <div
      className="absolute right-0 top-[65px] z-[3] flex h-[calc(100dvh-65px)] w-full flex-col overflow-y-auto bg-background sm:w-[360px] sm:border-l"
      style={{
        overscrollBehavior: "auto contain",
      }}
    >
      <div className="flex w-full flex-1 flex-col gap-6 p-6 md:pr-10">
        <div className="flex flex-1 flex-col gap-6">
          <NavigationLinks />
        </div>

        <div className="flex w-full flex-row items-center justify-end gap-6 md:hidden">
          <FooterLinks />
        </div>
      </div>
    </div>
  );
}
