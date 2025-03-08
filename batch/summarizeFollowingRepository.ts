import { gql } from "@apollo/client";
import {
  Repository,
  PullRequest,
  PullRequestConnection,
} from "./libs/graphql/generated";
import { githubClient } from "./libs/github-client";

interface RepositoryInput {
  owner: string;
  name: string;
}

// graphql-codegenの型定義を利用して型合成
export type RepositoryPullRequests = Pick<Repository, "pullRequests"> & {
  pullRequests: Pick<PullRequestConnection, "nodes"> & {
    nodes: Array<
      | (Pick<PullRequest, "title" | "url" | "mergedAt" | "createdAt"> & {
          author: {
            login: string;
          } | null;
        })
      | null
    >;
  };
};

// dynamicなキーで型を生成
export type GetRepositoriesResponse<T extends readonly RepositoryInput[]> = {
  [K in T[number] as `${K["owner"]}_${K["name"]}`]: RepositoryPullRequests;
};

const createQuery = (repositories: RepositoryInput[]) => {
  const repoQueries = repositories
    .map(
      ({ owner, name }, index) => `
        ${owner}_${name}: repository(owner: "${owner}", name: "${name}") {
          pullRequests(
            first: 10,
            orderBy: { field: UPDATED_AT, direction: DESC },
            states: [MERGED],
          ) {
            nodes {
              title
              author {
                login
              }
              url
              mergedAt
              createdAt
            }
          }
        }
      `
    )
    .join("\n");
  return gql`
    query GetRepositories {
      ${repoQueries}
    }
  `;
};

export async function run() {
  try {
    const targetRepos = [
      { owner: "facebook", name: "react" },
      { owner: "torvalds", name: "linux" },
    ];

    const { data } = await githubClient().query<
      GetRepositoriesResponse<typeof targetRepos>
    >({
      query: createQuery(targetRepos),
    });

    Object.entries(data).forEach(([key, value]) => {
      console.log("key", key);
      value.pullRequests.nodes.forEach((node) => {
        console.log("node", node);
      });
    });
  } catch (error) {
    console.error("Error fetching repository info:", error);
  }
}

run();
