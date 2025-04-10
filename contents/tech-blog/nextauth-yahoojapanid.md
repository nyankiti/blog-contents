---
id: 110cef7c-d8db-8072-b929-d4a745ca745b
title: NextAuthでYahoo!JapanIDでログインするためのカスタムプロバイダーを作成する
date: 2024-09-29T11:59:00.000Z
slug: nextauth-yahoojapanid
tags:
  - tech
  - auth
  - OIDC
excerpt: undefined
updatedAt: 2024-09-29T13:30:00.000Z
isPublished: true
isDeleted: false
publishedAt: 2024-09-29T00:00:00.000Z
views: '122'
---
  
## はじめに  
  
  
Next.jsを用いたアプリケーションにログイン機能を実装する際、[NextAuth](https://next-auth.js.org/)を利用することが多いと思います。メールアドレスでログインだったり、Googleでログインする方法については、たくさんの実装例や記事があると思います。参考になりそうな実装例を以下に置いておきます。  
  
- 公式の実装例: [https://github.com/nextauthjs/next-auth-example](https://github.com/nextauthjs/next-auth-example)  
- 記事: [https://zenn.dev/tfutada/articles/5557b780050574](https://zenn.dev/tfutada/articles/5557b780050574)  
  
本記事では Yahoo!JAPAN IDを用いたログインをNextAuthで実装する方法を紹介します。  
  
  
## Yahoo! JAPAN IDでログインを実装するための前準備  
  
  
前提としてYahoo! JAPAN IDでログインを提供するためのID 連携の仕組みなどは以下で説明されているので事前に確認しておくと実装がわかりやすくなると思います。  
  
  
<Bookmark href="https://developer.yahoo.co.jp/yconnect/v2/introduction.html" />
  
  
利用用途に応じてこちらの[ガイドライン](https://developer.yahoo.co.jp/yconnect/v2/guideline.html)も参照しておくとさらに安心かと思います。[デザインガイドライン](https://developer.yahoo.co.jp/yconnect/loginbuttons.html)も用意されています。  
  
  
また、以下のYahoo!デベロッパーネットワークから、先にアプリケーションを作成し、OAuth2.0 および OpenID Connect用のClinet IDを発行しておく必要があります。  
  
  
<Bookmark href="https://developer.yahoo.co.jp/yconnect/v2/" />
  
  
こちらで発行したClinet ID, シークレットは実装で利用するのでメモっておいてください。  
  
  
redirect_uriに指定する値を事前に登録する必要があるので、以下値をコールバックURLに登録しておく必要があります。  
  
  
`https://サイトのドメイン/api/auth/callback/yahoo`  
  
  
注意点として、Yahoo!JAPAN IDをログインに利用し、ユーザーの名前やメールアドレスを取得したい場合は以下で案内されている申し込みフォームから審査が必要となります。Googleの場合は審査なしで表示名やメールアドレスが取得できるようになりますが、Yahoo!JAPANは個人情報の扱いを丁寧に行なっていることが伺えますね。  
  
  
[https://developer.yahoo.co.jp/yconnect/v2/userinfo.html](https://developer.yahoo.co.jp/yconnect/v2/userinfo.html)  
  
  
## 実装  
  
  
基本的には先ほど紹介した[こちらの記事](https://zenn.dev/tfutada/articles/5557b780050574)のGoogleでログインの部分の実装と同じです。  
  
  
Yahoo!JAPAN IDでログインするためのカスタムプロバイダーを作成し、適用する部分だけを切り出してみました。  
  
  
yahoo-japan-id-provider.ts  
  
  
```typescript  
import { OAuthConfig } from "next-auth/providers/oauth";  
  
export const YahooJapanIdProvider: OAuthConfig<any> = {  
  id: "yahoo",  
  name: "yahoo",  
  issuer: "https://auth.login.yahoo.co.jp/yconnect/v2",  
  wellKnown:  
    "https://auth.login.yahoo.co.jp/yconnect/v2/.well-known/openid-configuration",  
  version: "2.0",  
  type: "oauth",  
  authorization: {  
    url: "https://auth.login.yahoo.co.jp/yconnect/v2/authorization",  
    params: { scope: "openid" }, // 属性情報取得の審査が通った場合にスコープを追加する  
  },  
  token: "https://auth.login.yahoo.co.jp/yconnect/v2/token",  
  userinfo: "https://userinfo.yahooapis.jp/yconnect/v2/attribute",  
  idToken: true,  
  clientId: process.env.YAHOO_CLIENT_ID,  
  clientSecret: process.env.YAHOO_CLIENT_SECRET,  
  checks: ["state"],  
  profile: (profile: any) => {  
    /*  
    yahooのid tokenでは以下のようなレスポンスが返る ※ userの情報はスコープが指定できないため入っていない  
    profile {  
        aud: string[];  
        exp: number;  
        iss: 'https://auth.login.yahoo.co.jp/yconnect/v2';  
        iat: number;  
        sub: string;  
        amr: string[];  
        at_hash: string;  
        }  
    ref: https://developer.yahoo.co.jp/yconnect/v2/id_token.html  
  
    ユーザー名、メールアドレス等を取得したい場合（userInfoを叩きたい場合）は審査を経た上でスコープを指定できるようになる。  
    ref: https://developer.yahoo.co.jp/yconnect/v2/userinfo.html  
    */  
    return {  
      id: profile.sub,  
    };  
  },  
};  
```  
  
  
先ほど取得したclinet id, シークレットは以下の部分で利用しており、環境変数に指定しておく必要があります。  
  
  
> process.env.YAHOO_CLIENT_ID,    
> process.env.YAHOO_CLIENT_SECRET,  
  
  
next-auth-options.ts  
  
  
```typescript  
  
import type { NextAuthOptions } from "next-auth";  
import { YahooJapanIdProvider } from "./yahoo-japan-id-provider";  
  
export const nextAuthOptions: NextAuthOptions = {  
  debug: process.env.NODE_ENV !== "production",  
  session: { strategy: "jwt" },  
  providers: [  
    YahooJapanIdProvider,  
  ],  
  callbacks: {  
    jwt: async ({ token, user, account, profile }) => {  
      return token;  
    },  
    session: ({ session, token }) => {  
      return {  
        ...session,  
        user: {  
          ...session.user, // 属性情報取得が可能な場合はこちらにユーザー情報が入るか？？  
          id: token.sub,  
        },  
      };  
    },  
  },  
};  
  
```  
  
  
ログインボタンコンポーネント  
  
  
```typescript  
"use client";  
  
import { signIn } from "next-auth/react";  
  
const LoginButton = () => {  
  const handleLogin = (provider: string) => async (event: React.MouseEvent) => {  
    event.preventDefault();  
    const result = await signIn(provider);  
  };  
  
  return (  
      <form className="w-full mt-6 max-w-xs space-y-6 rounded bg-white p-8 shadow-md">  
        <button  
          onClick={handleLogin("yahoo")}  
          type="button"  
          className="w-full bg-red-500 text-white rounded-lg px-4 py-2"  
        >  
          Yahoo!JapanIDでログイン  
        </button>  
      </form>  
     )  
```  
  
  
app/api/auth/[…nextauth]/route.ts  
  
  
```typescript  
import NextAuth from "next-auth";  
  
import { nextAuthOptions } from "../../next-auth-options";  
  
const handler = NextAuth(nextAuthOptions);  
  
export { handler as GET, handler as POST };  
```  
  
