import path from "node:path";
import { mkdir } from "node:fs/promises";
import { baseDir } from "./libs/file";
import { generateTechBlogPostsJson } from "./libs/posts";
import { generateSearchIndex } from "./libs/generate-search-index";

const distPath = path.join(baseDir, "dist");

const main = async () => {
  // dist ディレクトリが存在しない場合は作成
  await mkdir(distPath, { recursive: true });
  // テックブログの記事一覧 JSON の生成
  await generateTechBlogPostsJson();
  // テックブログの検索用のインデックス JSON の生成
  await generateSearchIndex();
};

main();
