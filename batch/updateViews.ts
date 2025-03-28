import * as core from "@actions/core";
import { GaApiClient } from "./libs/ga-client";
import { writeFile, readFile } from "node:fs/promises";
import matter from "gray-matter";
import path from "path";

export async function run() {
  const gaApiClient = new GaApiClient();
  const baseDir = process.env.GITHUB_WORKSPACE
    ? process.env.GITHUB_WORKSPACE
    : "/home/runner/work/blog-contents";
  const targetBasePaths = ["blog", "gourmet"] as const;
  const contentsPathMap = {
    blog: path.join(baseDir, "contents/tech-blog"),
    gourmet: path.join(baseDir, "contents/gourmet"),
  };

  for (const targetBasePath of targetBasePaths) {
    const pvMap = await gaApiClient.getPv(targetBasePath);
    const contentsPath = contentsPathMap[targetBasePath];

    for (const slug in pvMap) {
      const filePath = path.join(contentsPath, `${slug}.md`);

      try {
        const content = await readFile(filePath, "utf-8");

        const file = matter(content);

        // views数が更新されていない場合はファイル書き込みをスキップする
        if (file.data.views === pvMap[slug]) {
          core.debug(`Skipping ${slug}: page views unchanged (${pvMap[slug]})`);
          continue;
        }

        file.data.views = pvMap[slug];

        const updatedContent = matter.stringify(file.content, file.data);

        await writeFile(filePath, updatedContent);
        core.info(`Successfully updated ${slug} views`);
      } catch (err) {
        // ファイルが存在しない、view数の変化がない場合などはこちらのエラーに入る
        console.error(err);
      }
    }
  }
}

run();
