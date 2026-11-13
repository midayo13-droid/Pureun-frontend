import { Suspense } from "react";
import FacilitiesClient from "./FacilitiesClient";
import { Loading } from "@/components/ui";

export default function FacilitiesPage() {
  return (
    <Suspense fallback={<div className="wrap"><Loading /></div>}>
      <FacilitiesClient />
    </Suspense>
  );
}
