---
title: react, next.jsのView Transition API機能を利用したグルメブログを解説してみた。
slug: 2025-03-23-view-transition
tags:
  - tech
isPublished: true
isDeleted: false
publishedAt: 2025-03-23T00:48:51+09:00
updatedAt: 2025-03-23T20:48:03+09:00
views: 0
---
import { Bookmark } from "../../components/Bookmark";

## はじめに
react, next.jsのView Transition API機能を試してみました。

本ブログにも以下にView Transition APIを利用した簡易グルメブログを作成してみました。
https://sokes-nook.net/gourmet

上記のSPA, MPAのアニメーションの実装方法について解説したいと思います。


## View Transition APIとは？
View Transition APIは、Webページ間のスムーズな遷移を簡単に実装するための新しいAPIです。シングルページアプリケーション（SPA）におけるDOMの状態変更や、マルチページアプリケーション（MPA）におけるページ間のナビゲーションをアニメーション付きで実現できます。

SPAではJavaScriptとCSS（フレームワーク等も含む）を駆使して実現可能、MAPでのページ間遷移のアニメーションは実質的に不可能な状態でしたが、View Transition APIを使えばSPAとMPAの両方で簡単にスムーズな画面遷移を実装できるようになるようです。

詳細やインターフェースは以下をご覧ください。
<Bookmark href="https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API" />

以下のazukiazusaさんやICS MEDIAさんの記事はとてもわかりやすくまとまっていました。
<Bookmark href="https://azukiazusa.dev/blog/declarative-page-transition-animation-with-react-viewtransition-component/" />

<Bookmark href="https://ics.media/entry/230510/" />

## MPAでのページ間遷移にアニメーションを付与する
Next.jsでのView Transition APIを利用したページ間遷移のアニメーション付与は以下の手順で簡単に実現することができます。
1. Next.jsを利用しているので、versionを15.2以上にあげる
2. next.config.tsを修正
    ```
    const nextConfig: NextConfig = {
        experimental: {
            viewTransition: true,
        },
    };
    export default nextConfig;
    ```
3. 遷移前のページにてViewTransitionを指定する(app/gourmet/page.tsx)
    ```
    import { unstable_ViewTransition as ViewTransition } from "react";
    import NextImage from "next/image";
    import NextLink from "next/link";
    
    ...

    <NextLink
      className="group block rounded-xl focus:outline-hidden"
      href={`/gourmet/${post.slug}`}
    >
      <ViewTransition name={`gourmet-post-image-${post.slug}`}>
        <NextImage
          loading="eager"
          decoding="sync"
          className="w-full object-cover rounded-xl"
          src={`${BLOG_CONTENTS_URL}/${post.thumbnail}`}
          width={300}
          height={200}
          alt="Blog Image"
        />
      </ViewTransition>
      <ViewTransition name={`gourmet-post-title-${post.slug}`}>
        <h3 className="mt-2 text-lg font-medium text-gray-800 group-hover:text-blue-600 group-focus:text-blue-600 dark:text-neutral-300 dark:group-hover:text-white dark:group-focus:text-white">
          {post.title}
        </h3>
      </ViewTransition>
      <Datetime
        className="text-gray-600  dark:text-neutral-400"
        datetime={post.visitedAt}
        format="yyyy/MM/dd"
      />
    </NextLink>
    ```
4. 遷移後のページにてViewTransitionを指定する(app/gourmet/[slug]/page.tsx)
    ```
    import { unstable_ViewTransition as ViewTransition } from "react";
    import NextImage from "next/image";
    
    ...

    <ViewTransition name={`gourmet-post-title-${post.slug}`}>
    <header className="flex flex-col-reverse gap-1 mb-4">
        <h1 className="font-bold text-4xl">{post.title}</h1>
    </header>
    </ViewTransition>
    <div className="post prose dark:prose-invert">
    <ViewTransition name={`gourmet-post-image-${post.slug}`}>
        <NextImage
        loading="eager"
        decoding="sync"
        className="w-full object-cover rounded-xl"
        src={`${BLOG_CONTENTS_URL}/${post.thumbnail}`}
        width={300}
        height={200}
        alt="Blog Image"
        />
    </ViewTransition>
    <MDXComponent code={code} />
    </div>
    ```

※ `<ViewTransition>` コンポーネントは2025 年 3 月現在では実験的な機能です。将来にわたって API が変更される可能性があります。本番利用でご注意ください。

Next.jsのドキュメント内でのviewTransitionの解説は以下です。Live Demoが存在しているのでこちらも参考になるかと思います。
<Bookmark href="https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition" />

自分の環境ではなぜか初期描画時にアニメーションが成功しないバグを確認していますが、実験的な機能であることもあり原因は不明のままです🥲

## SPAでの再描画にアニメーションを付与する
`startTransition`を利用してstateを更新するとView Transition APIを利用したアニメーションを適用することができます。

以下はタグフィルターによって投稿をフィルタリングする際にアニメーションを適用した例です。stateを更新する際に`startTransition`を適用するだけです。

FilteredPosts.tsx
```
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, startTransition } from "react";
import GourmetPostCard from "./GourmetPostCard";
import { GourmetPost } from "@/libs/gourmet";

interface FilteredPostsProps {
  initialPosts: GourmetPost[];
}

export default function FilteredPosts({ initialPosts }: FilteredPostsProps) {
  const searchParams = useSearchParams();
  const [filteredPosts, setFilteredPosts] =
    useState<GourmetPost[]>(initialPosts);

  useEffect(() => {
    const locationFilters =
      searchParams.get("locations")?.split(",").filter(Boolean) || [];
    const gourmetFilters =
      searchParams.get("gourmet")?.split(",").filter(Boolean) || [];

    if (locationFilters.length === 0 && gourmetFilters.length === 0) {
      // setFilteredPosts(initialPosts);
      startTransition(() => {
        setFilteredPosts(initialPosts);
      });
      return;
    }

    startTransition(() => {
      setFilteredPosts(
        initialPosts.filter((post) => {
          const matchesLocation =
            locationFilters.length === 0 ||
            (post.locationTags &&
              locationFilters.some((tag) => post.locationTags?.includes(tag)));

          const matchesGourmet =
            gourmetFilters.length === 0 ||
            (post.gourmetTags &&
              gourmetFilters.some((tag) => post.gourmetTags?.includes(tag)));

          return matchesLocation && matchesGourmet;
        })
      );
    });
  }, [searchParams, initialPosts]);

  if (filteredPosts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600 dark:text-gray-400">
          該当する投稿がありません
        </p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {filteredPosts.map((post) => (
        <GourmetPostCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
```


## まとめ
ReactのView Transition APIを利用して簡単にスムーズな遷移アニメーションが簡単に実装できました。
View Transition APIを知らないままMPAの遷移を見たらSPAと勘違いする人が多そう。
