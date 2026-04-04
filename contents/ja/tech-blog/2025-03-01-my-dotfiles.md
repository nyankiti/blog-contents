---
title: 'dotfilesの育成 in 2025【mise, sheldon, raycastなど】'
slug: 2025-03-01-my-dotfiles
tags:
  - tech
  - dotfiles
  - mise
  - sheldon
  - raycast
  - fzf
  - shell
isPublished: true
isDeleted: false
publishedAt: 2025-03-01T02:31:36.000Z
updatedAt: 2025-03-01T14:49:21.000Z
views: 356
viewsBeforeI18n: '39'
---

## はじめに
PCをリプレイス機会があったのでdotfilesを整理しました。

ある程度調査をして、自分が使いこなせる範囲の最低限整えるためのdotfilesといった感じです。  
「rust製のツールで揃えてとにかく早い環境を作る」みたいないなこだわりも特にありません。

リポジトリは以下になります。  
https://github.com/nyankiti/dotfiles

## 2023時点からの変化
### mise
あらゆる言語を管理できるツールを利用たことがなかったのでこれを機に入門しました。
グローバルに用いる実行環境については全て[mise](https://github.com/jdx/mise)へ集約できるようにしました。

それぞれの言語で個別でPATHを通していたものが以下で集約され、.zshrcがとてもすっきりしました。
```
eval "$(mise activate zsh)"
export PATH="$HOME/.local/share/mise/shims:$PATH"
```

### zinit => Sheldon
Sheldon が早い & toml ファイルで設定を管理できると噂を聞いていたのでこれを機に入門しました。

[zinitが不安なのでsheldonへ移行したらzshの起動が50msと更に速くなった](https://ktrysmt.github.io/blog/migrate-zinit-to-sheldon/) 等を見ると遅延読み込みの設定を書いていました。興味のある人はこちらも試すと良いと思います。

自分は上記の遅延読み込みを入れると kube-ps1 の$PROMPTのカスタマイズが初回から読み込めないという問題があったので利用しませんでした。

```
shell = "zsh"

# pure テーマ
[plugins.pure]
github = "sindresorhus/pure"
use = ["async.zsh", "pure.zsh"]

# 構文ハイライト
[plugins.zsh-syntax-highlighting]
github = "zsh-users/zsh-syntax-highlighting"

# 補完
[plugins.zsh-completions]
github = "zsh-users/zsh-completions"

# オートサジェスト
[plugins.zsh-autosuggestions]
github = "zsh-users/zsh-autosuggestions"
```
[pure](https://github.com/sindresorhus/pure)は最初に入れたzsh themeで思い入れがあるのかずっと利用しています。

### alfred, clipy => raycast
raycastは1年以上使っていましたが、dotfilesに落とし込めていなかったので追加しました。
raycastの設定のエクスポート/インポートができるようで、詳細は以下を参照ください。通常の設定に加えてスニペットなどの情報も引き継げるようです。
<Bookmark href="https://www.raycast.com/changelog/1-22-0" />

個人的にはraycastはalfredの完全上位互換と捉えており、とても重宝しています。

### peco => fzf
pecoで特に不満はなかったのですが、色々とfzfの方が優れている気はしていたので乗り換えました。
といっても現状以下のコマンド履歴検索を利用している程度です。もっと色々カスタマイズできるはずなので、これから色々試していきたいです。 
```
function history_search_with_fzf() {
    local selected_command
    selected_command=$(history -n 1 | tac | awk '!a[$0]++' | fzf --height 40% --layout=reverse --border --inline-info)
    if [ -n "$selected_command" ]; then
        BUFFER=$selected_command
        CURSOR=$#BUFFER
        zle reset-prompt
    fi
}
zle -N history_search_with_fzf
bindkey '^R' history_search_with_fzf
```

利用例↓
![alt text](<images/2025-03-01-my-dotfiles/スクリーンショット 2025-03-01 22.09.22.png>)

### .gitconfig
.gitconfigによる以下の設定をdotfilesに追加。`git pull`した時の merge strategyの指定がないぞと言われるあのワーニングへの対策です
```
[include]
  path = ~/dotfiles/git/user.conf
[color]
	ui = true
[core]
	autocrlf = false
	ignorecase = false
	quotepath = false
	safecrlf = true
[init]
	defaultBranch = main
[pull]
	rebase = false
[push]
	default = current
    autoSetupRemote = true
[merge]
  ff = false
```

## GitHub Actionsで再現性の担保
`macos-latest`環境にて`setup.sh`と`source .zshrc`が正常終了することをGitHub Actionsで担保しました。
```
jobs:
  check:
    runs-on: macos-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup.sh
        run: bash setup.sh
        shell: zsh {0}
        env:
          SHELL: /usr/bin/zsh
      - name: Source .zshrc
        run: source zsh/.zshrc
        shell: zsh {0}
        env:
          SHELL: /usr/bin/zsh
```

## 最後に
mise, sheldon, fzfは初めて触ることもあり、結局1日くらい格闘していました。  
Cursor, Warp等の生成AI周りのツールの環境整備もdotfilesに落とし込みたかったのですが、今回は定番どころを押さえていくだけで時間がすごいかかったのでまた別の機会にしたいと思います。

今回メインで参考にさせていただいた記事です🙏
- [2024年度 わたしのdotfilesを紹介します](https://zenn.dev/smartcamp/articles/f20a72910bde40)
  - https://github.com/ayuukumakuma/dotfiles
- [Macの環境をdotfilesでセットアップしてみた改](https://github.com/tsukuboshi/dotfiles)
- [dotfilesで再構築可能なターミナル環境構築を目指してみた](https://dev.classmethod.jp/articles/dotfiles-reconstruct-termina-env/)

