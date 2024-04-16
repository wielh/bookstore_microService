import {Request, Response, json, Router} from 'express';

import {verifyToken} from './common.js'
import {transectionServiceClient,logger} from '../../../common/config.js'
import {checkParameterFormat, generateMessage} from '../../../common/utils.js'
import {errParameter,errMicroServiceNotResponse} from '../../../common/errCode.js'
import * as transectionProto from '../../../proto/transection.js'

export function registerServiceTransection(): Router{
    let router = Router()
    router.get('/activity_list', json(), activityList)
    router.use(verifyToken)
    router.post('/', json(), transection)
    router.get('/record', json(), transectionRecord)
    return router
}

class ActivityList{
    errcode : number 
    data : {
        activityID:string
        activityType:number
        startDate:number
        endDate:number
        activityInfo: string
    }[]
    
    constructor(response: transectionProto.ActivityReponse) {
       this.errcode = response.errCode
       this.data = []
       for (let data of response.data) {
          try {
            console.log(data)
            this.data.push({
                activityID: data.activityID,
                activityType: data.activityType,
                startDate: data.startDate,
                endDate: data.endDate,
                activityInfo: data.activityInfo
            })
          } catch (error) {}
       }
    }
}

async function activityList(req:Request, res:Response):Promise<void> {
    let grpcReq = new  transectionProto.ActivityRequest()
    transectionServiceClient.activityList(grpcReq,(err, response) => {
        if (err || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
            return
        } 
        res.status(200).json(new ActivityList(response))
        return
    })
}

class TransectionRes {
    errcode:number 
    bookInfo:BookInfo[]
    appliedActivityData:{
        activityType:number
        startDate:number
        endDate:number
        activityInfo:JSON
    }
    totalPrice:number; 
    transectionTime:number;

    constructor(res:  transectionProto.TransectionResponse) {
        this.errcode = res.errCode
        this.bookInfo = []
        for(let b of res.bookInfo){
            this.bookInfo.push({
                bookId:b.bookId,
                bookNumber:b.bookNumber,
                price:b.price
            })
        }
        try { 
            this.appliedActivityData = {
                activityType:res.appliedActivityData.activityType,
                activityInfo:JSON.parse(res.appliedActivityData.activityInfo),
                startDate:res.appliedActivityData.startDate,
                endDate:res.appliedActivityData.endDate
            }
        } catch {}
        this.totalPrice = res.totalPrice
        this.transectionTime = res.transectionTime
    }
}


async function transection(req:Request, res:Response):Promise<void> {
    if (!checkParameterFormat(req.body,"activityID", "string") ||
        !checkParameterFormat(req.body,"activityType", "number")) {
        res.status(200).json({errCode: errParameter});
        return
    }

    const {activityID, activityType, bookInfo} = req.body;
    const {username, accountType} = req.query
    let grpcReq = new  transectionProto.TransectionRequest()
    try {
        grpcReq.username = username as string
        grpcReq.userType = parseInt(accountType as string)
        grpcReq.activityID = activityID
        grpcReq.activityType = parseInt(activityType)
        grpcReq.bookInfo = []
        for (let b of bookInfo) {
           let book = new transectionProto.BookInfo()
           book.bookId = b.bookId
           book.bookNumber = b.bookNumber
           grpcReq.bookInfo.push(book)
        }
    } catch (error) {
        logger.warn(generateMessage(username as string, "transection", error, [req.body, req.query]))
        res.status(500).json({errCode: errParameter});
        return
    }

    logger.info(generateMessage(username as string, "gate_transection", "A new transection request start", grpcReq))
    transectionServiceClient.transection(grpcReq,(err, response) => {
            if (err || !response) {
                console.log(err)
                console.log(response)
                res.status(500).json({errCode: errMicroServiceNotResponse});
                return
            } 
            res.status(200).json(new TransectionRes(response))
            return
        }
    )
}

class BookInfo {
    bookId:string
    bookNumber:number
    price:number
}

class transectionRecordRes {
    errCode:number
    username:string
    recordNumber:number
    transectionRecords:{
        bookInfo: BookInfo[]
        appliedActivityData:{
            activityType:number
            startDate:number
            endDate:number
            activityInfo:string
        }
        totalPrice:number; 
        transectionTime:number;
    }[]
    page:number
    pageSize:number

    constructor(res: transectionProto.TransectionRecordResponse) {
        this.errCode = res.errCode
        this.username = res.username
        this.recordNumber = res.recordNumber
        this.page = res.page
        this.pageSize = res.pageSize
        this.transectionRecords = []
        for (let record of res.transectionRecords) {
            let a = record.appliedActivityData
            let bookInfo:BookInfo[] = []  
            for (let info of record.bookInfo) {
                bookInfo.push({
                    bookId: info.bookId,
                    bookNumber: info.bookNumber,
                    price: info.price
                })
            }

            this.transectionRecords.push({
                bookInfo:bookInfo,
                appliedActivityData:{
                    activityType: a.activityType,
                    startDate: a.startDate,
                    endDate: a.endDate,
                    activityInfo: a.activityInfo
                },
                totalPrice : record.totalPrice,
                transectionTime: record.transectionTime
            })
        }
    }
}

async function transectionRecord(req:Request, res:Response) {
    if (!checkParameterFormat(req.body,"page", "number") || 
        !checkParameterFormat(req.body,"pageSize","number")) {
        res.status(200).json({errCode: errParameter});
        return
    }

    const {page,pageSize} = req.body;
    const {username, accountType} = req.query
    let grpcReq = new  transectionProto.TransectionRecordRequest()
    try {
        grpcReq.username = username as string
        grpcReq.accountType = parseInt(accountType as string)
        grpcReq.page = page
        grpcReq.pageSize = pageSize
    } catch (error) {
        logger.warn(generateMessage(username as string, "transection", error, [req.body, req.query]))
        res.status(500).json({errCode: errParameter});
        return
    }

    transectionServiceClient.transectionRecord(grpcReq,(err, response) => {
        if (err || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
            return
        } 
        res.status(200).json(new transectionRecordRes(response))
        return
    })
}