import { Request, Response, NextFunction} from 'express';
import { decodeToken} from '../../../common/utils.js'
import { errToken} from '../../../common/errCode.js'

export async function verifyToken(req: Request, res: Response, next:NextFunction) {
    const cookie = req.headers.cookie
    if (!cookie || cookie.length <= ("token=".length) || !cookie.startsWith("token=")) {
        res.status(400).json({errCode: errToken});
        return
    }
    const token = cookie.substring("token=".length);
    const tokenJson = decodeToken(token);

    if (tokenJson === null) {
        res.status(400).send({errcode: errToken})
    }
    req.params["token_username"] = tokenJson.username
    req.params["token_accountType"] = tokenJson.toString()
    next()
}

export function getUsernameInToken(req: Request):string {
    return req.params["token_username"]
}

export function getUserTypeInToken(req: Request):number {
    const typeStr = req.params["token_accountType"]
    return parseInt(typeStr, 10)
}