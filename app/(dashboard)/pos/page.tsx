import PosTerminal from "@/components/pos/PosTerminal";
import { getStorefrontProducts } from "@/server/services/product.service";

export default async function PosPage() {
  const products = await getStorefrontProducts();

  return <PosTerminal products={products} />;
}
