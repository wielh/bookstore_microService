import * as grpc from "@grpc/grpc-js";
import {accountServiceURL,rabbitMQconnect} from '../common/config.js'
import { UnimplementedAccountServiceService} from "../proto/account.js";
import {register, googleLogin, login, resetPassword, resendRegisterVerifyEmail, registerVerify} from './action.js'

await rabbitMQconnect()
const server = new grpc.Server();
server.addService(UnimplementedAccountServiceService.definition, 
    {register, googleLogin, login, resetPassword, resendRegisterVerifyEmail, registerVerify})
server.bindAsync(accountServiceURL,grpc.ServerCredentials.createInsecure(),
  (err: Error | null, port: number) => {
    if (err) {
      console.error(`Server error: ${err.message}`);
    } else {
       console.log(`Server run on port: ${port}`)
    }
  }
);
