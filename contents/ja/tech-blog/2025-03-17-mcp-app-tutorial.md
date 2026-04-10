---
title: node.jsアプリケーションで簡易MCP クライアント/サーバーを作成する
slug: 2025-03-17-mcp-app-tutorial
tags:
  - tech
  - MCP
  - AI
  - node.js
isPublished: true
isDeleted: false
publishedAt: 2025-03-16T15:12:25.000Z
updatedAt: 2025-03-23T17:20:03.000Z
views: 1029
viewsBeforeI18n: '184'
---

## はじめに
巷で話題のMCPについて、Claude DesktopやCursor, ClineなどをMCPクライアントとして紹介されている記事は多いものの、node.jsアプリケーションに組み込む方法は紹介されていないように感じたので、自作のアプリケーションに組み込む方法を紹介します。

公式ドキュメントやその他ブログ等の情報である程度MCPの情報をキャッチアップし終わり、そろそろ実装してみようかなといった人の参考になれば嬉しいなーと思っています。

記事を読むのが面倒な方は以下で実装を公開しています。
https://github.com/nyankiti/genai-lab/blob/main/src/mcpApp.ts


## そもそもMCPとは
<Bookmark href="https://modelcontextprotocol.io/" />

LLMに外部データソースを組み込むためのプロトコルです。
外部データソースとは、最新の天気やローカルのファイルシステム、自社のDBなど様々です。MCPで統一されるフォーマットに従って、AI Agent的に動くLLMに追加のアクションを提供するものとなります。
できることとしては、openAIの[function-calling](https://platform.openai.com/docs/guides/function-calling)とほとんど同じと感じています。function-callingに比較して実装の自由度が高くモデルに依存しないものとなっているので今後のAI Agentへの外部データソース組み込みのスタンダードになっていくのでは？と注目しています。

本記事ではnode.jsを用いて簡易的なMCP ClientとMCP Serverを作成方法を紹介します。

## 実装したもの
- github上のあるリポジトリの直近のマージされたPRの情報を取得するツールを要するMCPサーバー
- プロンプトを受け取り、必要に応じて上記 MCPサーバーが提供するツールを利用しながら回答するAI
  - AIクライアントには[groq-sdk](https://www.npmjs.com/package/groq-sdk)、モデルは`llama-3.3-70b-versatile`で利用

### MCPサーバー
mcp-server.ts
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { GithubClient } from 'libs/github-clinet';
import { setupPromptHandlers } from './prompts';
import { setupToolHandlers } from './tools';

const mcpServer = new Server(
  {
    name: 'my-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {},
      tools: {},
    },
  },
);
const githubClinet = new GithubClient();

console.error('my MCP Server starting...');

setupToolHandlers(mcpServer, githubClinet);

console.error('my MCP Server started');

async function runServer() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('my MCP Server running on stdio');
}
runServer().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

```

tools.ts
```typescript
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { GithubClient } from 'libs/github-clinet';

// Toolsの定義
const TOOLS: Record<string, Tool> = {
  'github-repo-merged-PRs-last-week': {
    name: 'github-repo-merged-PRs-last-week',
    description:
      'Retrieves detailed information about pull requests that were merged within the last week in the specified GitHub repository (owner/name). This method uses GitHub API v4 (GraphQL) to fetch data, including PR title, author, merge date, number of changed files, additions, deletions, and review status.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
        },
        name: {
          type: 'string',
        },
      },
      required: ['owner', 'name'],
    },
  },
};

export const setupToolHandlers = (mcpServer: Server, githubClient: GithubClient) => {
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(TOOLS),
  }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = TOOLS[request.params.name];
    if (!tool) {
      throw new Error(`Tool not found: ${request.params.name}`);
    }
    // TOOLSにて定義したtoolごとに具体的な処理を実装する
    if (request.params.name === 'github-repo-merged-PRs-last-week') {
      const owner = request.params.arguments?.owner as string;
      const name = request.params.arguments?.name as string;
      console.log('owner:', owner);
      console.log('name:', name);
      const repositoryPullRequestsResult = await githubClient.getMergedPRsLastWeek(owner, name, 3);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(repositoryPullRequestsResult),
          },
        ],
      };
    }

    throw new Error('Tool implementation not found');
  });
};

```

### AIクライアント(MCPクライアント)
`messages`配列の中に、MCPサーバーを呼び出すための`role:assistant`なメッセージ, MCPサーバーからのレスポンスを追加して文脈を増やしながら最終的な回答を生成するという流れで実装しています。

mcp-client.ts
```typescript
import path from 'node:path';
import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import type {
  ChatCompletionMessageParam as GroqChatCompletionMessageParam,
  ChatCompletionTool as GroqChatCompletionTool,
} from 'groq-sdk/resources/chat/completions';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources';
import { z } from 'zod';

dotenv.config();

const myMCPServerScriptPath = path.join(process.cwd(), 'src', 'libs', 'mcp-server', 'index.ts');

const MODEL_NAME = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 1000;

export class MyMCPClient {
  private mcpClient: MCPClient;
  private openaiClient: OpenAI;
  private groqClient: Groq;
  private transport: StdioClientTransport;
  private availableTools: Awaited<ReturnType<MCPClient['listTools']>>['tools'] = [];

