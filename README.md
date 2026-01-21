# comment-viewer-do

Cloudflare Workers上で動作するニコ生コメントビューアです。

Durable Objectインスタンス上でニコ生のメッセージサーバ（NDGR）からProtobufデータを取得・パースし、WebSocketクライアントにコメントデータを配信します。

## TODO
- [ ] Web UIを実装する
- [ ] D1 or DO's SQL Storageにコメントデータをアーカイブする

## サービス

### Gateway
- ゲートウェイとして動作するWorker
- Honoでルーティング
- エンドポイント
  - `GET /ws`: WebSocketエンドポイント
    - Query Params
      - `liveId`: lv123形式のライブIDを指定

### LiveDO
- DOID: LiveID
- 起点となるDurableObject
- ニコ生の配信ごとのWebSocketサーバに接続
- keepSeat/pingで接続を維持
- messageServerで取得したURLをMessageDOに渡す

### MessageDO
- DOID: LiveID
- ChunkedEntryを扱うDurableObject
- segment/backward/previousで取得したURLをSegmentDOに渡す
- nextで取得したatをインメモリで保持
  - ChunkedEntryのストリーム処理が終了したらAlarm APIでループ
  - Alarmハンドラでは取得したnextAtを指定してViewURIに再度接続
- 各URLの重複処理を排除するため、処理済みURLをインメモリで管理

### SegmentDO
- DOID: LiveID
- ChunkedMessage/PackedSegmentを扱うDurableObject
- パースしたコメントデータをLiveDOに送信

## LICENSE
[MIT](./LICENSE)

## Author
[shinosaki](https://shinosaki.com)
