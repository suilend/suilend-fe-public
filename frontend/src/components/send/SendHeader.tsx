import Image from "next/image";

import { ClassValue } from "clsx";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import useBreakpoint from "@/hooks/useBreakpoint";
import { cn } from "@/lib/utils";

interface SendHeaderProps {
  className?: ClassValue;
}

export default function SendHeader({ className }: SendHeaderProps) {
  const { md } = useBreakpoint();

  return (
    <div
      className={cn(
        "absolute -inset-x-4 -top-4 z-[1] flex flex-row justify-center overflow-hidden md:-inset-x-10 md:-top-6",
        className,
      )}
    >
      {md ? (
        <div className="w-full min-w-[1920px]">
          <AspectRatio ratio={2560 / 1440}>
            <video
              autoPlay
              controls={false}
              loop
              muted
              playsInline
              disablePictureInPicture
              disableRemotePlayback
              width="100%"
              height="auto"
            >
              <source src="/assets/send/header.mp4" type="video/mp4" />
            </video>
          </AspectRatio>
        </div>
      ) : (
        <div className="w-full min-w-[720px]">
          <AspectRatio ratio={3840 / 995}>
            <Image
              className="object-cover"
              src="/assets/send/header-mobile.png"
              alt="SEND Header"
              fill
              quality={100}
            />
          </AspectRatio>
        </div>
      )}
    </div>
  );
}
