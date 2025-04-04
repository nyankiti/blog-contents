import path from "node:path";
import { execSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

export const baseDir = process.env.BASE_DIR || process.cwd();

export const distDir = path.join(baseDir, "dist");

export const contentsDir = path.join(baseDir, "contents");

export const techBlogDir = path.join(contentsDir, "tech-blog");

export const gourmetBlogDir = path.join(contentsDir, "gourmet");

export async function readFileFromMdorMds(
  slug: string,
  postDir: string
): Promise<string | null> {
  const extensions = [".md", ".mdx"];
  let fileContent: string | null = null;
  let usedExt: string | null = null;

  for (const ext of extensions) {
    const filepath = path.join(postDir, `${slug}${ext}`);
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

export const getSlugs = async (postDir: string): Promise<string[]> => {
  const postFiles = await readdir(postDir);

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

export const copyImageToDist = () => {
  execSync(
    `find ${contentsDir} -type d -name "images" | xargs -I {} cp -r {} ${distDir}`,
    { stdio: "inherit" }
  );
};
