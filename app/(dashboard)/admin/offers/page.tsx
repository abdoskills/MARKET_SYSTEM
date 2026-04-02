import { getServerSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import OffersManager from "@/components/dashboard/OffersManager";

export default async function AdminOffersPage() {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  return <OffersManager />;
}
