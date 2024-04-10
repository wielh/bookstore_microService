# Bookstore API 介紹

## 1. 這是一個怎麼樣的程式

  使用 typescript 與 node.js 做的範例 API, 有以下的功能 :

 * 支援 google 登入
 * 可以寄信給使用者
 * 使用 JWT 保存登入訊息
 * 使用微服務將不同功能分離, 彼此之間用 grpc 通信
 * 可以用 docker 部屬

## 2. 使用到的相關技術
  typescript, node.js, express, grpc, mongodb, mongoose, docker 與 rabbitMQ
  
## 3. 部署注意事項
 * 主要的微服務可以在本地執行，也可以用 docker 執行
 * mongodb 是在 windows 上的本地執行, 範例數據可從 mongo-script.js 匯入，而
 mongodb replica set 設定在 primary.cfg, secondary.cfg 與 arbiter.cfg， 詳細設定
方法在 [ReplicaSet 設定](https://aspnetmars.blogspot.com/2019/04/windows-mongodb-replica-set-sharding.html).
 * 要啟用 googleLogin 功能，記得要去更改 googleVerifyID 與 googleVerifyPassword，
 關於申請 googleVerifyID 方法，參見 [GoogleAPI申請](https://blog.hungwin.com.tw/aspnet-google-login/)
 * 要使用 grpc 在微服務之間通信，需要安裝  protobuf-compiler, protoc-gen-ts，安裝完成後使用以下指令編譯 proto 檔案

```
  protoc -I="." --ts_out="."  .\proto\account.proto
```

