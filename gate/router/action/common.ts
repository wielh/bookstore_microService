import {Request, Response, json, Router, NextFunction, urlencoded} from 'express';
import {checkParameterFormat, decodeToken} from '../../../common/utils.js'

export async function verifyToken(req: Request, res: Response, next:NextFunction) {
    if (!checkParameterFormat(req.cookies, "token", "string")) {
        res.status(401).send(`Oops, cannot find user on your token`)
        return;
    }
   
    const token = req.cookies["token"];
    const tokenJson = decodeToken(token);
    const { username } = tokenJson;
    if (username == null) {
        res.status(401).send(`Oops, cannot find user on your token`)
        return;
    }
    req.params["username"] = username
    next()
}