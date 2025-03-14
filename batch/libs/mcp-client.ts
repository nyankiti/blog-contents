import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";
import path from "path";
import { z } from "zod";
import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources";

// for local
dotenv.config();

const githubMCPServerScriptPath = path.join(
  process.cwd(),
  "node_modules",
  "@modelcontextprotocol",
  "server-github",
  "dist",
  "index.js"
);

const MODEL_NAME = "deepseek-r1-distill-llama-70b";
const MAX_TOKENS = 1000;

export class MyMCPClient {
  private mcpClient: MCPClient;
  private openaiClient: OpenAI;
  private transport: StdioClientTransport;
  private availableTools: any[] = [];

  constructor() {
    this.mcpClient = new MCPClient({
      name: "github-mcp-client",
      version: "1.0.0",
    });
    this.openaiClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const githubPersonalAccessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!githubPersonalAccessToken)
      throw new Error("GITHUB_PERSONAL_ACCESS_TOKEN is not set");

    this.transport = new StdioClientTransport({
      command: githubMCPServerScriptPath,
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: githubPersonalAccessToken,
        ...(process.env as Record<string, string>),
      },
    });
  }

  async connectToServer(): Promise<void> {
    await this.mcpClient.connect(this.transport);
    console.log("Connected to MCP server");
    const listToolsResponse = await this.mcpClient.listTools();
    this.availableTools = listToolsResponse.tools;
  }

  async processQuery(query: string): Promise<string> {
    const messages: Array<ChatCompletionMessageParam> = [
      { role: "user", content: query },
    ];
    const availableTools: Array<ChatCompletionTool> = this.availableTools.map(
      (tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      })
    );

    const response = await this.openaiClient.chat.completions.create({
      model: MODEL_NAME,
      max_tokens: MAX_TOKENS,
      messages,
      tools: availableTools,
      tool_choice: "auto",
    });

    const message = response.choices[0].message;

    // tool callsがない場合は一度で返す
    if (!message.tool_calls) {
      return message.content ?? "";
    }

    const finalText: string[] = [];
    messages.push(message);

    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name;
      const toolCallId = toolCall.id;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      const toolResult = await this.mcpClient.request(
        {
          method: "tools/call",
          params: toolArgs,
        },
        z.any()
      );
      const toolResultContents = toolResult.content.map((content: any) =>
        content.model_dump()
      );
      finalText.push(
        `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
      );

      messages.push({
        role: "tool",
        tool_call_id: toolCallId,
        content: toolResultContents,
      });

      const followUpResponse = await this.openaiClient.chat.completions.create({
        model: MODEL_NAME,
        max_tokens: MAX_TOKENS,
        messages,
        tools: availableTools,
      });

      if (!followUpResponse.choices[0].message.content)
        throw Error("message not found");
      finalText.push(followUpResponse.choices[0].message.content);
    }

    return finalText.join("\n");
  }

  async mcpToolCallTest(): Promise<void> {
    try {
      const callToolResult = await this.mcpClient.request(
        {
          method: "tools/call",
          params: {
            name: "search_code",
            arguments: {
              q: "test",
              per_page: 10,
              page: 1,
            },
          },
          // list_pull_requestsはまだ対応していない
          // params: {
          //   name: "list_pull_requests", // 呼び出すツール名
          //   arguments: {
          //     owner: "facebook",
          //     repo: "react",
          //     state: "closed",
          //     sort: "updated",
          //     direction: "desc",
          //     per_page: 10,
          //     page: 1,
          //   },
          // },
        },
        z.any() // 型定義スキーマ
      );

      console.log("Tool call result:", callToolResult);
    } catch (error) {
      console.error("Error calling tool:", error);
    }
  }

  async close(): Promise<void> {
    await this.mcpClient.close();
  }
}
