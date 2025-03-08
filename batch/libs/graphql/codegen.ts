import type { CodegenConfig } from "@graphql-codegen/cli";
import dotenv from "dotenv";

// for local
dotenv.config();

const githubPersonalAccessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

console.log(githubPersonalAccessToken);

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    {
      "https://api.github.com/graphql": {
        headers: {
          Authorization: `Bearer ${githubPersonalAccessToken}`,
          "User-Agent": "graphql-codegen",
        },
      },
    },
  ],
  documents: "batch/libs/graphql/schema.graphql",
  generates: {
    "batch/libs/graphql/generated/index.ts": {
      plugins: ["typescript", "typescript-operations"],
    },
  },
};

export default config;
