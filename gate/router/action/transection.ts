import {Request, Response, json, Router} from 'express';

import {verifyToken} from './common.js'
import {transectionServiceClient} from '../../../common/config.js'
import {checkParameterFormat} from '../../../common/utils.js'
import {errParameter,errMicroServiceNotResponse} from '../../../common/errCode.js'
import {ActivityRequest, TransectionRecord, TransectionRecordRequest, TransectionRequest} from '../../../proto/transection.js'

export function registerServiceTransection(): Router{
    let router = Router()
    router.post('/activityList', json(), activityList)
    router.use(verifyToken)
    router.post('/transection', json(), transection)
    router.post('/transection_record', json(), transectionRecord)
    return router
}

async function activityList(req:Request, res:Response):Promise<void> {
    let grpcReq = new ActivityRequest()
    transectionServiceClient.getAcitivitiesInfo(grpcReq,(err, response) => {
        if (err || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
        } 
        res.status(200).json(response)
    })
}

async function transection(req:Request, res:Response):Promise<void> {
    if (!checkParameterFormat(req.body,"username","string") || 
        !checkParameterFormat(req.body,"activityID", "string") || 
        !checkParameterFormat(req.body,"bookInfo","json")) {
        res.status(200).json({errCode: errParameter});
    }

    const {activityID, bookInfo} = req.body;
    const {username} = req.params
    let grpcReq = new TransectionRequest()
    grpcReq.username = username
    grpcReq.activityID =  activityID? activityID:""
    grpcReq.activityID = bookInfo
    transectionServiceClient.transection(grpcReq,(err, response) => {
            if (err || !response) {
                res.status(500).json({errCode: errMicroServiceNotResponse});
            } 
            res.status(200).json(response)
        }
    )
}

async function transectionRecord(req:Request, res:Response) {
    if (!checkParameterFormat(req.body,"username","string") || 
        !checkParameterFormat(req.body,"page", "number") || 
        !checkParameterFormat(req.body,"pageSize","number")) {
        res.status(200).json({errCode: errParameter});
    }

    const {page,pageSize} = req.body;
    const {username} = req.params
    let grpcReq = new TransectionRecordRequest()
    grpcReq.username = username
    grpcReq.page =  page
    grpcReq. pageSize = pageSize
    transectionServiceClient.transectionRecord(grpcReq,(err, response) => {
        if (err || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
        } 
         res.status(200).json(response)
    })
}