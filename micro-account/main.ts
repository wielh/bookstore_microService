import * as grpc from "@grpc/grpc-js";
import {accountServiceURL,rabbitMQconnect, errorLogger, infoLogger, setElasticIndex} from '../common/config.js'
import { UnimplementedAccountServiceService} from "../proto/account.js";
import {register, googleLogin, login, resetPassword, resendRegisterVerifyEmail, registerVerify} from './action.js'

setElasticIndex("micro-account")
await rabbitMQconnect()
const server = new grpc.Server();
server.addService(UnimplementedAccountServiceService.definition, 
    {register, googleLogin, login, resetPassword, resendRegisterVerifyEmail, registerVerify})
server.bindAsync(accountServiceURL,grpc.ServerCredentials.createInsecure(),
  (err: Error | null, port: number) => {
    if (err) {
      errorLogger("micro-account-service", "server.bindAsync", "error happens on micro-account start", "", err)
    } else {
      infoLogger("micro-account-service", "server.bindAsync", `Server run on port: ${port}`, "")
    }
  }
);
