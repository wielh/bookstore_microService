import * as grpc from "@grpc/grpc-js";
import {accountServiceIP} from '../common/config.js'
import { UnimplementedAccountServiceService} from "../proto/account.js";
import {  mongooseConnection} from '../common/config.js'
import {register, googleLogin, login, resetPassword, resendRegisterVerifyEmail, registerVerify} from './action.js'

await mongooseConnection()
const server = new grpc.Server();
server.addService(UnimplementedAccountServiceService.definition, 
    {register, googleLogin, login, resetPassword, resendRegisterVerifyEmail, registerVerify})
server.bindAsync(accountServiceIP,grpc.ServerCredentials.createInsecure(),
  (err: Error | null, port: number) => {
    if (err) {
      console.error(`Server error: ${err.message}`);
    } else {
       console.log(`Server run on port: ${port}`)
    }
  }
);
