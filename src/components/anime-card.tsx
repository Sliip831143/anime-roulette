import { Card, CardContent } from "@/components/ui/card";
import type { AnnictWork } from "@/lib/annict";

const SEASON_LABEL: Record<NonNullable<AnnictWork["seasonName"]>, string> = {
  WINTER: "冬",
  SPRING: "春",
  SUMMER: "夏",
  AUTUMN: "秋",
};

const MEDIA_LABEL: Record<NonNullable<AnnictWork["media"]>, string> = {
  TV: "TV",
  OVA: "OVA",
  MOVIE: "映画",
  WEB: "Web",
  OTHER: "その他",
};

function formatSeason(work: AnnictWork): string {
  const parts: string[] = [];
  if (work.seasonYear != null) parts.push(`${work.seasonYear}年`);
  if (work.seasonName) parts.push(SEASON_LABEL[work.seasonName]);
  if (work.media) parts.push(MEDIA_LABEL[work.media]);
  return parts.join(" / ") || "情報なし";
}

function formatSatisfaction(rate: number | null): string | null {
  if (rate == null) return null;
  const percent = rate <= 1 ? rate * 100 : rate;
  return `満足度${percent.toFixed(1)}%`;
}

export function AnimeCard({ work }: { work: AnnictWork }) {
  const annictUrl = `https://annict.com/works/${work.annictId}`;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex gap-4">
        {work.image?.recommendedImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.image.recommendedImageUrl}
            alt={work.title}
            className="w-28 h-40 object-cover bg-muted shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-28 h-40 flex items-center justify-center bg-muted text-xs text-muted-foreground shrink-0">
            No image
          </div>
        )}
        <CardContent className="flex-1 p-4 flex flex-col gap-2">
          <h3 className="font-semibold leading-snug line-clamp-2">
            {work.title}
          </h3>
          <p className="text-sm text-muted-foreground">{formatSeason(work)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>視聴登録 {work.watchersCount.toLocaleString()}人</span>
            <span>レビュー {work.reviewsCount.toLocaleString()}件</span>
            {formatSatisfaction(work.satisfactionRate) && (
              <span>{formatSatisfaction(work.satisfactionRate)}</span>
            )}
          </div>
          <div className="mt-auto flex flex-wrap gap-3 text-xs">
            <a
              href={annictUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Annictで見る
            </a>
            {work.officialSiteUrl && (
              <a
                href={work.officialSiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                公式サイト
              </a>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
