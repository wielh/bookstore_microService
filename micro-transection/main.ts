import * as grpc from "@grpc/grpc-js";
import {transectionServiceURL} from '../common/config.js'
import { UnimplementedTransectionServiceService} from "../proto/transection.js";
import {activityList} from './activity.js'
import {transection,transectionRecord} from './transection.js'

const server = new grpc.Server();
server.addService(UnimplementedTransectionServiceService.definition, {activityList,transection,transectionRecord})
server.bindAsync(transectionServiceURL,grpc.ServerCredentials.createInsecure(), (err: Error | null, port: number) => {
    if (err) {
      console.error(`Server error: ${err.message}`);
    } else {
       console.log(`Server run on port: ${port}`)
    }
});