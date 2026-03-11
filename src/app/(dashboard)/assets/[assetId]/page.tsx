import { getAsset } from "@/actions/assets";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Download, Image as ImageIcon, Video, FileText, File } from "lucide-react";

interface Props {
  params: Promise<{ assetId: string }>;
}

const typeIcons: Record<string, typeof ImageIcon> = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  DOCUMENT: FileText,
  OTHER: File,
};

export default async function AssetDetailPage({ params }: Props) {
  const { assetId } = await params;
  const asset = await getAsset(assetId);

  if (!asset) notFound();

  const Icon = typeIcons[asset.type] || File;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Preview */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="flex min-h-[400px] items-center justify-center bg-muted p-0">
            {asset.type === "IMAGE" && asset.s3Url ? (
              <img src={asset.s3Url} alt={asset.name} className="max-h-[600px] object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Icon className="h-24 w-24 text-muted-foreground" />
                <p className="text-muted-foreground">{asset.mimeType}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Versions */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Version History ({asset.versions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {asset.versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Version {v.version}</p>
                    <p className="text-xs text-muted-foreground">
                      by {v.uploadedBy.name} &middot; {formatRelativeTime(v.createdAt)}
                    </p>
                    {v.changeNote && <p className="mt-1 text-xs">{v.changeNote}</p>}
                  </div>
                  <Badge variant="outline">v{v.version}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata sidebar */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{asset.name}</h2>
              {asset.description && (
                <p className="mt-1 text-sm text-muted-foreground">{asset.description}</p>
              )}
            </div>

            <Button className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="secondary">{asset.type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span>{(asset.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MIME Type</span>
                <span>{asset.mimeType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded by</span>
                <span>{asset.uploadedBy.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(asset.createdAt)}</span>
              </div>
              {asset.folder && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Folder</span>
                  <span>{asset.folder.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            {asset.tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {asset.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
