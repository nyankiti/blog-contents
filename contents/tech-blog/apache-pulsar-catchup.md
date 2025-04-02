---
id: 14ecef7c-d8db-80aa-a47c-db61e6e1f9cd
title: Apache Pulsarをローカルで立ち上げ、Spring for Apache Pulsarを動作確認するメモ
date: 2024-11-30T01:31:00.000Z
slug: apache-pulsar-catchup
tags:
  - tech
  - java
  - pulsar
excerpt: undefined
updatedAt: 2024-11-30T09:52:00.000Z
isPublished: true
isDeleted: false
publishedAt: 2024-11-30T00:00:00.000Z
views: '49'
---

# Apache Pulsarとは  
  
  
リアルタイムのデータストリーミングとメッセージングを扱うためのオープンソースの分散メッセージングシステム。Apache Kafkaに比べ、柔軟性や拡張性が求められるユースケースに適しています。マルチテナントの運用やスケーラブルなストレージ管理が必要な場合に特に有利。  
  
  
トピック名が階層化されておりマルチテナントしやすい（プロパティ/ネームスペース/デスティネーション でトピック名が階層化されている）  
  
  
また、ジオレプリケーション機能が備わっている。  
  
  
springプロジェクトでは、2022年からapache pulsarのサポートを開始している[https://spring.io/blog/2022/08/16/introducing-experimental-spring-support-for-apache-pulsar](https://spring.io/blog/2022/08/16/introducing-experimental-spring-support-for-apache-pulsar)  
  
  
参考  
  
- 公式doc  
    
    <Bookmark href="https://pulsar.apache.org/docs/4.0.x/" />
  
- Apache Pulsarのマネージメントサービスである[Astra Streaming](https://www.datastax.com/lp/astra-registration)を提供するDataStax者の方による記事。メッセージング及びストリーミングテクノロジーの概観から始まり、Apache Kafkaとの違いを取り上げながらApache Pulsarについてわかりやすく解説されている。  
  
    <Bookmark href="https://qiita.com/yoshiyuki_kono/items/839ca884eb52f6d0950e" />
  
- Yahoo!デベロッパーネットワークが公開している以下のスライド群  
[https://www.docswell.com/tag/Apache Pulsar](https://www.docswell.com/tag/Apache%20Pulsar)  
- baeldungの解説  
[https://www.baeldung.com/apache-pulsar  
](https://www.baeldung.com/apache-pulsar)[https://www.baeldung.com/spring-boot-apache-pulsar](https://www.baeldung.com/spring-boot-apache-pulsar)  
  
# Apache Pulsarをローカルで立ち上げ、**Spring for Apache Pulsarを動作確認する**  
  
  
### pulsarをsingle nodeで立ち上げる  
  
  
公式のApache Pulsar distributionをダウンロードして解凍  
  
  
```shell  
wget https://archive.apache.org/dist/pulsar/pulsar-4.0.0/apache-pulsar-4.0.0-bin.tar.gz  
tar xvfz apache-pulsar-4.0.0-bin.tar.gz  
```  
  
  
解凍された プロジェクトに移動し、standalone pulsarをstartする  
  
  
```shell  
cd apache-pulsar-4.0.0  
bin/pulsar standalone  
```  
  
  
参考: [https://pulsar.apache.org/docs/4.0.x/getting-started-standalone/](https://pulsar.apache.org/docs/4.0.x/getting-started-standalone/)  
  
  
### トピックを作成する  
  
  
```shell  
bin/pulsar-admin topics create persistent://public/default/my-topic  
```  
  
  
※ pulsarは自動的に存在しないトピックを作成する機能があるが、あえて明示的に前もってトピックを作成している  
  
  
### spring の pulsar clientでメッセージのproduce/consumeする  
  
  
[spring initializr](https://start.spring.io/) より、Dependenciesに**Spring for Apache Pulsar** を選択してプロジェクトを作成する  
  
  
```java  
@SpringBootApplication  
public class PulsarBootHelloWorld {  
  
    public static void main(String[] args) {  
        SpringApplication.run(PulsarBootHelloWorld.class, args);  
    }  
  
    @Bean  
    ApplicationRunner runner(PulsarTemplate<String> pulsarTemplate) {  
        return (args) -> pulsarTemplate.send("my-topic", "Hello Pulsar World!");  
    }  
  
    @PulsarListener(subscriptionName = "hello-pulsar-sub", topics = "my-topic")  
    void listen(String message) {  
        System.out.println("Message Received: " + message);  
    }  
}  
```  
  
  
※ pulsarはデフォルトのlocalhost:6650で実行されている想定のため、追加の設定はしていない  
  
  
以下コマンドでメッセージを手動でproduceすることで動作確認できる  
  
  
```shell  
bin/pulsar-client produce my-topic --messages 'Hello Pulsar World from CLI'  
```  
  
