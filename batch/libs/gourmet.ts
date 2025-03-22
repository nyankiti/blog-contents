import path from "node:path";
import { readdir, writeFile } from "node:fs/promises";
import matter from "gray-matter";
import { generatePostsDescription } from "./generate-posts-description";
import { baseDir, getPostDirPath, readFileFromMdorMds } from "./file";

type GourmetBlogFrontMatter = {
  title: string;
  slug: string;
  locationTags: string[];
  gourmetTags: string[];
  isPublished: boolean;
  isDeleted: boolean;
  visitedAt: string;
  publishedAt: string;
  updatedAt: string;
  views: number;
  thumbnail: string;
  geo: string;
  description?: string;
};

// デフォルト値を設定するヘルパー関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const castGourmetBlogFrontMatter = (data: {
  [key: string]: any;
}): GourmetBlogFrontMatter => {
  return {
    title: data.title || "",
    description: data.description || data.title || "",
    slug: data.slug || "",
    locationTags: Array.isArray(data.locationTags) ? data.locationTags : [],
    gourmetTags: Array.isArray(data.gourmetTags) ? data.gourmetTags : [],
    visitedAt: data.visitedAt || "1970-01-01",
    isPublished: Boolean(data.isPublished),
    isDeleted: Boolean(data.isDeleted),
    publishedAt: data.publishedAt || "1970-01-01",
    updatedAt: data.updatedAt || data.publishedAt || "1970-01-01",
    views: Number(data.views) || 0,
    thumbnail: data.thumbnail || "",
    geo: data.geo || "",
  };
};

const getGourmetBlogJson = async (slug: string) => {
  try {
    const fileContent = await readFileFromMdorMds(slug, getPostDirPath());
    if (!fileContent) return null;
    const { data, content } = matter(fileContent);
    const description = await generatePostsDescription(content);
    const frontMatters = castGourmetBlogFrontMatter({ ...data, description });
    return {
      ...frontMatters,
      content,
    };
  } catch (error) {
    console.error("Error reading Markdown file:", error);
    return null;
  }
};

export const generateGourmetPostsJson = async () => {
  const postDirPath = getPostDirPath();
  const postFiles = await readdir(postDirPath);
  const slugs = postFiles.map((file) =>
    path.basename(file, path.extname(file))
  );

  const gourmetBlogJsonPromises = slugs.map((slug) => getGourmetBlogJson(slug));
  const gourmetBlogsJson = (await Promise.all(gourmetBlogJsonPromises)).filter(
    (post) => post !== null
  );
  gourmetBlogsJson.sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
  );

  writeFile(
    path.join(baseDir, "dist/gourmets.json"),
    JSON.stringify(gourmetBlogsJson, null, 2)
  );
  console.log(`✅ gourmets JSON generated at dist/gourmets.json`);
};
