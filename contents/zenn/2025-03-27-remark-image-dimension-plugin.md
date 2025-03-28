---
title: markdown内の画像もnext/imageの最適化の恩恵にあずかりたい！
slug: 2025-03-27-remark-image-dimension-plugin
tags:
  - tech
  - next
  - markdown
  - react
  - remark
isPublished: false
isDeleted: false
publishedAt: 2025-03-27T22:37:18+09:00
updatedAt: 2025-03-27T23:42:30+09:00
views: 0
---

Next.jsでMarkdownをレンダリングする際、よく利用されている[react-markdwon](https://github.com/remarkjs/react-markdown)を適用するだけでは通常の img エレメントとなり、Next.jsが提供する[Imageコンポーネント](https://nextjs.org/docs/pages/api-reference/components/image)を利用できません。

Next.jsが提供する[Imageコンポーネント](https://nextjs.org/docs/pages/api-reference/components/image)(next/image)は以下のような恩恵があります。

next/imageを利用するメリットとしては以下の記事で詳しく解説されています。
<Bookmark href="https://zenn.dev/reiwatravel/articles/fb1586ea9463a1" />

自分はざっくりと以下のようなメリットがあると認識しています。
- pngやjpgからもっと効率の良いwebp等の形式に変換される（でかい）
- 遅延読み込みで初期表示を高速化してくれる
- いい感じにキャッシュしてくれる

Markdown中の画像にnext/imageを利用しようとすると、最適な width, height を指定することが難しいという課題があります。
このような課題を「markdown内の画像もnext/imageの最適化の恩恵にあずかりたい！」と題してremark pluginを自作することで解決したので紹介したいと思います。

## 処理の流れ
- remark pluginのtransformerを利用して画像の場合の処理を挟む
- 画像のurlを取得して、urlから画像のwidthとhieghtを読み込む
- widthとhieghtをカスタムプロパティに埋め込む
- react側でwidthとheightのカスタムプロパティをnext/imageのwidthとheihgtに指定する

## 実装
### urlから画像のwidthとheightを取得するメソッド
[image-size](https://www.npmjs.com/package/image-size)を利用します。
```ts:image.ts
import { Buffer } from "buffer";
import sizeOf from "image-size";

export interface ImageDimensions {
  width: number;
  height: number;
  type?: string;
}

export const getImageDimensions = async (
  imgUrl: string,
  options: {
    maxSize?: number;
    timeout?: number;
  } = {}
): Promise<ImageDimensions> => {
  const {
    maxSize = 10 * 1024 * 1024,
    timeout = 10000,
  } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(imgUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "image/*",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > maxSize)
      throw new Error(`Image too large. Maximum size is ${maxSize} bytes.`);

    const dimensions = sizeOf(buffer);

    if (!dimensions.width || !dimensions.height)
      throw new Error("Could not determine image dimensions");

    return {
      width: dimensions.width,
      height: dimensions.height,
      type: dimensions.type,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  }
};
```


### 画像のwidthとheightをカスタムプロパティに埋め込むremark pluginを作成する
```ts:remark-image-dimensions-plugin.ts
import { Node } from "unist";
import { Image } from "mdast";
import { visit } from "unist-util-visit";
import { BLOG_CONTENTS_URL } from "@/constants";
import { getImageDimensions } from "@/libs/image";

export const remarkImageDimesionsPlugin = () => {
  return async function transformer(tree: Node) {
    const promises: Promise<void>[] = [];
    visit(tree, "image", (node: Image) => {
      const promise = (async () => {
        try {
          const dimensions = await getImageDimensions(node.url);
          node.data = {
            ...node.data,
            hProperties: {
              originalwidth: dimensions.width,
              originalheight: dimensions.height,
            },
          };
        } catch (error) {
          console.error("Error processing image node:", error);
        }
      })();
      promises.push(promise);
    });
    await Promise.all(promises);
  };
};

```

### markdown rendrerに作成したremark pluginを適用し、画像のエレメントをnext/imageに差し替える
適宜react-markdwonやその他のmarkdown rendrerに読み替えてください
```tsx:
import { MarkdownAsync } from "react-markdown";
import { remarkImageDimesionsPlugin } from "./remark-image-dimensions-plugin";
import NextImage from "next/image";

<MarkdownAsync
    remarkPlugins={[remarkImageDimesionsPlugin]}
    components={{
    img: (
        props: React.ImgHTMLAttributes<HTMLImageElement> & {
        originalwidth?: number;
        originalheight?: number;
        }
    ) => {
        return (
        <NextImage
            className="object-cover rounded-xl"
            // blog-contentsリポジトリのgithub-pagesにアップロードされた画像のURL
            src={`${BLOG_CONTENTS_URL}/${props.src}`}
            alt={props.alt || ""}
            // memo: 独自のremarkプラグインで画像のサイズを取得している
            width={props.originalwidth || 900}
            height={props.originalheight || 600}
        />
        );
    },
    }}
>
    {post.content}
</MarkdownAsync>
```

※ react-markdwonのMarkdownAsyncは[9.1.0](https://github.com/remarkjs/react-markdown/releases/tag/9.1.0)よりサポートされています。先月リリースされた機能です。


## 最後に
自分の観測した範囲ではmarkdwonで管理してそうなブログはだいたいnext/image利用なしな気したのでremark plugin自作で頑張りましたが、もっと簡単に markdwonでnext/image利用できるのでは？ってなってます。

react-markdwonのMarkdownAsyncを利用すると自作pluginでできる表現の幅が広がって良いなと。

mdxを使うとこの辺り最初から解決できている気がしますが、記事の内容はfrontendコードと密結合にしたくない派はのでこのような方針になってしまいました。

そもそもremarkとは？unifiedとは？ってなっている方は@janus_welさんの以下連載がとても参考になると思います。

- [unified を使う前準備](https://zenn.dev/januswel/articles/e4f979b875298e372070)
- [unified におけるプラグインまとめ](https://zenn.dev/januswel/articles/44801708e8c7fdd358e6)
- [unified を使って Markdown を拡張する](https://zenn.dev/januswel/articles/745787422d425b01e0c1)
- [unified を使ってオレオレ Markdown を ReactElement に変換する](https://zenn.dev/januswel/articles/c0e663c88b562bfde8ff)