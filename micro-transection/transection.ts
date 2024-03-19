
import {ServerUnaryCall, sendUnaryData} from "@grpc/grpc-js";
import mongoose from 'mongoose'

import {TransectionRequest, TransectionResponse, BookInfo, TransectionRecordRequest, TransectionRecordResponse, TransectionRecord, ActivityReponseData} from '../proto/transection.js'
import { logger} from '../common/config.js'
import { errMongo, errSuccess, errUserNotExist} from '../common/errCode.js'
import { generateMessage,checkParameterFormat, pageX} from '../common/utils.js'
import * as bookDB from '../common/dbStructure/book.js'
import * as userDB from '../common/dbStructure/user.js'
import * as transectionDB from '../common/dbStructure/transection.js'
import * as activityDB from '../common/dbStructure/activity.js'

async function normalCalculatePrice(req:TransectionRequest, res:TransectionResponse): Promise<TransectionResponse> {
    res.bookInfo = []
    let totalPrice : number = 0
    for (let book of req.bookInfo) {
        let bookRes = new BookInfo()
        let bookMongo = await bookDB.getBookById(book.bookId)
        if (bookMongo == null) {
            continue
        }

        let price: number = bookMongo.price
        if (price <= 0) {
            continue
        }
    
        bookRes.bookId = book.bookId
        bookRes.bookNumber = book.bookNumber
        bookRes.price = price
        res.bookInfo.push(bookRes)
        totalPrice += price * book.bookNumber
    }

    res.totalPrice = totalPrice
    res.errCode = errSuccess
    return res
}

async function calculatePriceType1(req:TransectionRequest, res:TransectionResponse): Promise<TransectionResponse>  {
    let functionName = "calculatePriceType1"
    res = await normalCalculatePrice(req, res) 
    let activity = await activityDB.findActivityType1ById(req.activityID, res.transectionTime)
    if (activity == null) {
        return res
    }

    let discount = 1
    try {
        for(let level of activity.level) {
            if (level.price > res.totalPrice) {
                break
            } 
            discount = level.discount 
        }
    } catch (error) {
        logger.error(generateMessage("", functionName, "Activity config error", activity))
        res.errCode = errMongo
        return res
    }

    if (discount >= 0 && discount <=1) {
        res.totalPrice = res.totalPrice * discount
    } 
    res.appliedActivityData.activityType = 1
    res.appliedActivityData.activityInfo = JSON.stringify(activity) 
    return res
}

async function calculatePriceType2(req:TransectionRequest, res:TransectionResponse): Promise<TransectionResponse>  {
    let functionName = "calculatePriceType2"
    res = await normalCalculatePrice(req,res) 
    let activity = await activityDB.findActivityType2ById(req.activityID, res.transectionTime)
    if (activity == null) {
        return res
    } 

    let discount = 0
    try {
        for(let level of activity.level) {
            if (level.price > res.totalPrice) {
                break
            } 
            discount = level.discount 
        }
    } catch (error) {
        logger.error(generateMessage("", functionName, "Activity config error", activity))
        res.errCode = errMongo
        return res
    }

    if (discount >= 0 && discount <= res.totalPrice) {
        res.totalPrice = res.totalPrice - discount
    } 
    res.appliedActivityData.activityType = 2
    res.appliedActivityData.activityInfo = JSON.stringify(activity) 
    return res
}

async function calculatePriceType3(req:TransectionRequest, res:TransectionResponse): Promise<TransectionResponse>  {
    let functionName = "calculatePriceType3"
    res = await normalCalculatePrice(req,res) 
    let activity = await activityDB.findActivityType3ById(req.activityID, res.transectionTime)
    if (activity == null) {
        return res
    } 

    let totalDiscount = 0
    try {
       for(let bookInfo of res.bookInfo) {
         for (let level of activity.level) {
            let by:number = level.by
            let give:number = level.give
            if (by <= 0 || give <= 0) {
                continue
            }
            let book = await bookDB.getBookById(bookInfo.bookId)
            if( book == null) {
                continue
            }
            let bookPrice:number =  book.price
            if (bookPrice <= 0) {
                continue
            }
            totalDiscount += bookPrice * Math.floor(bookInfo.bookNumber / by) * give
         }
       }
    } catch (error) {
        logger.error(generateMessage("", functionName, "Activity config error", activity))
        res.errCode = errMongo
        return res
    }

    res.totalPrice -= totalDiscount
    res.appliedActivityData.activityType = 3
    res.appliedActivityData.activityInfo = JSON.stringify(activity) 
    return res
}

