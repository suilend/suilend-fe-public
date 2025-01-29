import FooterLinks from "@/components/layout/FooterLinks";
import Container from "@/components/shared/Container";

export const FOOTER_HEIGHT = 48; // px

export default function Footer() {
  return (
    <div className="relative z-[2] w-full border-t bg-background max-md:hidden">
      <Container>
        <div
          className="flex w-full flex-row items-center justify-end gap-6 py-3.5"
          style={{ height: `${FOOTER_HEIGHT}px` }}
        >
          <FooterLinks />
        </div>
      </Container>
    </div>
  );
}
