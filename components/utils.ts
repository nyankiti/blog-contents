export function extractTwitterUrl(url: string): string | null {
  if (/https?:\/\/(www\.)?x.com\/\w{1,15}\/status\/.*/.test(url)) {
    // x.comは適切にembedされないため、twitter.comに変換する必要がある
    return url.replace("x.com", "twitter.com");
  }
  if (/https?:\/\/(www\.)?twitter.com\/\w{1,15}\/status\/.*/.test(url))
    return url;

  return null;
}

export function extractYouTubeVideoId(url: string): string | null {
  const matched =
    /^https?:\/\/(www\.)?youtube\.com\/watch\?(.*&)?v=(?<videoId>[^&]+)/.exec(
      url
    ) ??
    /^https?:\/\/youtu\.be\/(?<videoId>[^?]+)/.exec(url) ??
    /^https?:\/\/(www\.)?youtube\.com\/embed\/(?<videoId>[^?]+)/.exec(url);
  if (matched?.groups?.videoId) {
    return matched.groups.videoId;
  } else {
    return null;
  }
}

export type SiteMetadata = {
  url: string;
  site_name?: string;
  title?: string;
  description?: string;
  image?: string;
  type?: string;
};

export async function fetchSiteMetadata(
  url: string
): Promise<SiteMetadata | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒でタイムアウト

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    const metadata: SiteMetadata = { url };

    // より軽量なパース処理
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (titleMatch) metadata.title = titleMatch[1];

    const metaTags = html.match(/<meta[^>]+>/g) || [];
    for (const metaTag of metaTags) {
      const propertyMatch = metaTag.match(/property="([^"]+)"/);
      const contentMatch = metaTag.match(/content="([^"]+)"/);
      const nameMatch = metaTag.match(/name="([^"]+)"/);

      if (!contentMatch) continue;
      const content = contentMatch[1];

      if (propertyMatch) {
        switch (propertyMatch[1]) {
          case "og:site_name":
            metadata.site_name = content;
            break;
          case "og:title":
            metadata.title = content;
            break;
          case "og:description":
            metadata.description = content;
            break;
          case "og:image":
            metadata.image = content;
            break;
          case "og:type":
            metadata.type = content;
            break;
        }
      } else if (nameMatch && nameMatch[1] === "description") {
        metadata.description = content;
      }
    }

    return metadata;
  } catch {
    return null;
  }
}

export function getFaviconUrl(pageUrl: string, size: 16 | 32 | 64 = 64) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    pageUrl
  )}&size=${size}`;
}
