import path from "node:path";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import matter from "gray-matter";
import {
  type FrontMatter,
  getPostDirPath,
  readFileFromMdorMds,
  baseDir,
} from "./libs/posts";
import { generatePostsDescription } from "./libs/generate-posts-description";

const distPath = path.join(baseDir, "dist");

// デフォルト値を設定するヘルパー関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const castFrontMatter = (data: { [key: string]: any }): FrontMatter => {
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

const getPostJson = async (slug: string) => {
  try {
    const fileContent = await readFileFromMdorMds(slug, getPostDirPath());
    if (!fileContent) return null;
    const { data, content } = matter(fileContent);
    const description = await generatePostsDescription(content);
    const frontMatters = castFrontMatter({ ...data, description });
    return {
      ...frontMatters,
      content,
    };
  } catch (error) {
    console.error("Error reading Markdown file:", error);
    return null;
  }
};

const generatePostsJson = async () => {
  const postDirPath = getPostDirPath();
  const postFiles = await readdir(postDirPath);
  const slugs = postFiles.map((file) =>
    path.basename(file, path.extname(file))
  );

  const postsJsonPromises = slugs.map((slug) => getPostJson(slug));
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

const main = async () => {
  // dist ディレクトリが存在しない場合は作成
  await mkdir(distPath, { recursive: true });
  // 記事一覧の JSON を生成
  await generatePostsJson();
};

main();
