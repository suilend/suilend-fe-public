import FooterLinks from "@/components/layout/FooterLinks";
import Container from "@/components/shared/Container";

export default function Footer() {
  return (
    <div className="hidden w-full border-t bg-background md:block">
      <Container>
        <div className="flex w-full flex-row items-center justify-end gap-6 py-3.5">
          <FooterLinks />
        </div>
      </Container>
    </div>
  );
}
