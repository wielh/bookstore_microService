import {Request, Response, json, Router} from 'express';
import { body, query ,validationResult } from 'express-validator';
import {credentials} from '@grpc/grpc-js'

import {verifyToken, getUserTypeInToken, getUsernameInToken} from './common.js'
import {transectionServiceURL} from '../../../common/init.js'
import {errParameter,errMicroServiceNotResponse} from '../../../common/errCode.js'
import {castToString, infoLogger} from '../../../common/utils.js'
import * as transectionProto from '../../../proto/transection.js'


const isSingalBookTransection = (value: any) => {
    if (!value) {
        throw new Error('Each item in the books array must be a valid Book with a string title and a positive price');
    }
        
    if (typeof value.bookId !== 'string') {
        throw new Error('field books.bookId should be string');
    }
        
    if (typeof value.bookNumber !== 'number' || value.bookNumber <= 0) {
        throw new Error('field books.bookNumber should be number and min value > 0');
    }
    return true;
};

export function registerServiceTransection(): Router{
    let router = Router()
    router.get('/activityList', activityList)
    router.use(verifyToken)
    router.post('/', 
        json(), [
            body("activityID").isString().withMessage("field activityID should be string"),
            body("activityType").isInt().withMessage("field activityType should be int"),
            body("books").isArray().custom(
                (value) => {
                    if (!Array.isArray(value)) {
                        throw new Error('field books should be array');
                    }

                    let bookIds = new Set<string>()
                    value.forEach((tr: any) => {
                        isSingalBookTransection(tr);
                        const id = tr.bookId as string
                        if (bookIds.has(id)) {
                            throw new Error('field books has dupulicated ID');
                        } 
                        bookIds.add(id) 
                    });
                    return true
                }
            )
        ],
        transection
    )
    router.get(
        '/record', 
        [
            query("page").isInt({min:0}).withMessage("field page should be int and val>=0"),
            query("pageSize").isInt({min:1}).withMessage("field activityType should be int and val >=1 "),
        ], 
        transectionRecord
    )
    return router
}

class ActivityList {
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

async function activityList(_req:Request, res:Response):Promise<void> {
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400).json({ errorCode:errParameter, errors: errors.array()});
       return
    }

    const { activityID, activityType, bookInfo} = req.body;
    const username = getUsernameInToken(req)
    const userType = getUserTypeInToken(req)

    let grpcReq = new  transectionProto.TransectionRequest()
    grpcReq.username = username
    grpcReq.userType = userType
    grpcReq.activityID = activityID
    grpcReq.activityType = parseInt(activityType)
    grpcReq.bookInfo = []
    for (let b of bookInfo) {
        let book = new transectionProto.BookInfo()
        book.bookId = b.bookId
        book.bookNumber = b.bookNumber
        grpcReq.bookInfo.push(book)
    }
 
    infoLogger(grpcReq.username,"A new transection request start", grpcReq)
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400).json({ errorCode:errParameter, errors: errors.array() });
       return
    }

    const  { page, pageSize } = req.query;
    const username = getUsernameInToken(req)
    const accountType = getUserTypeInToken(req)

    let grpcReq = new  transectionProto.TransectionRecordRequest()
    grpcReq.username = username
    grpcReq.accountType = accountType
    let i = parseInt(castToString(page), 10);
    grpcReq.page = i 
    i = parseInt(castToString(pageSize), 10);
    grpcReq.pageSize = i

    transectionServiceClient.transectionRecord(grpcReq,(err, response) => {
        if (err || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
            return
        } 
        res.status(200).json(new transectionRecordRes(response))
        return
    })
}

var transectionServiceClient = new transectionProto.TransectionServiceClient(transectionServiceURL, credentials.createInsecure())