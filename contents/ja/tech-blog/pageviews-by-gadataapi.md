---
id: d73971f3-457d-4873-bc21-5b54d7586c40
title: Google Analytics Data APIを利用してPV数と人気記事を取得する
date: 2024-08-11T09:08:00.000Z
slug: pageviews-by-gadataapi
tags:
  - tech
  - GCP
excerpt: undefined
updatedAt: 2024-09-15T04:02:00.000Z
isPublished: true
isDeleted: false
publishedAt: 2024-09-11T15:00:00.000Z
views: 117
viewsBeforeI18n: '81'
---

## はじめに  
  
  
個人ブログの記事にPV数をつける際の最にGoogle Analytics Data APIを利用したため、その方法を備忘録的にまとめました。  
  
  
Google Analyticsがすでにサイトに導入されていて、ある程度のデータがGoogleAnalytics上にあることが前提の記事になりますのでご注意ください。  
  
  
## 事前準備: APIの有効化  
  
  
Google Analytics Reporting API を有効化しておく必要があります。  
  
  
GCPのコンソールからプロジェクトを選択し、以下APIを有効化してください。  
  
  
[https://console.cloud.google.com/apis/api/analyticsdata.googleapis.com/metrics](https://console.cloud.google.com/apis/api/analyticsdata.googleapis.com/metrics)   
  
  
参考までに公式のquick startのリンクも貼っておきます  
[https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries?hl=ja](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries?hl=ja)  
  
  
## Google Analytics Data APIを叩く  
  
  
`pagePath`のdimensionsで、`screenPageViews`のmetricsを指定すると、ページごとのview数を取得できる。  
  
  
slugに対するPV数をもつ辞書型を返すように実装しています。  
  
  
```typescript  
import { BetaAnalyticsDataClient } from '@google-analytics/data'  
  
export class GaApiClient {  
  private propertyId: string | undefined  
  
  private analyticsDataClient: BetaAnalyticsDataClient  
  
  constructor() {  
    this.propertyId = process.env.GA_PROPERTY_ID  
    this.analyticsDataClient = new BetaAnalyticsDataClient({  
      credentials: {  
        type: 'service_account',  
        project_id: process.env.GCP_SA_PROJECT_ID,  
        private_key_id: process.env.GCP_SA_PRIVATE_KEY_ID,  
        private_key: process.env.GCP_SA_PRIVATE_KEY!!.replace(/\\n/g, '\n'), // 環境変数がエスケープされてしまうため、元に戻す  
        client_email: process.env.GCP_SA_CLIENT_EMAIL,  
        client_id: process.env.GCP_SA_CLIENT_ID,  
        universe_domain: 'googleapis.com'  
      }  
    })  
  }  
  
  async getPv(): Promise<{ [slug: string]: string }> {  
    const [response] = await this.analyticsDataClient.runReport({  
      property: `properties/${this.propertyId}`,  
      dateRanges: [  
        {  
          startDate: '2024-08-25', // ブログ公開日など  
          endDate: 'today'  
        }  
      ],  
      dimensions: [{ name: 'pagePath' }],  
      dimensionFilter: {  
        filter: {  
          fieldName: 'pagePath',  
          stringFilter: {  
            matchType: 'FULL_REGEXP',  
            value: '/blog/([^/]+)' /* ブログページにのみに絞る */  
          }  
        }  
      },  
      metrics: [{ name: 'screenPageViews' }]  
    })  
  
    const result: { [slug: string]: string } = {}  
    response.rows?.forEach(row => {  
      if (row && row.dimensionValues && row.metricValues) {  
        const path = row.dimensionValues[0].value  
        const segments =  
          path?.split('/').filter(segment => segment !== '') ?? [] // パスをスラッシュで分割  
  
        // "/blog/{slug}" のパスを適切に分割できているかチェック  
        if (segments.length === 2 && segments[0] === 'blog') {  
          const slug = segments[1]  
          const views = row.metricValues[0].value!  
          result[slug] = views  
        }  
      }  
    })  
    return result  
  }  
  
  async getPopularPostData() {  
    const [response] = await this.analyticsDataClient.runReport({  
      property: `properties/${this.propertyId}`,  
      dateRanges: [  
        {  
          startDate: '30daysAgo', // 過去30日の人気記事を取得  
          endDate: 'today'  
        }  
      ],  
      dimensions: [  
        {  
          name: 'pagePath'  
        }  
      ],  
      dimensionFilter: {  
        filter: {  
          fieldName: 'pagePath',  
          stringFilter: {  
            matchType: 'FULL_REGEXP',  
            value: '/blog/([^/]+)' /* ブログページにのみに絞る */  
          }  
        }  
      },  
      metrics: [  
        {  
          name: 'screenPageViews'  
        }  
      ],  
      orderBys: [  
        {  
          desc: true,  
          metric: {  
            metricName: 'screenPageViews'  
          }  
        }  
      ],  
      limit: 10 // 10記事までのパスを取得  
    })  
    console.log('popular Report result:')  
    response.rows?.forEach(row => {  
      console.log(  
        row.dimensionValues && row.dimensionValues[0],  
        row.metricValues && row.metricValues[0]  
      )  
    })  
  }  
}  
```  
  
  
その他、dimensions, metrics のパラメータを調整するとそれぞれのユースケースに合わせたデータが取得できるようになると思います。パラメータを調整する際に参考になりそうなドキュメント群を置いておきます  
  
- 公式Doc: [https://developers.google.com/analytics/devguides/reporting/data/v1?hl=ja](https://developers.google.com/analytics/devguides/reporting/data/v1?hl=ja)  
- node の clinet ライブラリのドキュメント: [https://googleapis.dev/nodejs/analytics-data/latest/index.html](https://googleapis.dev/nodejs/analytics-data/latest/index.html)  
- クエリで使用する、dimensions, metricsで利用できる値: [https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema?hl=ja#dimensions](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema?hl=ja#dimensions)  
  
## おわりに  
  
  
※ Google Analytics Data APIは、料金はかからないようですが、以下ページにあるQuotasを上回るとリクエストに失敗するという制限があるようです。ご注意ください。  
[https://developers.google.com/analytics/devguides/reporting/data/v1/quotas?hl=ja](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas?hl=ja)  
  
  
以下、公式doc以外で実装の際に参考にさせていただいた記事です🙏  
  
- [**Node.js (TypeScript) で Google Analytics Reporting API v4 を使用する方法**](https://fwywd.com/tech/ga-popular-node-ts)  
- [**Google Analytics Reporting APIでの発生したリクエスト数を確認する**](https://ponsuke-tarou.hatenablog.com/entry/2021/03/25/150451)  
- [**Gatsbyで作ったサイトに人気記事のランキングを実装する【前編】**](https://komari.co.jp/column/14935/)  
  
<Bookmark href="https://fwywd.com/tech/ga-popular-node-ts" />
  
  
<Bookmark href="https://ponsuke-tarou.hatenablog.com/entry/2021/03/25/150451" />
  
  
<Bookmark href="https://komari.co.jp/column/14935/" />
  
