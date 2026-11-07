import {OperationsApp} from "@/components/OperationsApp";

export function generateStaticParams() {
  return ["plan", "fleet", "live", "flights", "analytics", "maintenance", "alerts", "system", "settings"].map(view => ({view}));
}
export default async function Page({params}: {params: Promise<{view:string}>}) {
  const {view} = await params;
  return <OperationsApp view={view}/>;
}
