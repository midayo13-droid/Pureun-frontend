import { Suspense } from "react";
import MyDetail from "./MyDetail";
import { Loading } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<div className="wrap"><Loading /></div>}>
      <MyDetail />
    </Suspense>
  );
}
