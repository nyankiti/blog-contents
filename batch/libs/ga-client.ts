import { BetaAnalyticsDataClient } from "@google-analytics/data";

// ローカル実行;
import dotenv from "dotenv";
dotenv.config();
export class GaApiClient {
  private propertyId: string | undefined;

  private analyticsDataClient: BetaAnalyticsDataClient;

  constructor() {
    this.propertyId = process.env.GA_PROPERTY_ID;
    this.analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        type: "service_account",
        project_id: process.env.GCP_SA_PROJECT_ID,
        private_key_id: process.env.GCP_SA_PRIVATE_KEY_ID,
        private_key: process.env.GCP_SA_PRIVATE_KEY!!.replace(/\\n/g, "\n"), // 環境変数がエスケープされてしまうため、元に戻す
        client_email: process.env.GCP_SA_CLIENT_EMAIL,
        client_id: process.env.GCP_SA_CLIENT_ID,
        universe_domain: "googleapis.com",
      },
    });
  }

  async getPv(targetBasePath: string): Promise<{ [slug: string]: string }> {
    const [response] = await this.analyticsDataClient.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [
        {
          startDate: "2024-08-25", // ブログ公開日
          endDate: "today",
        },
      ],
      dimensions: [{ name: "pagePath" }],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "FULL_REGEXP",
            value: `/${targetBasePath}/([^/]+)` /* ブログページにのみに絞る */,
          },
        },
      },
      metrics: [{ name: "screenPageViews" }],
    });

    const result: { [slug: string]: string } = {};
    response.rows?.forEach((row) => {
      if (row && row.dimensionValues && row.metricValues) {
        const path = row.dimensionValues[0].value;
        const segments =
          path?.split("/").filter((segment) => segment !== "") ?? []; // パスをスラッシュで分割
        const slug = segments.at(-1);
        if (slug) {
          const views = row.metricValues[0].value!;
          result[slug] = views;
        }
      }
    });
    return result;
  }

  async getPopularPostData() {
    const [response] = await this.analyticsDataClient.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [
        {
          startDate: "30daysAgo", // 過去30日の人気記事を取得
          endDate: "today",
        },
      ],
      dimensions: [
        {
          name: "pagePath",
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "FULL_REGEXP",
            value: "/ja/blog/([^/]+)" /* ブログページにのみに絞る */,
          },
        },
      },
      metrics: [
        {
          name: "screenPageViews",
        },
      ],
      orderBys: [
        {
          desc: true,
          metric: {
            metricName: "screenPageViews",
          },
        },
      ],
      limit: 10, // 10記事までのパスを取得
    });
    console.log("popular Report result:");
    response.rows?.forEach((row) => {
      console.log(
        row.dimensionValues && row.dimensionValues[0],
        row.metricValues && row.metricValues[0]
      );
    });
  }
}
