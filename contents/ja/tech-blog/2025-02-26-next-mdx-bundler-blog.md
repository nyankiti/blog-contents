---
title: Next.jsとmarkdownのブログでcontentlayerからmdx-bundlerに移行した話
slug: 2025-02-26-next-mdx-bundler-blog
tags:
  - tech
  - next
  - contentlayer
  - mdx
  - markdown
isPublished: true
isDeleted: false
publishedAt: 2025-02-26T10:44:36.000Z
updatedAt: 2025-02-28T14:05:18.000Z
views: 44
viewsBeforeI18n: '35'
---

## はじめに

本ブログで利用していた[contentlayer](https://github.com/contentlayerdev/contentlayer)がメンテナンスを停止したので、[mdx-bundler](https://github.com/kentcdodds/mdx-bundler)へ移行しました。

現状の記事管理ではmdxを使っているわけではないのですが、これを機に表現の幅を広げられたら嬉しいなと思い mdx-bundler を選定しました。

appディレクトリ配下ではない場所でmarkdownファイルを管理しているため、[Next.js公式にあるmdxの利用方法](https://nextjs.org/docs/pages/building-your-application/configuring/mdx)はあまり参考にならず、自前でゴリゴリ実装する羽目になりましたがなんとか実現できたのでその記録を残します。

[contentlayerから移行の際の注意点](#contentlayerから移行の際の注意点) にあるように、contentlayerっぽい作りをそのまま利用することはできないといのでこれから実施する人は注意してください。


## 実装紹介
### 記事一覧取得部分
記事一覧はmarkdownのfrontmatterの情報のみが必要なため、mdx-bundlerは利用せず、[gray-matter](https://github.com/jonschlinkert/gray-matter)を用いて記事の情報を取得しました。

```tsx
export const baseDir = process.env.BASE_DIR || process.cwd();

export const getPostDirPath = () =>
  path.join(baseDir, "../blog-contents/contents/tech-blog");

export async function getFrontMatter(
  slug: string
): Promise<FrontMatter | null> {
  try {
    const fileContent = await readFileFromMdorMds(slug);
    if (!fileContent) return null;
    const { data } = matter(fileContent);

    // 型アサーションで FrontMatter 型を適用
    return data as FrontMatter;
  } catch (error) {
    console.error("Error reading Markdown file:", error);
    return null;
  }
}

export const getAllPosts = async (): Promise<FrontMatter[]> => {
  const postDirPath = getPostDirPath();
  const postFiles = await readdir(postDirPath);
  const slugs = postFiles.map((file) =>
    path.basename(file, path.extname(file))
  );

  const frontMattersPromises = slugs.map((slug) => getFrontMatter(slug));
  const frontMatters = (await Promise.all(frontMattersPromises)).filter(
    (post): post is FrontMatter => post !== null
  );

  return frontMatters;
};
```

### bundleMDXの設定
markdown内で画像を利用しているため、remarkMdxImagesの適用と、esbuildOptionsにて、Next.jsのpublicフォルダに画像を配置するように設定しました。
```tsx
import { bundleMDX } from "mdx-bundler";

export const loadMDX = async (fileContent: string) => {
  return bundleMDX<FrontMatter>({
    source: fileContent,
    cwd: getPostDirPath(),
    mdxOptions(options) {
      options.remarkPlugins = [
        ...(options.remarkPlugins ?? []),
        remarkGfm,
        remarkMdxImages,
      ];
      options.rehypePlugins = [
        ...(options.rehypePlugins ?? []),
        rehypeSlug,
      ];
      return { ...options, providerImportSource: "@mdx-js/react" };
    },
    esbuildOptions(options) {
      options.outdir = path.join(baseDir, "public/images/blog/");
      options.loader = {
        ...options.loader,
        ".gif": "file",
        ".jpeg": "file",
        ".jpg": "file",
        ".png": "file",
        ".svg": "file",
        ".webp": "file",
      };
      options.publicPath = "/images/blog/";
      options.write = true;
      return options;
    },
  });
};

```

### 記事詳細ページ
app/blog/[slug]/page.tsx
```tsx
export const dynamic = "error";
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getSlugs();
  return slugs.map((slug) => {
    return { slug };
  });
}

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const fileContent = await readFileFromMdorMds(slug);
  if (!fileContent) return notFound();

const mdx = await loadMDX(fileContent);
const { frontmatter, code } = mdx;

return (
    <article>
        {/* 記事のメタデータなど, frontmatterの情報を表示するセクション */}
    
        <MDXComponent code={code}/>
    </article>
);
```

app/blog/[slug]/MDXComponent.tsx
```tsx
"use client";
import { useMemo } from "react";
import { getMDXComponent } from "mdx-bundler/client";
import { MDXProvider, useMDXComponents } from "@mdx-js/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

const GLOBAL_CONFIG = {
  MdxJsReact: {
    useMDXComponents,
  }
};

export function MDXComponent({ code }: { code: string }) {
  const Component = useMemo(() => getMDXComponent(code, MDX_GLOBAL_CONFIG),[code]);

  return (
    <MDXProvider
      components={{
        code: ({ ...props }) => {
          const { className, children } = props;
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <SyntaxHighlighter
              language={match[1]}
              PreTag="div"
              {...props}
              style={oneDark}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      <Component />
    </MDXProvider>
  );
}
```
[こちら](https://github.com/kentcdodds/mdx-bundler?tab=readme-ov-file#custom-components-in-downstream-files)を参考に、codeのハイライト等のクライアント側でのcustom componentsを利用できるような設定を実施しています。


## contentlayerから移行の際の注意点
contentlayerの場合は、`.contentlayer`配下にmarkdownファイルの情報をまとめたjsonを作成し、ビルド生成物としてバンドルしてしまうので、SSRの際にファイルシステムへアクセスせずとも記事情報を取得することで来ていました。

mdx-bundlerのみで同じような機能を実装しようとすると、SSRの際にファイルアクセスしてエラーが出るので、SSGのみにしておくか、ビルド時にファイルを読み込むようにしておく必要があるということです。

自分の場合、mdファイルを読み込む必要がある `/blog/[slug]/page.tsx` については以下の設定を適用し、SSGのみにする対応としました。

```
export const dynamic = "error";
export const dynamicParams = false;
```
https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config

⚠️ fetchでrevalidateを用いているISRは利用できません。file system参照でエラーになると思うので削除してください。自分はfetchのrevalidateしている部分があることに忘れて1日ほどハマりました。。。




## `@next/mdx`を利用しなかった理由
ブログ記事を別のmarkdownのみのリポジトリで管理していたからです。
`@next/mdx`の場合、Next.jsのお作法に従って mdxファイルをappフォルダ配下に配置する必要があり、ブログ記事管理とフロントエンドの実装が疎結合になるのが気に入りませんでした。

参考: https://nextjs.org/docs/pages/building-your-application/configuring/mdx

## `next-mdx-remote`を利用しなかった理由
esbuildをdependencyに含めてしまって,mdx内のimportを解決してくれるのが嬉しいです。
markdownで記事を管理するリポジトリにComponentを配置することができるので、記事の管理をフロントエンドの実装に依存させることなく管理できます。


## 最後に
mdx-bundlerでは以下のようにわかりやすい感じでmarkdownにBookmark(Linkcard)を配置することができて良い感じだなと🎉
```
import { Bookmark } from "../../components/Bookmark";

<Bookmark href="https://sokes-nook.net/blog/next-web-push" siteUrl="https://sokes-nook.net" />
```
表示結果↓
<Bookmark href="https://sokes-nook.net/blog/next-web-push" siteUrl="https://sokes-nook.net" />


mdxに移行する以前は、Bookmark(Linkcard)を表示するために以下のようななんちゃってのunifiedプラグインを作って頑張っていましたが、とてもシンプルになってとてもほっこりです。

<Bookmark href="https://sokes-nook.net/blog/unified-notion-bookmark" siteUrl="https://sokes-nook.net" />



contentlayerとmdx-bundlerは同じ役割ではないので、厳密には移行とは言えないと注意されそうなので補足しておくと、contentlayer利用時のレンダリングには[react-markdwon](https://github.com/remarkjs/react-markdown)を利用していました。
