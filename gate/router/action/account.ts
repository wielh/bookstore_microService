import {Request, Response, json, Router, response} from 'express';
import passport from 'passport';
import {accountServiceClient, googleVerifyID, googleVerifyPassword, googleCallbackUrl, logger} from '../../../common/config.js'
import {passwordHash, checkParameterFormat, generateMessage} from '../../../common/utils.js'
import {errParameter,errMicroServiceNotResponse, errSuccess, errGoogleToken} from '../../../common/errCode.js'
import * as a from '../../../proto/account.js'
import { Profile, Strategy } from 'passport-google-oauth20';

export function registerServiceAccount(): Router{
    let router = Router()
    router.post('/register', json(), register)
    router.use(passport.initialize());
    passport.use(googleVerifyStrategy)
    router.get("/google_login",passport.authenticate("google", {scope: ["email", "profile"]}), googleCallback)
    router.post('/login', json(), login)
    router.post('/reset_password', json(), resetPassword)
    router.post('/resend_regiter_verify_email', json(), resendRegisterVerifyEmail)
    router.post('/regiterVerify', json(), registerVerify)
    return router
}

const googleVerifyStrategy = new Strategy({
    clientID: googleVerifyID,
    clientSecret:  googleVerifyPassword,
    callbackURL: googleCallbackUrl
  }, function(accessToken:string, refreshToken:string, profile:Profile, cb) {
    let grpcReq = new a.GooogleLoginRequest
    grpcReq.googleID = profile.id
    grpcReq.googleName = profile.name.givenName
    grpcReq.googleEmail = profile.emails.values[0]
    accountServiceClient.gooogleLogin(grpcReq,(error, response) => {
        if (error || response.errcode) {
            logger.warn(generateMessage(profile.name.givenName,"googleLogin","An googleLogin error happens", [error,response]))
            return cb(null,{});
        }
        return cb(null,{token: response.token});
    })
  }
)

async function register(req:Request, res:Response):Promise<void> {
    if (!checkParameterFormat(req.body,"username","string") || 
        !checkParameterFormat(req.body,"password","string") ||
        !checkParameterFormat(req.body,"email","string")) {
        res.status(200).json({errCode: errParameter});
    }

    const {username, password, email} = req.body;
    let grpcReq = new a.RegisterRequest
    let account = new a.Base()
    account.username = username
    account.password = passwordHash(password)
    grpcReq.base = account
    grpcReq.email = email

    accountServiceClient.register(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(200).json({errCode: errMicroServiceNotResponse});
        } else {
            res.status(200).json({errCode: response.errcode})
        }
    })
}

async function googleCallback(req:Request, res:Response) {
    if (!checkParameterFormat(req.body,"token","string")) {
        res.status(200).json({errCode: errGoogleToken});
    }

    const {token} = req.body;
    res.cookie("token", token)
    res.status(200).json({errCode: errSuccess})
}

async function login(req:Request, res:Response):Promise<void> {
    if (!checkParameterFormat(req.body,"username","string") || 
        !checkParameterFormat(req.body,"password","string")) {
        res.status(200).json({errCode: errParameter});
    }

    const {username, password} = req.body;
    let grpcReq = new a.LoginRequest
    let account = new a.Base()
    account.username = username
    account.password = passwordHash(password)
    grpcReq.base = account

    accountServiceClient.login(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(200).json({errCode: errMicroServiceNotResponse});
        } else {
            res.cookie("token", response.token)
            res.status(200).json({errCode: response.errcode})
        }
    })
}

async function resetPassword(req:Request, res:Response):Promise<void> {
    if (!checkParameterFormat(req.body,"username","string") || 
        !checkParameterFormat(req.body,"password","string") ||
        !checkParameterFormat(req.body,"newPassword","string")) {
        res.status(200).json({errCode: errParameter});
    }

    const {username, password, newPassword} = req.body;
    let grpcReq = new a.ResetPasswordRequest
    let account = new a.Base()
    account.username = username
    account.password = passwordHash(password)
    grpcReq.base = account
    grpcReq.newPassword = passwordHash(newPassword)

    accountServiceClient.resetPassword(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(200).json({errCode: errMicroServiceNotResponse});
        } else {
            res.status(200).json({errCode: response.errcode})
        }
    })
}

async function resendRegisterVerifyEmail(req:Request, res:Response):Promise<void>{
    const {username, password} = req.body;
    let grpcReq = new a.ResendRegisterVerifyEmailRequest
    let account = new a.Base()
    account.username = username
    account.password = passwordHash(password)
    grpcReq.base = account

    accountServiceClient.resendRegisterVerifyEmail(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(200).json({errCode: errMicroServiceNotResponse});
        } else {
            res.status(200).json({errCode: response.errcode})
        }
    })
}

async function registerVerify(req:Request, res:Response):Promise<void>{
    const {username, password} = req.body;
    let grpcReq = new a.RegisterVerifyRequest
    let account = new a.Base()
    account.username = username
    account.password = passwordHash(password)
    grpcReq.base = account

    accountServiceClient.regiterVerify(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(200).json({errCode: errMicroServiceNotResponse});
        } else {
            res.status(200).json({errCode: response.errcode})
        }
    })
}

