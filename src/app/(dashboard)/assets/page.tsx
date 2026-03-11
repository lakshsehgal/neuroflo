import { getAssets } from "@/actions/assets";
import { AssetsContent } from "@/components/assets/assets-content";

export default async function AssetsPage() {
  const assets = await getAssets();

  return (
    <AssetsContent
      assets={assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        thumbnailUrl: a.thumbnailUrl,
        createdAt: a.createdAt.toISOString(),
        tags: a.tags.map((t) => ({ name: t.name })),
      }))}
    />
  );
}