async function calculatePrice(req:TransectionRequest): Promise<TransectionResponse> {
    let now = new Date().getTime()
    let res = new TransectionResponse()
    res.transectionTime = now

    switch (req.activityType){
        case 1:
            return await calculatePriceType1(req, res)
        case 2:
            return await calculatePriceType2(req, res)
        case 3:
            return await calculatePriceType3(req, res)
        default:
            return await normalCalculatePrice(req, res)
    }
}

export async function transection(call: ServerUnaryCall<TransectionRequest,TransectionResponse>, callback: sendUnaryData<TransectionResponse>) {
    let res:TransectionResponse = new TransectionResponse()
    let functionName:string = "transection"
    let req = call.request
    let cost = 0
    logger.info(generateMessage("", functionName, "A new transection request started", call.request))

    let userExist = false
    try {
        userExist = await userDB.userExist(req.username, req.userType)
        if (!userExist) {
            res.errCode = errUserNotExist
            callback(null,res)
            return
        }
    } catch (error) {
        logger.error(generateMessage("", functionName, "A mongoErr happens while searching user", call.request))
        res.errCode = errMongo
        callback(error,res)
        return
    }
    // 1. 算錢
    res = await calculatePrice(req)
    if (res.errCode != errSuccess) {
        callback(null,res)
        return
    }
    cost = res.totalPrice 

    // 2. writeDB
    // let mongoSession = mongoClient.startSession()
    let now = res.transectionTime
    const session = await mongoose.startSession();

    try { 
        session.startTransaction();
        await userDB.transection(req.username, req.userType, cost)
        await transectionDB.insertLog(req.username, req.userType, req.activityID, now, cost, res.bookInfo) 
        await transectionDB.updateBalance(now, cost)
        res.totalPrice = cost
        await session.commitTransaction()
    } catch (error) {
        logger.error(generateMessage(req.username, functionName, "A mongoErr happens while searching user", call.request))
        await session.abortTransaction()
        res.errCode = errMongo
        callback(error,res)
        return
    } finally {
        await session.endSession()
    }

    res.errCode = errSuccess
    logger.info(generateMessage("", functionName, "A new transection request end", [call.request, res]))
    callback(null,res)
}

export async function getTransectionRecord(call: ServerUnaryCall<TransectionRecordRequest, TransectionRecordResponse>, callback: sendUnaryData<TransectionRecordResponse>) {
    let functionName:string = "TransectionRecord"
    let req = call.request
    let res = new TransectionRecordResponse()
    let count = 0 
    try {
        count = await transectionDB.countLog(req.username ,req.accountType)
    } catch (error) {
        logger.error(generateMessage("", functionName, "mongoErr happens while searching book", call.request))
        res.errCode = errMongo
        callback(error,res)
    }

    let records: TransectionRecord[] = []
    let record: TransectionRecord
    let document : any
    try {
        let logs = await transectionDB.getLogData(req.username, req.accountType, req.pageSize, req.page, count)
        for (let log of logs) {
            record = new TransectionRecord()
            record.transectionTime = log.transectionTime
            record.appliedActivityData = new ActivityReponseData()
            let a = await activityDB.findActivityById(log.activityID, log.activityType)
            record.appliedActivityData.activityInfo = JSON.stringify(a.level) 
            record.appliedActivityData.activityType = a.type
            record.appliedActivityData.startDate = a.startDate
            record.appliedActivityData.endDate = a.endDate
            record.bookInfo = [] 
            for (let logBook of log.bookInfo) {
                let book = new BookInfo()
                book.bookId = logBook.bookId
                book.bookNumber = logBook.bookNumber
                book.price = logBook.price
                record.bookInfo.push(book)
            }
            record.totalPrice = log.totalPrice
            records.push(record)
        }
    } catch (error) {
        logger.error(generateMessage("", functionName, "mongoErr happens while searching book", call.request))
        res.errCode = errMongo
        callback(error,res)
    }

    res.errCode = errSuccess
    res.recordNumber = count
    res.transectionRecords = records
    callback(null,res)
}