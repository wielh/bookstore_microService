import {Request, Response, json, Router } from 'express';
import passport from 'passport';
import {accountServiceClient, googleVerifyID, googleVerifyPassword, googleCallbackUrl, logger, oauth2Client} from '../../../common/config.js'
import {passwordHash, checkParameterFormat, generateMessage, decodeToken} from '../../../common/utils.js'
import {errParameter,errMicroServiceNotResponse, errSuccess, errGoogleToken, errToken, errUsernameTooShort , errPasswordTooShort} from '../../../common/errCode.js'
import * as a from '../../../proto/account.js'
import { Profile, Strategy } from 'passport-google-oauth20';
import {google} from 'googleapis'


export function registerServiceAccount(): Router{
    let router = Router()
    router.post('/register', json(), register)
    router.use(passport.initialize());
    passport.use(googleVerifyStrategy)
    router.get("/google_callback",passport.authenticate("google", {scope: ["email", "profile"], session:false}), googleCallback)
    router.post('/login', json(), login)
    router.post('/reset_password', json(), resetPassword)
    router.post('/resend_register_verify_email', json(), resendRegisterVerifyEmail)
    router.post('/register_verify', json(), registerVerify)
    return router
}

const googleVerifyStrategy = new Strategy({
    clientID: googleVerifyID,
    clientSecret:  googleVerifyPassword,
    callbackURL: googleCallbackUrl
  }, function(accessToken:string, refreshToken:string, profile:Profile, cb) {
    let grpcReq = new a.GooogleLoginRequest
    grpcReq.googleID = profile.id
    grpcReq.googleName = profile.name? profile.name.givenName:""
    grpcReq.googleEmail = profile.emails? profile.emails[0].value:""
    accountServiceClient.googleLogin(grpcReq,(error, response) => {
        if (error || !response || response.errcode) {
            logger.warn(generateMessage(grpcReq.googleName,"googleLogin","An googleLogin error happens", [error,response]))
            return cb(null,{});
        }
        return cb(null,{token: response.token});
    })
  }
)

async function register(req:Request, res:Response):Promise<void> {
    if (!checkParameterFormat(req.body,"username","string") || 
        !checkParameterFormat(req.body,"password","string") ||
        !checkParameterFormat(req.body,"email","string") ||
        !checkParameterFormat(req.body,"name","string")) {
        res.status(200).json({errCode: errParameter});
    }
    const {username, password, email, name} = req.body;

    if (username.length < 6 ) {
        res.status(200).json({errCode: errUsernameTooShort});
        return
    }

    if (password.length < 6 ) {
        res.status(200).json({errCode: errPasswordTooShort});
        return
    }

    let grpcReq = new a.RegisterRequest
    let account = new a.Base()
    account.username = username
    account.password = passwordHash(password)
    grpcReq.base = account
    grpcReq.email = email
    grpcReq.name = name

    accountServiceClient.register(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(200).json({errCode: errMicroServiceNotResponse});
            return
        } else {
            res.status(200).json({errCode: response.errcode})
            return
        }
    })
}

async function googleCallback(req:Request, res:Response) {
    try {
        res.cookie("token", req.user["token"] as string)
    } catch {
        res.status(200).json({errCode: errGoogleToken});
        return
    }
    res.status(200).json({errCode: errSuccess})
}

async function login(req:Request, res:Response):Promise<void> {
    if (!checkParameterFormat(req.body,"username","string") || 
        !checkParameterFormat(req.body,"password","string")) {
        res.status(200).json({errCode: errParameter});
        return
    }

    const {username, password} = req.body;
    let grpcReq = new a.LoginRequest
    let account = new a.Base()
    account.username = username
    account.password = passwordHash(password)
    grpcReq.base = account

    if (username.length < 6 || password.length < 6) {
        res.status(200).json({errCode: errToken})
        return
    }

    accountServiceClient.login(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(200).json({errCode: errMicroServiceNotResponse});
            return
        } else {
            if(response.errcode == errSuccess) {
                res.cookie("token", response.token)
            }
            res.status(200).json({errCode: response.errcode})
            return
        }
    })
}

async function resetPassword(req:Request, res:Response):Promise<void> {
    if (!checkParameterFormat(req.body,"username","string") || 
        !checkParameterFormat(req.body,"password","string") ||
        !checkParameterFormat(req.body,"newPassword","string")) {
        res.status(200).json({errCode: errParameter});
        return
    }

    const {username, password, newPassword} = req.body;
    let grpcReq = new a.ResetPasswordRequest
    let account = new a.Base()
    account.username = username
    account.password = passwordHash(password)
    grpcReq.base = account
    grpcReq.newPassword = passwordHash(newPassword)

    if ( newPassword.length < 6 ) {
        res.status(200).json({errCode: errPasswordTooShort});
        return
    }

    accountServiceClient.resetPassword(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(200).json({errCode: errMicroServiceNotResponse});
            return
        } else {
            res.status(200).json({errCode: response.errcode})
            return
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
            return
        } else {
            res.status(200).json({errCode: response.errcode})
            return
        }
    })
}

async function registerVerify(req:Request, res:Response):Promise<void>{
    let tokenStr = ""
    try {
        tokenStr = req.query.token as string
        if (!tokenStr || tokenStr .length <= 0) {
            res.status(200).json({errCode: errToken});
            return
        }
    } catch (error) {
        res.status(200).json({errCode: errToken});
    }

    let account = new a.Base()
    try {
        const tokenJson = decodeToken(tokenStr);
        const {username} = tokenJson
        if( !username || username.length == 0) {
            res.status(200).json({errCode: errToken});
            return
        }
        account.username = username
    } catch (error) {
        res.status(200).json({errCode: errToken});
    }
    let grpcReq = new a.RegisterVerifyRequest
    grpcReq.base = account
 
    accountServiceClient.registerVerify(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(200).json({errCode: errMicroServiceNotResponse});
            return
        } else {
            res.status(200).json({errCode: response.errcode})
            return
        }
    })
}

