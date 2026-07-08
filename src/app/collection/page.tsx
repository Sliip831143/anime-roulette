import type { Metadata } from "next";
import { CollectionView } from "@/components/collection-view";

// 個人のローカルデータページのため検索エンジンには載せない
export const metadata: Metadata = {
  title: "図鑑",
  robots: { index: false, follow: false },
};

export default function CollectionPage() {
  return <CollectionView />;
}
