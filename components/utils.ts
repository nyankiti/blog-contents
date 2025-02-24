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

export function getFaviconUrl(pageUrl: string, size: 16 | 32 | 64 = 64) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    pageUrl
  )}&size=${size}`;
}
