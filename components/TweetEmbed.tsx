"use client";

import * as React from "react";

// layout.tsx等で https://platform.twitter.com/widgets.js を読み込む必要がある
declare const twttr: {
  widgets: {
    load: (element?: Element) => Promise<void>;
  };
};

type EmbeddedTweetProps = {
  url: string;
  id?: number;
  cards?: "hidden";
  conversation?: "none";
  theme?: "light" | "dark";
  width?: number;
  align?: "left" | "right" | "center";
  /** @see https://developer.twitter.com/en/docs/twitter-for-websites/supported-languages */
  lang?: string;
  dnt?: true;
};

const TweetEmbed: React.FC<EmbeddedTweetProps> = (props) => {
  // x.comは適切にembedされないため、twitter.comに変換する必要がある
  const xlink = props.url.replace("x.com", "twitter.com");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const key = JSON.stringify(props);

  React.useEffect(() => {
    if (rootRef.current !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      typeof twttr !== "undefined" && twttr.widgets.load(rootRef.current);
    }
  }, [key]);

  return (
    <div ref={rootRef} key={key}>
      <blockquote
        className="twitter-tweet"
        data-id={props.id}
        data-cards={props.cards}
        data-conversation={props.conversation}
        data-theme={props.theme}
        data-width={props.width}
        data-align={props.align}
        data-lang={props.lang}
        data-dnt={props.dnt}
      >
        <a href={xlink} target="_blank" rel="noreferrer noopener">
          {xlink}
        </a>
      </blockquote>
    </div>
  );
};

export default TweetEmbed;
