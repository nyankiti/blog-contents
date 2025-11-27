---
id: 194cef7c-d8db-801b-b678-f2aebf817802
title: npm workspaceを用いて共通処理をpackageとして切り出す
date: 2025-02-08T03:37:00.000Z
slug: npm-workspace-shared
tags:
  - tech
  - next
  - npm
excerpt: undefined
updatedAt: 2025-02-08T07:28:00.000Z
isPublished: true
isDeleted: false
publishedAt: 2025-02-08T00:00:00.000Z
views: 343
viewsBeforeI18n: '122'
---
  
以下のような構成でモノレポではあるものの、それぞれ独立したnodeプロジェクトで運用していた状態から、npm workspaceを用いて共通処理置き場(sharedプロジェクト)を作成したのでその方法を紹介します。  
  
  
```text
.  
├── backend  
│   ├── package.json  
│   └── package-lock.json  
├── frontend  
│   ├── next.config.ts  
│   ├── package.json  
│   └── package-lock.json  
└── supabase  
    ├── migrations  
    └── schema.sql  
```  
  
  
**workspace移行後のプロジェクト構成**   
  
  
```text
.  
├── backend  
│   └── package.json  
├── frontend  
│   ├── next.config.ts  
│   └── package.json  
├── node_modules  
├── package-lock.json  
├── package.json  
├── shared  
│   └── package.json  
└── supabase  
    ├── migrations  
    └── schema.sql  
```  
  
  
そもそもnpm workspaceとはという方は以下の記事がすごくわかりやすかったのでおすすめです。  
  
  
<Bookmark href="https://zenn.dev/suin/scraps/20896e54419069" />
  
  
## やったこと   
  
  
### プロジェクトルートにworkspace用のpackage.json作成   
  
  
```json  
{  
  "name": "your-app",  
  "private": true,  
  "workspaces": [  
    "frontend",  
    "backend",  
    "shared"  
  ],  
  "scripts": {  
    "build": "npm run build --workspaces"  
  },  
  "devDependencies": {  
    "@types/node": "^22.13.1",  
    "typescript": "^5.7.3"  
  }  
}  
```  
  
  
全てのパッケージで利用するようなdependenciesはルートに指定しておくことができます。  
  
  
nodeのモジュール解決ではホイスティング（hoisting, 巻き上げ）という機能があり、自分のnode_modulesに該当モジュールがない場合は親のnode_modulesに該当モジュールを探しに行くという機能による恩恵です。  
  
  
### sharedプロジェクト作成  
  
  
プロジェクト構成  
  
  
```json  
.  
├── dist  
├── package.json  
├── src  
│   ├── date.ts  
│   └── index.ts  
└── tsconfig.json  
```  
  
  
shared/package.json  
  
  
```json  
{  
    "name": "@your-app/shared",  
    "private": true,  
    "version": "1.0.0",  
    "main": "dist/index.js",  
    "types": "dist/index.d.ts",  
    "scripts": {  
      "build": "tsc",  
      "watch": "tsc -w"  
    }  
  }  
```  
  
  
shared/tsconfig.json  
  
  
```json  
{  
  "compilerOptions": {  
    "target": "es2018",  
    "module": "commonjs",  
    "declaration": true,  
    "outDir": "./dist",  
    "strict": true,  
    "esModuleInterop": true,  
    "skipLibCheck": true,  
    "forceConsistentCasingInFileNames": true  
  },  
  "include": ["src"],  
  "exclude": ["node_modules", "dist", "**/*.test.ts"]  
}  
  
```  
  
  
shared/index.ts  
  
  
```json  
export * from "./date";  
```  
  
  
shared/date.ts  
  
  
```typescript  
export const getDateStringBeforeN = (n: number) => {  
  const today = new Date();  
  const targetDate = new Date(today);  
  targetDate.setDate(today.getDate() - n);  
  
  const year = targetDate.getFullYear();  
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");  
  const day = String(targetDate.getDate()).padStart(2, "0");  
  return `${year}-${month}-${day}`;  
};  
```  
  
  
プロジェクトをbuildしておく  
  
  
```shell  
npm run build -w shared  
```  
  
  
### frontend側の修正  
  
  
sharedをfrontend側の依存に追加する  
  
  
```shell  
npm i @your-app/shared -w @you-app/frontend  
```  
  
  
sharedの機能を利用する  
  
  
```typescript  
import { getDateStringBeforeN } from "@your-app/shared";  
```  
  
  
**注意点**  
  
  
元々存在していたnode_moduleとpackage-lock.jsonを手動で削除してからルートにて `npm install` を実行する必要があります。これを実施しないと以下のようなエラーで共通処理を正しくimportできないと思います。  
  
  
```text
Module not found: Can't resolve '@your-app/shared'  
```  
  
  
最後にbuildコマンドでsharedプロジェクトを一緒にbuildされるように修正します。  
  
  
```typescript  
  "scripts": {  
    "build": "npm --workspace=@you-app/shared run build && next build"  
  },  
```  
  
  
## 最後に  
  
  
全てのメソッドがshared/index.tsにまとまって一括でimportする構成はなんか微妙な気がする場合はexportを利用する手もあると思います。  
  
  
<Bookmark href="https://zenn.dev/makotot/articles/5edb504ef7d2e6" />
  
