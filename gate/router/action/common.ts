import {Request, Response, NextFunction} from 'express';
import { checkParameterFormat, decodeToken} from '../../../common/utils.js'
import {errParameter,errMicroServiceNotResponse, errToken} from '../../../common/errCode.js'

export async function verifyToken(req: Request, res: Response, next:NextFunction) {
    const cookie = req.headers.cookie
    if (!cookie || cookie.length <= ("token=".length) || !cookie.startsWith("token=")) {
        res.status(200).json({errCode: errToken});
        return
    }
    const token = cookie.substring("token=".length);
    const tokenJson = decodeToken(token);

    const { username, accountType } = tokenJson;
    if (!checkParameterFormat(tokenJson,"username","string") || username == null || username.length < 6 ||
        !checkParameterFormat(tokenJson,"accountType","number") ) {
        res.status(200).send({errcode: errToken})
        return;
    }

    req.query["username"] = username
    req.query["accountType"] = accountType.toString()
    next()
}