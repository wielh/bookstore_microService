import * as grpc from "@grpc/grpc-js";
import {accountServiceIP} from '../common/config.js'
import { UnimplementedAccountServiceService, GooogleLoginRequest, GooogleLoginResponse, LoginRequest, LoginResponse, 
    RegisterRequest, RegisterResponse, ResetPasswordRequest, ResetPasswordResponse, ResendRegisterVerifyEmailRequest,
    ResendRegisterVerifyEmailResponse,RegisterVerifyRequest,RegisterVerifyResponse} from "../proto/account.js";
import { logger,tokenExpireSecond, basicUrl} from '../common/config.js'
import {errSuccess, errMongo, errUserExist, errUserNotExist, errSendRegisterEmailFailed, errEmailVerifited} from '../common/errCode.js'
import {generateMessage,createToken, sendMailProducer} from '../common/utils.js'
import * as userDB from '../common/dbStructure/user'


async function resendRegiterVerifyEmailImplementation(username:string, email:string): Promise<number> {
    let verificationCode = createToken({username:username, email: email},60*60)
    const emailInfo =
        ` Hello, user ${username}, this is QueenStore bookstore.` +
        ` Please enter the website: ${basicUrl}/register/${verificationCode} `+
        ` to reset your password in our website.`+
        ` If you are not a member. Please ignore this.`;

    let sendEmailSuccess = await sendMailProducer(email, "register email verificaition", emailInfo)
    return sendEmailSuccess?  errSuccess: errSendRegisterEmailFailed
} 

async function register(call: grpc.ServerUnaryCall<RegisterRequest, RegisterResponse>, callback: grpc.sendUnaryData<RegisterResponse>): Promise<void> {
    let functionName:string = "register"
    let req = call.request
    let res = new RegisterResponse()
    try {
        let userExist = userDB.normalUserExist(req.base.username)
        if (userExist) {
            res.errcode = errUserExist
            callback(null, res)
            return
        }
    } catch (error) {
        logger.error(generateMessage(req.base.username, functionName, "mongoErr happens while searching user", call.request))
        res.errcode = errMongo
        callback(error,res)
        return
    }

    try {
        await userDB.insertNormalUser(req.base.username, req.base.password, req.email)
    } catch (error) {
        logger.error(generateMessage(req .base.username, functionName, "mongoErr happens while insert new data to collection user", req))
        res.errcode = errMongo
        callback(error,res)
        return
    }

    res.errcode = await resendRegiterVerifyEmailImplementation(req.base.username,req.email)
    callback(null,res)
}

async function resendRegiterVerifyEmail(call: grpc.ServerUnaryCall<ResendRegisterVerifyEmailRequest,ResendRegisterVerifyEmailResponse>, callback: grpc.sendUnaryData<ResendRegisterVerifyEmailResponse>) {
    let functionName:string = "resendRegiterVerifyEmail"
    let req = call.request
    let res = new ResendRegisterVerifyEmailResponse()

    try {
        let exist = await userDB.emailVerify(req.base.username)
        if (!exist) {
            res.errcode = errUserNotExist
            callback(null, res)
            return
        }
    } catch (error) {
        logger.error(generateMessage(req.base.username, functionName, "mongoErr happens while searching user", call.request))
        res.errcode = errMongo
        callback(error,res)
        return
    }

    res.errcode = await resendRegiterVerifyEmailImplementation(req.base.username,req.email)
    callback(null,res)
} 

async function registerVerify(call: grpc.ServerUnaryCall<RegisterVerifyRequest,RegisterVerifyResponse>, callback: grpc.sendUnaryData<RegisterVerifyResponse>) {
    let functionName:string = "registerVerify"
    let req = call.request
    let res = new RegisterVerifyResponse()
    try {
        let notVerified = userDB.emailVerify(req.base.username)
        if (!notVerified) {
            res.errcode = errEmailVerifited
            callback(null, res)
            return
        }
    } catch (error) {
        logger.error(generateMessage(req.base.username, functionName, "mongoErr happens while searching user", call.request))
        res.errcode = errMongo
        callback(error,res)
        return
    }
    callback(null,res)
}

async function googleLogin(call: grpc.ServerUnaryCall<GooogleLoginRequest, GooogleLoginResponse>, callback: grpc.sendUnaryData<GooogleLoginResponse>):Promise<void> {
    let functionName:string = "googleLogin"
    let req = call.request
    let res = new GooogleLoginResponse()
    let exist = false
    try {
        exist = await userDB.googleUserExist(req.googleID)
    } catch (error) {
        logger.error(generateMessage(req.googleID.toString(), functionName, "mongoErr happens while searching user", call.request))
        res.errcode = errMongo
        callback(error,res)
        return
    }

    if (!exist) {
        try {  
            await userDB.insertGoogleUser(req.googleID,req.googleName,req.googleEmail)
        } catch (error) {
            logger.error(generateMessage(req.googleID.toString(), functionName, "mongoErr happens while insert new user", req))
            res.errcode = errMongo
            callback(error,res)
            return
        }
    }
    res.token = createToken({username:req.googleID.toString()},tokenExpireSecond)
    res.errcode = errSuccess
    callback(null,res)
}

async function login(call: grpc.ServerUnaryCall<LoginRequest, LoginResponse>, callback: grpc.sendUnaryData<LoginResponse>): Promise<void> {
    let functionName:string = "login"
    let res = new LoginResponse()
    try {
        let exist =userDB.normalUserExist(call.request.base.username)
        if (!exist) {
            res.errcode = errUserNotExist
            callback(null, res)
            return
        }
    } catch (error) {
        logger.error(generateMessage(call.request.base.username, functionName, "mongoErr happens while searching user", call.request))
        res.errcode = errMongo
        callback(error,res)
        return
    }

    res.token = createToken({username:call.request.base.username},tokenExpireSecond)
    res.errcode = errSuccess
    callback(null,res)
}
 
async function resetPassword(call: grpc.ServerUnaryCall<ResetPasswordRequest, ResetPasswordResponse>, callback: grpc.sendUnaryData<ResetPasswordResponse>): Promise<void> {
    let functionName:string = "resetPassword"
    let req = call.request
    let res:ResetPasswordResponse = new ResetPasswordResponse()
    try {
       let exist = userDB.resetPassword(req.base.username, req.base.password, req.newPassword)
       if (!exist) {
            res.errcode = errUserNotExist
            callback(null, res)
            return
        }
    } catch (error) {
        logger.error(generateMessage(req.base.username, functionName, "mongoErr happens while searching user", call.request))
        res.errcode = errMongo
        callback(error,res)
        return
    }

    res.errcode = errSuccess
    callback(null,res)
}

const server = new grpc.Server();
server.addService(UnimplementedAccountServiceService.definition, 
    {register, googleLogin, login, resetPassword, resendRegiterVerifyEmail, registerVerify})
server.bindAsync(accountServiceIP,grpc.ServerCredentials.createInsecure(),
  (err: Error | null, port: number) => {
    if (err) {
      console.error(`Server error: ${err.message}`);
    } else {
       console.log(`Server run on port: ${port}`)
    }
  }
);