  constructor() {
    this.mcpClient = new MCPClient({
      name: 'my-mcp-client',
      version: '1.0.0',
    });
    this.openaiClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    this.groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const githubPersonalAccessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!githubPersonalAccessToken) throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is not set');

    this.transport = new StdioClientTransport({
      command: 'tsx',
      args: [myMCPServerScriptPath],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: githubPersonalAccessToken,
        ...(process.env as Record<string, string>),
      },
    });
  }

  async connectToServer(): Promise<void> {
    await this.mcpClient.connect(this.transport);
    console.log('Connected to MCP server');
    const listToolsResponse = await this.mcpClient.listTools();
    this.availableTools = listToolsResponse.tools;
  }

  async processQuery(query: string): Promise<string | null | undefined> {
    const messages: Array<GroqChatCompletionMessageParam & { name?: string }> = [
      { role: 'user', content: query },
    ];
    const availableTools: Array<GroqChatCompletionTool> = this.availableTools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));

    const response = await this.groqClient.chat.completions.create({
      model: MODEL_NAME,
      messages: messages,
      tools: availableTools,
      tool_choice: 'required',
      max_completion_tokens: 4096,
    });

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;
    if (toolCalls) {
      messages.push(responseMessage);
      for (const toolCall of toolCalls.slice(0, 1)) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        const toolResult = await this.mcpClient.request(
          {
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: toolArgs,
            },
          },
          z.any(),
        );

        // FOR DEBUG
        console.log('Tool call result:', toolResult);
        const toolResultContents = JSON.stringify(
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          toolResult.content.map((content: any) => {
            if (content.type === 'text') return content.text;
            throw Error(`content type not supported: ${content.type}, ${content}`);
          }),
        );
        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolName,
          content: toolResultContents,
        });
      }
      const secondResponse = await this.groqClient.chat.completions.create({
        model: MODEL_NAME,
        messages: messages,
      });
      return secondResponse.choices[0].message.content;
    }
    return responseMessage.content;
  }

  async close(): Promise<void> {
    await this.mcpClient.close();
  }
}

```

### 動作確認
`'facebook/react リポジトリの直近一週間にマージされPRの内容についてmarkdown形式で要約して。どのような議論があったかも要約して。PRのリンクも参照できるようにして。'`とAIに質問した場合の結果にです。

```markdown
### facebook/react リポジトリの直近一週間にマージされたPRの内容について

以下のPRは、直近一週間にマージされたPRです。

*   **PR \#32621: Partially revert #32588**
    *   このPRは、テストが適切に実行されない問題を修正するために、前のPR \#32588で行われた一部の変更を取り消しています。
    *   [PR \#32621](https://github.com/facebook/react/pull/32621)
*   **PR \#32617: Remove Mutation Check Around commit/measureUpdateViewTransition**
    *   このPRは、`commit/measureUpdateViewTransition`にわざわざ変更をチェックする必要がないことを認識し、不要なチェックを削除しています。
    *   [PR \#32617](https://github.com/facebook/react/pull/32617)
*   **PR \#32613: Move traverseFragmentInstanceChildren to internal ReactFiberTreeReflection**
    *   このPRは、`traverseFragmentInstanceChildren`という関数を、内部の`ReactFiberTreeReflection`モジュールに移動することで、ConfigがFiberの内部を知らなくても済むようにしています。
    *   [PR \#32613](https://github.com/facebook/react/pull/32613)
*   **PR \#32612: Measure and apply names for the "new" phase**
    *   このPRは、"new"フェーズの AnimatedとSwipeで Namesの確認と適用を実装しています。
    *   [PR \#32612](https://github.com/facebook/react/pull/32612)
*   **PR \#32599: Find Pairs and Apply View Transition Names to the Clones in the "old" Phase**
    *   このPRは、"old"フェーズで、AnimatedとSwipeに対して、ViewTransition Boundariesと名前の一致を確認しています。
    *   [PR \#32599](https://github.com/facebook/react/pull/32599)

### PRの議論について

これらのPRについては、多くの議論や確認が行われています。開発者同士で_CODE_やロジックについて意見を出し合い、各自が行った変更点について説明しています。 一部のPRでは、スクリーンショットを通じて問題点の可視化が行われ、理解を促進しています。 逆に、他のPRでは、開発者間での確認や承認が、テキストベースでのみ行われている様子があります。 このように、facebook/reactの開発では、開発者のコミュニケーションが活発に行われていることが感じられます。
```


以下はmessageオブジェクトの中身です。
```
[
  {
    role: 'user',
    content: 'facebook/react リポジトリの直近一週間にマージされPRの内容についてmarkdown形式で要約して。どのような議論があったかも要約して。PRのリンクも参照できるようにして。'
  },
  {
    role: 'assistant',
    tool_calls: [
      {
        id: 'call_akw3',
        type: 'function',
        function: {
          name: 'github-repo-merged-PRs-last-week',
          arguments: '{"owner": "facebook", "name": "react"}'
        }
      }
    ]
  },
  {
    tool_call_id: 'call_akw3',
    role: 'tool',
    name: 'github-repo-merged-PRs-last-week',
    content: '[toolからのレスポンス]' 
  }
]
```


## 最後に
AI Agenet的にLLMを利用するとどうしても利用トークンが爆増しまうので、現状個人のアプリケーションに組み込むにはコストがすごいことになりそうな気がしました🥲

groqの無料枠の範囲内で効率的な情報収集や定期実行等で利用できればよいなーと思ったりしています。
