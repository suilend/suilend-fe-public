import Head from "next/head";
import Image from "next/image";

import { ExternalLinkIcon } from "lucide-react";

import OtterSecIcon from "@/components/assets/OtterSecIcon";
import SectionHeading from "@/components/send/SectionHeading";
import SendHeader from "@/components/send/SendHeader";
import Link from "@/components/shared/Link";
import { TBodySans, TLabelSans, TTitle } from "@/components/shared/Typography";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSETS_URL } from "@/lib/constants";

type Audit = {
  auditor: string;
  icon: React.ReactNode;
  date: string;
  reportHref: string; // placeholder for now
  scope: string;
};

const audits: Audit[] = [
  {
    icon: (
      <Image
        src={`${ASSETS_URL}/partners/zellic.png`}
        alt="Zellic"
        width={108}
        height={30}
      />
    ),
    auditor: "Zellic",
    date: "March 5, 2024",
    reportHref:
      "https://drive.google.com/file/d/1eKdeVL2kkmE6S8LJXAZtqQYcr8N25gTI/edit",
    scope: "Full Audit",
  },
  {
    icon: <OtterSecIcon />,
    auditor: "OtterSec",
    date: "March 20, 2024",
    reportHref:
      "https://drive.google.com/file/d/1I8g5AT5oDu77gULyops3-YTi5RMB2E2j/view?usp=drive_link",
    scope: "Full Audit",
  },
];

export default function Security() {
  return (
    <>
      <Head>
        <title>
          <TTitle>Suilend | Security</TTitle>
        </title>
      </Head>

      <div className="flex w-full flex-1 flex-col py-16 md:py-20">
        <SendHeader />
        {/* Header */}
        <div className="relative z-[2] flex w-full flex-col items-center gap-6">
          <div className="flex w-full flex-col items-center gap-2 text-center">
            <SectionHeading id="security">Security Audits</SectionHeading>
          </div>

          {/* Audits List */}
          <Card className="w-full max-w-[1080px]">
            <CardContent>
              <Table container={{ className: "max-w-full" }}>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <TLabelSans>Auditor</TLabelSans>
                    </TableHead>
                    <TableHead>
                      <TLabelSans>Date</TLabelSans>
                    </TableHead>
                    <TableHead>
                      <TLabelSans>Scope</TLabelSans>
                    </TableHead>
                    <TableHead className="text-right">
                      <TLabelSans>Status</TLabelSans>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((a) => (
                    <TableRow key={`${a.auditor}-${a.date}`}>
                      <TableCell className="flex items-center gap-2 py-4 font-medium">
                        {a.icon}
                      </TableCell>
                      <TableCell>
                        <TBodySans>{a.date}</TBodySans>
                      </TableCell>
                      <TableCell>
                        <Link href={a.reportHref} isExternal>
                          <TBodySans className="flex items-center gap-2 underline">
                            {a.scope}{" "}
                            <ExternalLinkIcon className="inline h-3 w-3" />
                          </TBodySans>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          <TBodySans className="text-muted-foreground">
                            Completed
                          </TBodySans>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
