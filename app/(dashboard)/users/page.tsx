import { getUsersList } from "@/server/services/dashboard.service";
import UsersManager from "@/components/dashboard/UsersManager";

export default async function UsersPage() {
  const users = await getUsersList();

  return <UsersManager initialUsers={users} />;
}
