import { getAssets } from "@/actions/assets";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Image as ImageIcon, Video, FileText, File } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

const typeIcons: Record<string, typeof ImageIcon> = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  DOCUMENT: FileText,
  OTHER: File,
};

const typeColors: Record<string, string> = {
  IMAGE: "bg-green-100 text-green-700",
  VIDEO: "bg-purple-100 text-purple-700",
  DOCUMENT: "bg-blue-100 text-blue-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export default async function AssetsPage() {
  const assets = await getAssets();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-muted-foreground">Creative asset library</p>
        </div>
        <Button asChild>
          <Link href="/assets/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Assets
          </Link>
        </Button>
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No assets yet. Upload your first asset.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => {
            const Icon = typeIcons[asset.type] || File;
            return (
              <Link key={asset.id} href={`/assets/${asset.id}`}>
                <Card className="hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex h-40 items-center justify-center bg-muted">
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Icon className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="truncate text-sm font-medium">{asset.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge className={typeColors[asset.type] || ""} variant="secondary">
                        {asset.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(asset.createdAt)}
                      </span>
                    </div>
                    {asset.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {asset.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag.name} variant="outline" className="text-[10px]">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
