---
id: 9852dfa0-a0e5-4aaf-8f03-403e995857f7
title: remix と notion apiでブログを構築しようとしたが断念した話
date: 2024-09-01T13:46:00.000Z
slug: remix-notion-blog-give-up
tags: ["tech","remix"]
excerpt: undefined
updatedAt: 2024-09-07T12:37:00.000Z
isPublished: true
isDeleted: false
publishedAt: 2024-08-31
views: 84
---

  
## 構築しようとしたブログの要件  
  
- remixを使いたい  
	- エンジニアあるあるですが、目的と手段が一致するパターンです。remixを利用したいが作るものがなかったので個人ブログを作ることにした感じです。  
- データソースはnotion  
	- 以前contentfulで個人ブログを始めましたが、contentfulを開くことが面倒になってしまい続かなかったという経験があるため、CMSは利用せずにnotion apiを利用したいです。  
- 無料で高パフォーマンス  
  
こちらの3軸でブログ作成を真面目に検討し、作成しましたが断念したのでその記録をまとめます。  
  
  
## 環境  
  
- remix-run: 2.10  
- react: 19rc  
- デプロイ先: cloudflare pages  
  
## やったこと  
  
- remixプロジェクト作成  
- notion api 取得処理  
- 取得した記事一覧、記事詳細ページの追加  
- EDGE環境でのキャッシュ処理実装  
- Google Analytics設定、記事ページのビュー数取得  
  
## やってみた結果思ったこと  
  
  
検討、制作を進めるにつれてこれまでに見えていなかったremixの特徴が発覚し、notion apiとの相性の悪さから断念しました。  
  
- remixはEdge環境で動作することが前提のため、node.js依存のライブラリを利用できない。  
cloudflareを利用している場合、 [Home - Cloudflare Workers®](https://workers.cloudflare.com/) がEdge環境になります  
	- [@google-analytics/data](https://www.npmjs.com/package/@google-analytics/data) を用いてGAのデータを取得しようとしたが、node.js依存のためapi をコールする部分を自分で実装する羽目に…  
	- node.jsのfsが使えないため、mdファイルをfsを用いて read して… といったことができない。そもそもEdge環境にあげられるbuild後のアプリケーションにmdファイルを含めることが難しい。  
- Edge環境で毎度SSRすることを売りにしており、アンチSSGという姿勢のライブラリのため、SSRするごとに notion api にアクセスする必要がある。  
notion api は 3rps以上リクエストするとエラーとなるため、SSR環境で都度取得は絶望的  
[https://developers.notion.com/reference/request-limits](https://developers.notion.com/reference/request-limits)  
	- そこであげられる方法として、あらかじめnotionの内容をrepositoryに自動で保存しておく方法ですが、こちらは node.jsが使えないため、不可能でした。  
	- 唯一残っている方法が、notionの内容を react コンポーネントを含まないmdxとして保存する自動化プログラムを作成し、route/ 配下 に自動でmdxファイルを増やし続ける方法のみでした。mdxのみ、remixがbuild時に梱包することをbuilt-inサポートしており、remixの奨励方法であると言えそうです。  
	[https://remix.run/docs/en/main/guides/mdx](https://remix.run/docs/en/main/guides/mdx)  
	- しかし、mdxで作る方法を採用する場合、ブログ一覧ページを取得する方法が難しいそう。  
	`window.__remixManifest.routes` を見ればクライアントサイドから全てのrouteを見ることができるが、ssr時点で動的に取得する方法は自分の観測範囲内ではなさそう。別途`blogList.server.ts`等、ファイルを作って記事一覧を管理しているブログ多そうだが、これはやりたくない。  
  
## おわりに  
  
  
今回の要件の場合、諦めてNext.jsでの構築に切り替えようと思います。  
notion api を用いて無料でブログを構築する場合、以下の流れが良さそうなので試してみます。  
  
- github action で 定期的にnotion を mdとしてrepositoryに保存  
- Next.jsのSSGで[contentlayer](https://contentlayer.dev/)を用いて記事一覧を操作  
  
あくまで自分がremixの特徴を知らずにとりあえず使ってみたいと先走った結果であり、remixは素晴らしい技術だと思っています。ただ、自分にそれを扱う準備と技術力がなかった…  
  
  
[Progressive Enhancement](https://remix.run/docs/en/main/discussion/progressive-enhancement)等、Next.jsのApp routerに多いに影響を与えており、考え方や哲学は今で本当に素敵だなと感じています。  
  
