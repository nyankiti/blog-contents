import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import dotenv from "dotenv";

// for local
dotenv.config();

const githubPersonalAccessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

export const githubClient = () => {
  if (!githubPersonalAccessToken) {
    throw new Error("GITHUB_PERSONAL_ACCESS_TOKEN is not set");
  }
  // Apollo Clientのインスタンス作成
  return new ApolloClient({
    uri: "https://api.github.com/graphql",
    cache: new InMemoryCache(),
    headers: {
      Authorization: `Bearer ${githubPersonalAccessToken}`,
    },
  });
};
