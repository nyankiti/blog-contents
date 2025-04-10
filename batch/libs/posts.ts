import path from "node:path";
import { readdir, writeFile } from "node:fs/promises";
import matter from "gray-matter";
import { generatePostsDescription } from "./generate-posts-description";
import {
  baseDir,
  englishTechBlogDir,
  readFileFromMdorMds,
  techBlogDir,
} from "./file";

type TechBlogFrontMatter = {
  title: string;
  slug: string;
  tags: string[];
  isPublished: boolean;
  isDeleted: boolean;
  publishedAt: string;
  updatedAt: string;
  views: number;
  description?: string;
};

// デフォルト値を設定するヘルパー関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const castTechBlogFrontMatter = (data: {
  [key: string]: any;
}): TechBlogFrontMatter => {
  return {
    title: data.title || "",
    description: data.description || data.title || "",
    slug: data.slug || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    isPublished: Boolean(data.isPublished),
    isDeleted: Boolean(data.isDeleted),
    publishedAt: data.publishedAt || "1970-01-01",
    updatedAt: data.updatedAt || data.publishedAt || "1970-01-01",
    views: Number(data.views) || 0,
  };
};

const getPostJson = async (slug: string, postDir: string) => {
  try {
    const fileContent = await readFileFromMdorMds(slug, postDir);
    if (!fileContent) return null;
    const { data, content } = matter(fileContent);
    const description = await generatePostsDescription(content);
    const frontMatters = castTechBlogFrontMatter({ ...data, description });
    return {
      ...frontMatters,
      content,
    };
  } catch (error) {
    console.error("Error reading Markdown file:", error);
    return null;
  }
};

export const generateTechBlogPostsJson = async () => {
  const postFiles = await readdir(techBlogDir);
  const slugs = postFiles.map((file) =>
    path.basename(file, path.extname(file))
  );

  const postsJsonPromises = slugs.map((slug) => getPostJson(slug, techBlogDir));
  const postsJson = (await Promise.all(postsJsonPromises)).filter(
    (post) => post !== null
  );
  postsJson.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  writeFile(
    path.join(baseDir, "dist/posts.json"),
    JSON.stringify(postsJson, null, 2)
  );
  console.log(`✅ Posts JSON generated at dist/posts.json`);
};

export const generateEnglishTechBlogPostsJson = async () => {
  const postFiles = await readdir(englishTechBlogDir);
  const slugs = postFiles.map((file) =>
    path.basename(file, path.extname(file))
  );

  const postsJsonPromises = slugs.map((slug) =>
    getPostJson(slug, englishTechBlogDir)
  );
  const postsJson = (await Promise.all(postsJsonPromises)).filter(
    (post) => post !== null
  );
  postsJson.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  writeFile(
    path.join(baseDir, "dist/en/posts.json"),
    JSON.stringify(postsJson, null, 2)
  );
  console.log(`✅ Posts JSON generated at dist/en/posts.json`);
};
