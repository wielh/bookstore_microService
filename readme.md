# Bookstore API 介紹

## 1. 這是一個怎麼樣的程式

  使用 typescript 與 node.js 做的範例 API, 有以下的功能 :

 * 支援 google 登入
 * 可以寄信給使用者
 * 使用 JWT 保存登入訊息
 * 使用微服務將不同功能分離, 彼此之間用 grpc 通信
 * 可以用 docker 部屬
 * 使用 elastic 紀錄 90 日以內的 log

## 2. 使用到的相關技術
  typescript, node.js, express, grpc, mongodb, mongoose, docker, rabbitMQ, elastic 與 kibana
  
## 3. 部署注意事項
 * 主要的微服務可以在本地執行，也可以用 docker 執行
 * 如果用 docker-compose.yaml 進行部署的話，記得要去 services => {micro-service} => extra_hosts 將 "host.docker.abc:..." 改成本機電腦的 ip
 * mongodb 是在 windows 上的本地執行, 範例數據可從 mongo-script.js 匯入，而
 mongodb replica set 設定在 primary.cfg, secondary.cfg 與 arbiter.cfg， 詳細設定
方法在 [ReplicaSet 設定](https://aspnetmars.blogspot.com/2019/04/windows-mongodb-replica-set-sharding.html).
 * 要啟用 googleLogin 功能，記得要去更改 googleVerifyID 與 googleVerifyPassword，
 關於申請 googleVerifyID 方法，參見 [GoogleAPI申請](https://blog.hungwin.com.tw/aspnet-google-login/)
 * 要使用 grpc 在微服務之間通信，需要安裝  protobuf-compiler, protoc-gen-ts，安裝完成後使用以下指令編譯 proto 檔案

 ```
  protoc -I="." --ts_out="."  .\proto\*.proto
```

 * elastic 是紀錄與搜尋 log 的引擎程式，而 kibana 是 elastic 的可視化程式。搜尋 log 的功能主要是在左上角 "discover" 欄位。
   詳細請參見[kibana教學](https://medium.com/%E7%A8%8B%E5%BC%8F%E4%B9%BE%E8%B2%A8/elk-%E6%95%99%E5%AD%B8%E8%88%87%E4%BB%8B%E7%B4%B9-c54af6f06e61)

## 4.待改進的地方

+ 將config改成yaml檔案

+ mongodb 在 docker 模式下，localhost的IP會變動

+ 密碼 hash 的方式

+ 部分敏感 config 應該放在環境變數

+ 每個 micro-service 應該有異常處理 

+ 將驗證資料改成更簡潔的方式


