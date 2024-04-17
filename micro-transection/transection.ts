
import {ServerUnaryCall, sendUnaryData} from "@grpc/grpc-js";
import mongoose from 'mongoose'

import {TransectionRequest, TransectionResponse, TransectionRecordRequest, TransectionRecordResponse, TransectionRecord, ActivityReponseData, BookInfo} from '../proto/transection.js'
import { errorLogger, warnLogger, InfoLogger} from '../common/config.js'
import { errMongo, errSuccess, errUserNotExist, errGoldNotEnought, errUpdateIncomeFailed, errBookNotEnought} from '../common/errCode.js'
import { pageX} from '../common/utils.js'
import * as bookDB from '../common/dbStructure/book.js'
import * as userDB from '../common/dbStructure/user.js'
import * as transectionDB from '../common/dbStructure/transection.js'
import * as activityDB from '../common/dbStructure/activity.js'

class BookInf {
    bookId: string
    bookNumber : number
    price: number 
}

class Answer {
    errCode: number
    totalPrice : number
    activityType : number
    activityInfo : string
    booksInfo : BookInf[]
    transectionTime :number

    public toTransectionResponse(res:TransectionResponse) {
        res.errCode = this.errCode
        res.totalPrice = this.totalPrice
        res.transectionTime = this.transectionTime
        res.appliedActivityData = new ActivityReponseData()
        res.appliedActivityData.activityInfo = this.activityInfo
        res.appliedActivityData.activityType = this.activityType
        res.bookInfo = []
        for (let a of this.booksInfo) {
            let b = new BookInfo()
            b.bookId = a.bookId
            b.bookNumber = a.bookNumber
            b.price = a.price
            res.bookInfo.push(b)
        }
    }
}

async function normalCalculatePrice(req:TransectionRequest, answer:Answer): Promise<Answer> {
    let booksInfo: BookInf[] = []
    let totalPrice: number = 0
    let bookIdSet : Set<string> = new Set();

    for (let book of req.bookInfo) {
        if (bookIdSet.has(book.bookId)) {
            return null
        }
        bookIdSet.add(book.bookId)

        let bookRes = new BookInf()
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
        booksInfo.push(bookRes)
        totalPrice += price * book.bookNumber
    }
    answer.booksInfo = booksInfo
    answer.totalPrice = totalPrice
    answer.errCode = errSuccess
    return answer
}

async function calculatePriceType1(req:TransectionRequest ,answer:Answer): Promise<Answer>  {
    let functionName = "calculatePriceType1"
    answer = await normalCalculatePrice(req, answer) 
    let activity = await activityDB.findActivityType1ById(req.activityID, answer.transectionTime)
    if (activity == null) {
        return null
    }

    let discount = 1
    try {
        for(let level of activity.levelType1) {
            if (level.price > answer.totalPrice) {
                break
            } 
            discount = level.discount 
        }
    } catch (error) {
        errorLogger("", functionName, "Activity config error", activity,error)
        answer.errCode = errMongo
        return answer
    }

    if (discount >= 0 && discount <=1) {
        answer.totalPrice = Math.floor(answer.totalPrice * discount) 
    } 
    answer.activityType = 1
    answer.activityInfo = JSON.stringify(activity) 
    return answer
}

async function calculatePriceType2(req:TransectionRequest, answer:Answer): Promise<Answer>  {
    let functionName = "calculatePriceType2"
    answer = await normalCalculatePrice(req,answer) 
    let activity = await activityDB.findActivityType2ById(req.activityID, answer.transectionTime)
    if (activity == null) {
        return null
    } 

    let discount = 0
    try {
        for(let level of activity.levelType2) {
            if (level.price > answer.totalPrice) {
                break
            } 
            discount = level.discount 
        }
    } catch (error) {
        errorLogger("", functionName, "Activity config error", activity, error)
        answer.errCode = errMongo
        return answer
    }

    if (discount >= 0 && discount <= answer.totalPrice) {
        answer.totalPrice = answer.totalPrice - discount
    } 
    answer.activityType = 2
    answer.activityInfo = JSON.stringify(activity) 
    return answer
}

async function calculatePriceType3(req:TransectionRequest, answer:Answer): Promise<Answer>  {
    let functionName = "calculatePriceType3"
    answer = await normalCalculatePrice(req,answer) 
    let activity = await activityDB.findActivityType3ById(req.activityID, answer.transectionTime)
    if (activity == null) {
        return null
    } 

    let totalDiscount = 0
    try {
       for(let bookInfo of answer.booksInfo) {
         for (let level of activity.levelType3) {
            let contain = false
            for (let id in level.bookIds) {
                if (level.bookIds[id] == bookInfo.bookId) {
                    contain = true
                    break;
                }
            }
            if (!contain) {
                continue
            }

            let by:number = level.by
            let give:number = level.give
            if (by <= 0 || give <= 0) {
                continue
            }
            let book = await bookDB.getBookById(bookInfo.bookId)
            if( book == null) {
                continue
            }
            let bookPrice:number = book.price
            if (bookPrice <= 0) {
                continue
            }
            totalDiscount += bookPrice * Math.floor(bookInfo.bookNumber / by) * give
         }
       }
    } catch (error) {
        errorLogger("", functionName, "Activity config error", activity,error)
        answer.errCode = errMongo
        return answer
    }

    answer.totalPrice -= totalDiscount
    answer.activityType = 3
    answer.activityInfo = JSON.stringify(activity) 
    return answer
}

