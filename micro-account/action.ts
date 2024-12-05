import * as grpc from "@grpc/grpc-js";
import { GooogleLoginRequest, GooogleLoginResponse, LoginRequest, LoginResponse, 
    RegisterRequest, RegisterResponse, ResetPasswordRequest, ResetPasswordResponse, ResendRegisterVerifyEmailRequest,
    ResendRegisterVerifyEmailResponse,RegisterVerifyRequest,RegisterVerifyResponse} from "../proto/account.js";
import {errorLogger,tokenExpireSecond, gateDefaultURL, accountType, rabbitMQConnection} from '../common/config.js'
import {errSuccess, errMongo, errUserExist, errUserNotExist, errSendRegisterEmailFailed, errEmailVerifited} from '../common/errCode.js'
import {createToken, sendMailProducer} from '../common/utils.js'
import * as userDB from '../common/model/user.js'

export async function resendRegiterVerifyEmailImplementation(username:string, email:string): Promise<number> {
    let verificationCode = createToken({username:username, accountType: accountType.normal , email: email}, 60*60)
    const emailInfo =
        ` Hello, user ${username}, this is QueenStore bookstore.` +
        ` Please enter the website: ${gateDefaultURL}/account/register_verify?token=${verificationCode} `+
        ` to complete email varification.`+
        ` If you are not a member. Please ignore this.`;

    let sendEmailSuccess = await sendMailProducer(rabbitMQConnection, email, "register email verificaition", emailInfo)
    return sendEmailSuccess?  errSuccess: errSendRegisterEmailFailed
} 

export async function register(call: grpc.ServerUnaryCall<RegisterRequest, RegisterResponse>, callback: grpc.sendUnaryData<RegisterResponse>): Promise<void> {
    let functionName:string = "register"
    let req = call.request
    let res = new RegisterResponse()
    try {
        let userExist = await userDB.normalUserExist(req.base.username)
        if (userExist) {
            res.errcode = errUserExist
            callback(null, res)
            return
        }
    } catch (error) {
        errorLogger(req.base.username, functionName,"mongoErr happens while searching user", call.request,error)
        res.errcode = errMongo
        callback(error,res)
        return
    }

    try {
        await userDB.insertNormalUser(req.base.username, req.base.password, req.email , req.name)
    } catch (error) {
        errorLogger(req .base.username, functionName, "mongoErr happens while insert new data to collection user", req, error)
        res.errcode = errMongo
        callback(error,res)
        return
    }

    res.errcode = await resendRegiterVerifyEmailImplementation(req.base.username,req.email)
    callback(null,res)
}

export async function resendRegisterVerifyEmail(call: grpc.ServerUnaryCall<ResendRegisterVerifyEmailRequest,ResendRegisterVerifyEmailResponse>, callback: grpc.sendUnaryData<ResendRegisterVerifyEmailResponse>) {
    let functionName:string = "resendRegiterVerifyEmail"
    let req = call.request
    let res = new ResendRegisterVerifyEmailResponse()

    try {
        let exist = await userDB.normalEmailCheckAndChange(req.base.username, req.email)
        if (!exist) {
            res.errcode = errUserNotExist
            callback(null, res)
            return
        }
    } catch (error) {
        errorLogger(req.base.username, functionName, "mongoErr happens while searching user", call.request,error)
        res.errcode = errMongo
        callback(error,res)
        return
    }

    res.errcode = await resendRegiterVerifyEmailImplementation(req.base.username,req.email)
    callback(null,res)
} 

export async function registerVerify(call: grpc.ServerUnaryCall<RegisterVerifyRequest,RegisterVerifyResponse>, callback: grpc.sendUnaryData<RegisterVerifyResponse>) {
    let functionName: string = "registerVerify"
    let req = call.request
    let res = new RegisterVerifyResponse()
    try {
        let notVerified = userDB.normalEmailVerify(req.base.username)
        if (!notVerified) {
            res.errcode = errEmailVerifited
            callback(null, res)
            return
        }
    } catch (error) {
        errorLogger(req.base.username, functionName, "mongoErr happens while searching user", call.request,error)
        res.errcode = errMongo
        callback(error,res)
        return
    }
    callback(null,res)
}

export async function googleLogin(call: grpc.ServerUnaryCall<GooogleLoginRequest, GooogleLoginResponse>, callback: grpc.sendUnaryData<GooogleLoginResponse>):Promise<void> {
    let functionName:string = "googleLogin"
    let req = call.request
    let res = new GooogleLoginResponse()
    let exist = true
    try {
        exist = await userDB.googleUserExist(req.googleID)
    } catch (error) {
        errorLogger(req.googleID.toString(), functionName, "mongoErr happens while searching user", call.request,error)
        res.errcode = errMongo
        callback(error,res)
        return
    }

    if (!exist) {
        try {  
            await userDB.insertGoogleUser(req.googleID,req.googleName,req.googleEmail)
        } catch (error) {
            errorLogger(req.googleID.toString(), functionName, "mongoErr happens while insert new user", req, error)
            res.errcode = errMongo
            callback(error,res)
            return
        }
    }
    res.token = createToken({username:req.googleID.toString(), accountType:accountType.google, email:""},tokenExpireSecond)
    res.errcode = errSuccess
    callback(null,res)
}

export async function login(call: grpc.ServerUnaryCall<LoginRequest, LoginResponse>, callback: grpc.sendUnaryData<LoginResponse>): Promise<void> {
    let functionName:string = "login"
    let res = new LoginResponse()
    try {
       
        let exist = await userDB.normalUserExistWithPWD(call.request.base.username, call.request.base.password)
        if (!exist) {
            res.errcode = errUserNotExist
            callback(null, res)
            return
        }
    } catch (error) {
        errorLogger(call.request.base.username, functionName, "mongoErr happens while searching user", call.request, error)
        res.errcode = errMongo
        callback(error,res)
        return
    }

}
 
export async function resetPassword(call: grpc.ServerUnaryCall<ResetPasswordRequest, ResetPasswordResponse>, callback: grpc.sendUnaryData<ResetPasswordResponse>): Promise<void> {
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
        errorLogger(req.base.username, functionName, "mongoErr happens while searching user", call.request,error)
        res.errcode = errMongo
        callback(error,res)
        return
    }

    res.errcode = errSuccess
    callback(null,res)
}
