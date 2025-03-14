import { MyMCPClient } from "./libs/mcp-client";

async function main() {
  const client = new MyMCPClient();
  await client.connectToServer();
  // await client.mcpToolCallTest();
  console.log(
    await client.processQuery(
      "facebook/react リポジトリの直近一週間のアクティビティを要約して"
    )
  );
  await client.close();
}

main();
