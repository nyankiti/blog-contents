---
title: Flexsearchを用いてNext.jsにサイト内検索を実装する
slug: 2025-04-04-next-flexsearch
tags:
  - tech
  - flexsearch
  - next
  - fulltextsearch
isPublished: true
isDeleted: false
publishedAt: 2025-04-04T13:03:19.000Z
updatedAt: 2025-04-04T13:46:39.000Z
views: 105
viewsBeforeI18n: '5'
---
# Intro

MarkdownファイルとNext.js（ver15, app router）で構築している本ブログにFlexsearchを利用してサイト内検索を実装したので紹介します。[このブログのトップページ](https://sokes-nook.net/)に行くと検索窓があると思います。

flexsearchはブラウザ完結で動かすことが可能で、ElasticsearchやAlgoriaみたいなサーバーを導入する必要がないので無料で利用することができます。個人ブログに手軽に検索を導入したい方に届いて欲しいと思い記事を執筆しました。


# Flexsearchとは
https://github.com/nextapps-de/flexsearch

FlexSearch は、高速かつ柔軟な全文検索ライブラリです。JavaScript（TypeScript）で実装されており、クライアント,サーバー両方で動作可能です。軽量なサイト内検索を実装するのに適しています。

ブラウザにインデックスを送信する方法を紹介するので、インデックスサイズが大きくなるような利用方法ではFlexsearchは適しません。Elasticsearchなどその他の検索エンジンをご検討ください。

その他のブラウザ完結の全文検索ライブラリとして候補に [Pagefind](https://pagefind.app/)がありましたが、Next.jsのapp routerと相性が悪く、Flexsearchほど自由度が高くなかっったので採用できませんでした。

Pagefindについては以下のブログがとてもわかりやすかったです。
<Bookmark href="https://azukiazusa.dev/blog/static-site-search-engine-and-ui-library-pagefind/" />


また、[Nextra](https://github.com/shuding/nextra)が提供しているサイト内検索がFlexsearchを利用しているとのことです。
<Bookmark href="https://nextra.site/docs/guide/search" />


# 実装紹介
## indexの作成
以下のpublicリポジトリにindex作成のソースコードがあります。
https://github.com/nyankiti/blog-contents/blob/main/batch/libs/generate-search-index.ts

### 処理の流れ
1. Markdownのブログ記事を格納しているディレクトリを読み込み、markdownの内容を取得
2. Markdownの基本を削除して、全文検索しやすい文章にクリーニング
3. 全文検索のための日本語のトークナイズ（簡易）
4. jsonとしてインデックスを保存

```ts:generate-search-index.ts
import matter from "gray-matter";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import strip from "strip-markdown";
import { remark } from "remark";
import { baseDir, getSlugs, readFileFromMdorMds, techBlogDir } from "./file";

export type PostDocument = {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  content: string;
};

const removeBookmarkImport = (text: string) => {
  return text.replace(/^import { Bookmark } from ["'].*["'];?\n?/gm, "");
};

export const cleanMarkdown = async (content: string) => {
  const result = await remark().use(strip).process(content);
  return removeBookmarkImport(String(result));
};

// 日本語文字列の分かち書き（簡易版）
// TODO: kuromoji.js や TinySegmenter などのライブラリを用いて精度改善
export const tokenizeJapanese = (text: string): string => {
  // この簡易実装では、以下を行います：
  // 1. 英数字と日本語の間に空白を挿入
  // 2. 句読点の後に空白を挿入

  // 英数字と日本語の境界に空白を追加
  let tokenized = text.replace(/([a-zA-Z0-9]+)([ぁ-んァ-ン一-龥])/g, "$1 $2");
  tokenized = tokenized.replace(/([ぁ-んァ-ン一-龥])([a-zA-Z0-9]+)/g, "$1 $2");

  // 句読点の後に空白を追加（。、！？）
  tokenized = tokenized.replace(/([。、！？])/g, "$1 ");

  return tokenized;
};

export const generateSearchIndex = async () => {
  const slugs = await getSlugs(techBlogDir);
  const searchIndex: PostDocument[] = [];

  for (const slug of slugs) {
    const fileContent = await readFileFromMdorMds(slug, techBlogDir);
    if (!fileContent) continue;

    const { data, content } = matter(fileContent);

    // Markdownの記法を削除してクリーンなテキストを取得
    const cleanedContent = await cleanMarkdown(content);

    // 日本語のトークン化
    const tokenizedContent = tokenizeJapanese(cleanedContent);
    const tokenizedTitle = tokenizeJapanese(data.title || "");

    searchIndex.push({
      slug,
      title: tokenizedTitle,
      tags: data.tags || [],
      content: tokenizedContent,
      date: data.publishedAt || "",
    });
  }

  await writeFile(
    path.join(baseDir, "dist/tech-blog-search-index.json"),
    JSON.stringify(optimizedIndex)
  );

  // インデックスのファイルサイズ（概算）
  const indexSize = JSON.stringify(optimizedIndex).length / 1024; // KB単位

  console.log(
    `検索インデックスを生成しました。合計 ${
      searchIndex.length
    } 件の記事をインデックス化しました。（サイズ: 約${indexSize.toFixed(2)}KB）`
  );
};

```

検索の精度を上げたい場合は、以下で紹介されているようなKuromoji等を用いて改善できそうです。本ブログでは簡単な全文検索で今のところ十分かなと感じているのでここまでは踏み込んでいません。
- [Flexsearch × Kuromoji による日本語フレンドリーなサイト内検索の追加](https://tenderfeel.xsrv.jp/javascript/5711/)


## Next.js側での検索

### 処理の流れ
1. 初期レンダリング時のuseEffectを用いてブラウザのFlexSearch.Documentクラスを作成し、useRefを用いてrefに格納しておく
2. 検索クエリの変更を検知するuseEffectを作成し、検索を実施する
3. 結果のレンダリング時にクエリと一致する文字列にハイライトを適用する

```tsx:SearchBar.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import FlexSearch, { Document } from "flexsearch";
import { BLOG_CONTENTS_URL } from "@/constants";

/**
 * generate-search-index.ts 側で生成したtech-blog-search-index.jsonに基づく
 */
export type PostDocument = {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  content: string;
};

export const SearchBar = () => {
  const indexRef = useRef<Document<PostDocument, string[]> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PostDocument[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // インデックスの読み込みと初期化
  useEffect(() => {
    async function initializeSearchIndex() {
      if (typeof window === "undefined") return;
      setIsLoading(true);
      try {
        // インデックスを初期化
        const index = new FlexSearch.Document<PostDocument, string[]>({
          preset: "match",
          tokenize: "reverse",
          document: {
            id: "slug",
            index: ["title", "content", "tags"],
            store: ["slug", "title", "tags", "date", "content"],
          },
        });

        // 検索インデックスJSONを取得
        const res = await fetch(
          `${BLOG_CONTENTS_URL}/tech-blog-search-index.json`
        );
        const data = await res.json();

        data.forEach((post: PostDocument) => {
          index.add(post);
        });

        // インデックスを参照に保持
        indexRef.current = index;
      } catch (error) {
        console.error("検索インデックスの初期化に失敗しました:", error);
      }
      setIsLoading(false);
    }

    initializeSearchIndex();
  }, []);

  // 検索処理
  useEffect(() => {
    if (searchTerm.trim() === "" || isLoading || !indexRef.current) {
      return;
    }

    try {
      const titleResults = indexRef.current.search<true>(searchTerm, 10, {
        index: "title",
        enrich: true,
      });

      const contentsResults = indexRef.current.search<true>(searchTerm, 10, {
        index: "content",
        enrich: true,
      });

      const tagsResults = indexRef.current.search<true>(searchTerm, 10, {
        index: "tags",
        enrich: true,
      });

      const allResults = new Map<string, PostDocument>(); // 重複を除くために Map を使用
      [titleResults, contentsResults, tagsResults].forEach((resultSet) => {
        if (resultSet.length > 0) {
          resultSet[0].result.forEach((item) => {
            if (!allResults.has(item.doc.slug)) {
              allResults.set(item.doc.slug, item.doc);
            }
          });
        }
      });

      const mergedResults = Array.from(allResults.values());

      setSearchResults(mergedResults);
      setIsModalOpen(mergedResults.length > 0);
    } catch (error) {
      console.error("検索処理中にエラーが発生しました:", error);
    }
  }, [searchTerm, isLoading]);

  // 検索結果のハイライト
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const segments = text.split(new RegExp(`(${query})`, "gi"));
    return segments.map((segment, index) =>
      segment.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="bg-yellow-200">
          {segment}
        </span>
      ) : (
        segment
      )
    );
  };

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 記事の内容を抜粋（検索語を含む部分）
  const getContentExcerpt = (
    content: string,
    query: string,
    length: number = 150
  ) => {
    if (!query.trim()) return content.slice(0, length) + "...";

    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) return content.slice(0, length) + "...";

    const start = Math.max(0, index - length / 2);
    const end = Math.min(content.length, index + query.length + length / 2);

    return (
      (start > 0 ? "..." : "") +
      content.slice(start, end) +
      (end < content.length ? "..." : "")
    );
  };

  // 外部クリックの処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="ブログ内を検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* 検索結果 - 入力フォームの下に固定 */}
      {isModalOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl z-40 max-h-[70vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-semibold text-lg">
              「{searchTerm}」の検索結果 ({searchResults.length}件)
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 検索結果リスト */}
          <div className="overflow-y-auto max-h-[60vh]">
            {searchResults.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {searchResults.map((result) => (
                  <li key={result.slug} className="p-4 hover:bg-gray-50">
                    <a href={`/blog/${result.slug}`} className="block">
                      <h4 className="text-lg font-semibold mb-1 text-blue-600">
                        {highlightText(result.title, searchTerm)}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span>{formatDate(result.date)}</span>
                        <span>•</span>
                        <div className="flex flex-wrap gap-1">
                          {result.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {highlightText(tag, searchTerm)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">
                        {highlightText(
                          getContentExcerpt(result.content, searchTerm),
                          searchTerm
                        )}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">検索結果がありません</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

# Outro
検索のハイライト部分とかはAIに作ってもらいました。
自分が形態素解析等の自然言語に全く詳しくないのであまりチューニングできていませんが、最低限の検索体験は提供レベルになっている気がします。
日本語でFlexsearchを紹介している記事が少なかったので、参考になれば幸いです。


