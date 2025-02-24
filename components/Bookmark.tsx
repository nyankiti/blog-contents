import { Suspense } from "react";
import { fetchSiteMetadata, getFaviconUrl } from "./utils";

type Props = {
  href: string;
  siteUrl: string;
};

export const Bookmark: React.FC<Props> = ({ href, siteUrl }) => {
  return (
    <Suspense fallback={<BookmarkSkeleton />}>
      <BookmarkInner href={href} siteUrl={siteUrl} />
    </Suspense>
  );
};

const BookmarkInner: React.FC<Props> = async ({ href, siteUrl }) => {
  const url = new URL(href, siteUrl); // hrefを相対パスで指定された場合は SITE_URL利用されるようにする
  const metadata = await fetchSiteMetadata(url.href);

  if (!metadata) {
    return <BookmarkError href={href} />;
  }

  return (
    <a
      className="not-prose flex my-1 gap-2 h-36 w-full rounded-lg border border-link-card-border overflow-hidden transition-colors duration-200 hover:border-link-card-border-hover hover:bg-link-card-bg-hover"
      href={metadata.url}
      target="_blank"
      rel="noreferrer"
    >
      <div className="flex flex-col p-2 flex-1 h-full hover:opacity-80">
        <div className="font-bold line-clamp-3 break-words">
          {metadata.title ? metadata.title : metadata.url}
        </div>

        <div className="flex-1 mt-2">
          <div className="text-sm line-clamp-2 overflow-wrap break-words">
            {metadata.description}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getFaviconUrl(url.hostname)}
            alt=""
            width={16}
            height={16}
          />

          <span className="text-sm line-clamp-1">{url.hostname}</span>
        </div>
      </div>

      {metadata.image && (
        <div className="max-w-[40%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-full w-full object-cover"
            src={metadata.image}
            alt={metadata.title}
          />
        </div>
      )}
    </a>
  );
};

const BookmarkError: React.FC<{ href: string }> = ({ href }) => {
  return (
    <a
      className="flex flex-col gap-2 p-4 rounded-lg border border-link-card-border text-text-primary transition-colors duration-200 hover:border-link-card-border-hover hover:bg-link-card-bg-hover"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <p className="font-medium">ページを読み込めませんでした</p>
      <div className="text-sm text-text-secondary">{href}</div>
    </a>
  );
};

const BookmarkSkeleton: React.FC = () => {
  return (
    <div className="flex gap-2 h-36 w-full rounded-lg border border-link-card-border overflow-hidden">
      <div className="flex flex-col p-2 flex-1 h-full">
        <div className="flex flex-col gap-2">
          <div className="w-full h-4 bg-gray-200 rounded"></div>
          <div className="w-4/5 h-4 bg-gray-200 rounded"></div>
        </div>

        <div className="flex flex-col gap-2 mt-6 flex-1">
          <div className="w-full h-4 bg-gray-200 rounded"></div>
          <div className="w-4/5 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="w-4 h-4 bg-gray-200 rounded"></div>
      </div>
      <div className="w-40 h-full bg-gray-200"></div>
    </div>
  );
};
