import path from "node:path";
import { readFile, readdir } from "node:fs/promises";

export type FrontMatter = {
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

export const baseDir = process.env.BASE_DIR || process.cwd();

export const getPostDirPath = () => path.join(baseDir, "./contents/tech-blog");

export async function readFileFromMdorMds(
  slug: string,
  baseDir: string
): Promise<string | null> {
  const extensions = [".md", ".mdx"];
  let fileContent: string | null = null;
  let usedExt: string | null = null;

  for (const ext of extensions) {
    const filepath = path.join(getPostDirPath(), `${slug}${ext}`);
    try {
      fileContent = await readFile(filepath, "utf-8");
      usedExt = ext;
      break;
    } catch {
      continue;
    }
  }

  if (!fileContent || !usedExt) {
    console.warn(`No valid file found for slug: ${slug}${usedExt}`);
    return null;
  }
  return fileContent;
}

export const getSlugs = async (baseDir: string): Promise<string[]> => {
  const postDirPath = path.join(baseDir, "./contents/tech-blog");
  const postFiles = await readdir(postDirPath);

  return postFiles
    .map((file) => {
      if (path.extname(file) === ".md" || path.extname(file) === ".mdx") {
        const slug = path.basename(file, path.extname(file));
        return slug;
      }
      return null;
    })
    .filter(Boolean) as string[];
};
