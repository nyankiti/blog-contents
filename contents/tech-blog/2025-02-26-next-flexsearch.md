---
title: "flexsearchを用いてNext.jsでサイト内検索を実装する"
slug: "2025-02-26-next-flexsearch"
tags: 
    - tech
    - poem
isPublished: false
isDeleted: false
publishedAt: 2025-02-26T19:34:20+09:00
updatedAt: 2025-02-28T23:05:25+09:00
views: 0
---
import { Bookmark } from "../../components/Bookmark";

本ブログはNext.jsでMarkdwonをソースとしたブログなのですが、サイト内検索が欲しくなったので追加しました。

Nextraが提供しているサイト内検索がflexsearchを利用しているとのことなので、nextraの実装を参考にしながら自分のブログにも実装してみます。
https://nextra.site/docs/guide/search

https://github.com/shuding/nextra


ビルドの際にMarkdwonから簡易的にインデックスを作成し、ブラウザで完結するサイト内検索ができれば良いなと思い色々頑張ったので、その記録を残します。

<Bookmark href="https://tenderfeel.xsrv.jp/javascript/5711/" />


# Flexsearchとは
https://github.com/nextapps-de/flexsearch

javascriptで動作する高速の全文検索ライブラリです。Node.jsに加えてブラウザでも動作するので、ビルドの際にインデックスを作成し、ブラウザで完結するサイト内検索が可能になります。

## Flexsearchの特徴
