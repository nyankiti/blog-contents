import * as core from "@actions/core";
import { GaApiClient } from "./libs/ga-client";
import { writeFile, readFile } from "node:fs/promises";

export async function run() {
  const gaApiClient = new GaApiClient();

  const pvMap = await gaApiClient.getPv();

  const contentsPath = process.env.GITHUB_WORKSPACE
    ? process.env.GITHUB_WORKSPACE + "/contents/tech-blog"
    : "/home/runner/work/blog-contents/contents/tech-blog";

  // FrontMatterを抽出するための正規表現
  const metadataRegex = /^---\n([\s\S]*?)\n---\n/m;

  for (const slug in pvMap) {
    const filePath = `${contentsPath}/${slug}.md`;

    try {
      const content = await readFile(filePath, "utf-8");

      const match = content.match(metadataRegex);
      let metadata: Record<string, any> = {};
      if (match) {
        const metadataString = match[1];
        metadata = metadataString
          .split("\n")
          .reduce((acc: Record<string, string>, line) => {
            const [key, value] = line.split(": ");
            acc[key] = value;
            return acc;
          }, {});
      }

      // views数が更新されていない場合はファイル書き込みをスキップする
      if (metadata["views"] == pvMap[slug])
        throw Error(`skip because of ${slug} page views is not changed`);

      // metadataにviewsを追加
      metadata["views"] = pvMap[slug];

      // 新しいメタデータ文字列を作成
      const newMetadataString = Object.entries(metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      // ファイルの内容を更新
      const newContent = content.replace(
        metadataRegex,
        `---\n${newMetadataString}\n---\n`
      );
      await writeFile(filePath, newContent);

      core.info(`Successfully updated ${slug} views`);
    } catch (err) {
      // ファイルが存在しない、view数の変化がない場合などはこちらのエラーに入る
      console.error(err);
    }
  }
}

run();