async function calculatePrice(req:TransectionRequest): Promise<Answer> {
    let answer = new Answer()
    answer.transectionTime = new Date().getTime()
    switch (req.activityType){
        case 1:
            return await calculatePriceType1(req, answer)
        case 2:
            return await calculatePriceType2(req, answer)
        case 3:
            return await calculatePriceType3(req, answer)
        default:
            answer.activityInfo = ""
            answer.activityType = 0
            return await normalCalculatePrice(req, answer)
    }
}

export async function transection(call: ServerUnaryCall<TransectionRequest,TransectionResponse>, callback: sendUnaryData<TransectionResponse>) {
    let res:TransectionResponse = new TransectionResponse()
    let functionName:string = "transection"
    let req = call.request
    InfoLogger(req.username, functionName, "A new transection request started", call.request)

    let userExist = false
    try {
        userExist = await userDB.userExist(req.username, req.userType)
        if (!userExist) {
            res.errCode = errUserNotExist
            callback(null,res)
            return
        }
    } catch (error) {
        errorLogger("", functionName, "A mongoErr happens while searching user", call.request, error)
        res.errCode = errMongo
        callback(error,res)
        return
    }
    // 1. 算錢
    let answer = await calculatePrice(req)
    if (answer == null) {
        errorLogger(req.username, functionName, "Format of request is incorrect", call.request, "")
        callback(null,res)
        return
    } else if (answer.errCode != errSuccess) {
        callback(null,res)
        return
    }
    answer.toTransectionResponse(res)

    // 2. writeDB
    const session = await mongoose.startSession();
    let success = false
    try { 
        session.startTransaction();
        success = await userDB.transection(req.username, req.userType, answer.totalPrice, session)
        if (!success) {
            res.errCode = errGoldNotEnought
            warnLogger(req.username, functionName, "Gold not enought", call.request, "")
            await session.abortTransaction()
            callback(null,res)
            return
        }
        for (let book of req.bookInfo) {
            success = await bookDB.takeBooks(book.bookId, book.bookNumber, session)
            if (!success) {
                res.errCode = errBookNotEnought
                warnLogger(req.username, functionName, "Book not enought", call.request, "")
                await session.abortTransaction()
                callback(null,res)
                return
            }
        }
        await transectionDB.insertLog(req.username, req.userType, req.activityID,  req.activityType, answer.transectionTime, answer.totalPrice, answer.booksInfo, session) 
        success = await transectionDB.updateBalance(answer.transectionTime, answer.totalPrice, session)
        if (!success) {
            res.errCode = errUpdateIncomeFailed
            errorLogger(req.username, functionName, "Update balance failed", req, "")
            await session.abortTransaction()
            callback(null,res)
            return
        }
        await session.commitTransaction()
    } catch (error) {
        errorLogger(req.username, functionName, "A mongoErr happens while searching user", req, error)
        await session.abortTransaction()
        res.errCode = errMongo
        callback(error,res)
        return
    } finally {
        await session.endSession()
    }

    res.errCode = errSuccess
    InfoLogger(req.username, functionName, "A new transection request end", [req, res])
    callback(null,res)
}

export async function transectionRecord(call: ServerUnaryCall<TransectionRecordRequest, TransectionRecordResponse>, callback: sendUnaryData<TransectionRecordResponse>) {
    let functionName:string = "TransectionRecord"
    let req = call.request
    let res = new TransectionRecordResponse()
    let count = 0 
    try {
        count = await transectionDB.countLog(req.username ,req.accountType)
    } catch (error) {
        errorLogger(req.username, functionName, "mongoErr happens while counting transection log", req, error)
        res.errCode = errMongo
        callback(error,res)
    }

    let records: TransectionRecord[] = []
    let record: TransectionRecord
    let p = new pageX(req.pageSize, count)
    try {
        let logs = await transectionDB.getLogData(req.username, req.accountType, p, req.page)
        for (let log of logs) {
            record = new TransectionRecord()
            record.transectionTime = log.time
            record.appliedActivityData = new ActivityReponseData()      
            try {
                let a = await activityDB.findActivityById(log.activityID, log.activityType)
                switch(a.type) {
                    case 1:
                        record.appliedActivityData.activityInfo = JSON.stringify(a.levelType1) 
                        record.appliedActivityData.activityType = a.type
                        record.appliedActivityData.startDate = a.startDate
                        record.appliedActivityData.endDate = a.endDate
                        break;
                    case 2:
                        record.appliedActivityData.activityInfo = JSON.stringify(a.levelType2) 
                        record.appliedActivityData.activityType = a.type
                        record.appliedActivityData.startDate = a.startDate
                        record.appliedActivityData.endDate = a.endDate
                        break;
                    case 3:
                        record.appliedActivityData.activityInfo = JSON.stringify(a.levelType3) 
                        record.appliedActivityData.activityType = a.type
                        record.appliedActivityData.startDate = a.startDate
                        record.appliedActivityData.endDate = a.endDate
                        break;
                    default :
                        record.appliedActivityData.activityInfo = ""
                }
            } catch(err) {
                record.appliedActivityData.activityInfo = ""
            }
            
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
        errorLogger(req.username, functionName, "mongoErr happens while searching transection log", call.request,error)
        res.errCode = errMongo
        callback(error,res)
    }

    res.errCode = errSuccess
    res.recordNumber = count
    res.page = p.getPageNumber(req.page)
    res.pageSize = p.pageSize
    res.transectionRecords = records
    callback(null,res)
}