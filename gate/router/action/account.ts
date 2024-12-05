import {Request, Response, json, Router } from 'express';
import passport from 'passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { body, param, validationResult } from 'express-validator';
import { credentials } from '@grpc/grpc-js'

import { googleCallbackUrl, GlobalConfig, accountServiceURL} from '../../../common/init.js'
import { decodeToken, warnLogger} from '../../../common/utils.js'
import {errParameter, errMicroServiceNotResponse, errSuccess, errGoogleToken, errToken} from '../../../common/errCode.js'
import * as a from '../../../proto/account.js'
import {verifyToken, getUsernameInToken} from './common.js'
import {AccountServiceClient} from '../../../proto/account.js'

export function registerServiceAccount(): Router {
    let router = Router()
    router.post('/register',
        json(), [
            body("username").isString().isLength({ min: 6, max: 50 }).withMessage("field username should be string and 6<=len<=50"),
            body("name").isString().isLength({ min: 6, max: 50 }).withMessage("field name should be string and 6<=len<=50"),
            body("password").isString().isLength({ min: 6, max: 50 }).withMessage("field password should be string and 6<=len<=50"),
            body("email").isEmail().withMessage('Please enter a valid email address')
        ], 
        register
    )
    router.post('/register_verify/:token', 
        json(), [   
            param("token").isString().withMessage("token invaild"),
            body("username").isString().withMessage("field username should be string"),
            body("password").isString().withMessage("field password should be string"),
        ],
        registerVerify
    )
    router.post('/resend_register_verify_email', 
        json(), [   
            body("username").isString().withMessage("field username should be string"),
            body("password").isString().withMessage("field password should be string"),
        ],
        resendRegisterVerifyEmail
    )
    router.use(passport.initialize());
    passport.use(googleVerifyStrategy)
    router.get("/google_callback",passport.authenticate("google", {scope: ["email", "profile"], session:false}), googleCallback)
    router.post('/login', 
        json(), [   
            body("username").isString().withMessage("field username should be string"),
            body("password").isString().withMessage("field password should be string"),
        ], 
        login
    )

    router.use(verifyToken)
    router.put('/reset_password', 
        json(),
        [
            body("password").isString().withMessage("field password should be string"),
            body("newPassword").isString().withMessage("field newPassword should be string"),
        ], 
        resetPassword
    )
    
  
    return router
}

const googleVerifyStrategy = new Strategy({
    clientID: GlobalConfig.googleOauth2.googleVerifyID,
    clientSecret:  GlobalConfig.googleOauth2.googlePassword,
    callbackURL: googleCallbackUrl
  }, function(_accessToken:string, _refreshToken:string, profile:Profile, cb) {
    let grpcReq = new a.GooogleLoginRequest
    grpcReq.googleID = profile.id
    grpcReq.googleName = profile.name? profile.name.givenName:""
    grpcReq.googleEmail = profile.emails? profile.emails[0].value:""
    accountServiceClient.googleLogin(grpcReq,(error, response) => {
        if (error || !response || response.errcode) {
            warnLogger(grpcReq.googleName,"An googleLogin error happens",response,error)
            return cb(null,{});
        }
        return cb(null,{token: response.token});
    })
  }
)

async function register(req:Request, res:Response):Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400).json({ errorCode:errParameter, errors: errors.array() });
       return
    }

    const {username, password, email, name} = req.body;
    let grpcReq = new a.RegisterRequest
    let account = new a.Base()
    account.username = username
    account.password = password
    grpcReq.base = account
    grpcReq.email = email
    grpcReq.name = name

    accountServiceClient.register(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
            return
        } else {
            res.status(200).json({errCode: response.errcode})
            return
        }
    })
}

async function registerVerify(req:Request, res:Response):Promise<void>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400).json({ errCode: errToken, errorCode:errParameter, errors: errors.array() });
       return
    }

    let account = new a.Base()
    let tokenStr = req.query.token as string
    try {
        const tokenJson = decodeToken(tokenStr);
        if(tokenJson === null ) {
            res.status(400).json({errCode: errToken});
            return
        } 
        const {username} = tokenJson
        account.username = username
    } catch (error) {
        res.status(400).json({errCode: errToken});
    }

    let grpcReq = new a.RegisterVerifyRequest
    grpcReq.base = account
    accountServiceClient.registerVerify(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
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

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400).json({ errorCode:errParameter, errors: errors.array()});
       return
    }

    const {username, password} = req.body;
    let grpcReq = new a.LoginRequest
    let account = new a.Base()
    account.username = username
    account.password = password
    grpcReq.base = account

    accountServiceClient.login(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400).json({ errorCode:errParameter, errors: errors.array()});
       return
    }

    const username = getUsernameInToken(req)
    const {password, newPassword} = req.body;
    let grpcReq = new a.ResetPasswordRequest
    let account = new a.Base()
    account.username = username
    account.password = password
    grpcReq.base = account
    grpcReq.newPassword = newPassword

    accountServiceClient.resetPassword(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
            return
        } else {
            res.status(200).json({errCode: response.errcode})
            return
        }
    })
}

async function resendRegisterVerifyEmail(req:Request, res:Response):Promise<void>{
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400).json({ errorCode:errParameter, errors: errors.array()});
       return
    }

    const {username, password} = req.body;
    let grpcReq = new a.ResendRegisterVerifyEmailRequest
    let account = new a.Base()
    account.username = username
    account.password = password
    grpcReq.base = account

    accountServiceClient.resendRegisterVerifyEmail(grpcReq,(error, response) => {
        if (error || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
            return
        } else {
            res.status(200).json({errCode: response.errcode})
            return
        }
    })
}

var accountServiceClient = new AccountServiceClient( accountServiceURL, credentials.createInsecure())



