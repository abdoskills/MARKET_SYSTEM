import InventoryManager from "@/components/dashboard/InventoryManager";
import { getServerSession } from "@/lib/auth/server";

export default async function InventoryPage() {
  const session = await getServerSession();
  return <InventoryManager role={session?.role ?? "CASHIER"} />;
}
