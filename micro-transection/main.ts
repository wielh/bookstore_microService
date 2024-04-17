import * as grpc from "@grpc/grpc-js";
import {transectionServiceURL,setElasticIndex,infoLogger, errorLogger} from '../common/config.js'
import { UnimplementedTransectionServiceService} from "../proto/transection.js";
import {activityList} from './activity.js'
import {transection,transectionRecord} from './transection.js'

setElasticIndex("micro-transection")
const server = new grpc.Server();
server.addService(UnimplementedTransectionServiceService.definition, {activityList,transection,transectionRecord})
server.bindAsync(transectionServiceURL,grpc.ServerCredentials.createInsecure(), (err: Error | null, port: number) => {
  if (err) {
    errorLogger("micro-transection-service", "server.bindAsync", "error happens on micro-transection start", "", err)
  } else {
      infoLogger("micro-transection-service", "server.bindAsync", `Server run on port: ${port}`, "")
  }
});