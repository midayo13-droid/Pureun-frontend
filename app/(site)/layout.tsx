import { Suspense, type ReactNode } from "react";
import SiteShell from "@/components/SiteShell";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SiteShell>{children}</SiteShell>
    </Suspense>
  );
}
