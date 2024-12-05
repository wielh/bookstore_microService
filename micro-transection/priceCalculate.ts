
import {TransectionRequest, TransectionResponse, ActivityReponseData, BookInfo as BookInfoRes} from '../proto/transection.js'
import { errMongo, errSuccess} from '../common/errCode.js'
import { errorLogger } from '../common/config.js'

import * as bookDB from '../common/model/book.js'
import * as activityDB from '../common/model/activity.js'

class BookInfo {
    bookId: string
    bookNumber : number
    price: number 
}

class Answer {
    errCode: number
    totalPrice : number
    activityType : number
    activityInfo : string
    booksInfo : BookInfo[]
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
            let b = new BookInfoRes()
            b.bookId = a.bookId
            b.bookNumber = a.bookNumber
            b.price = a.price
            res.bookInfo.push(b)
        }
    }
}

async function baseCalculatePrice(req:TransectionRequest, answer:Answer): Promise<Answer> {
    let booksInfo: BookInfo[] = []
    let totalPrice: number = 0
    let bookIdSet : Set<string> = new Set();

    for (let book of req.bookInfo) {
        if (bookIdSet.has(book.bookId)) {
            return null
        }
        bookIdSet.add(book.bookId)

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
        booksInfo.push(bookRes)
        totalPrice += price * book.bookNumber
    }
    answer.booksInfo = booksInfo
    answer.totalPrice = totalPrice
    answer.errCode = errSuccess
    return answer
}

async function calculatePriceType1(req:TransectionRequest ,answer:Answer): Promise<Answer>  {
    let activity = await activityDB.findActivityType1ById(req.activityID, answer.transectionTime)
    if (activity == null) {
        return null
    }

    answer = await baseCalculatePrice(req, answer) 
    let discount = 1
    try {
        for(let level of activity.levelType1) {
            if (level.price > answer.totalPrice) {
                break
            } 
            discount = level.discount  
        }
    } catch (error) {
        errorLogger("", "Activity config error", activity,error)
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
    let activity = await activityDB.findActivityType2ById(req.activityID, answer.transectionTime)
    if (activity == null) {
        return null
    } 

    answer = await baseCalculatePrice(req,answer) 
    let discount = 0
    try {
        for(let level of activity.levelType2) {
            if (level.price > answer.totalPrice) {
                break
            } 
            discount = level.discount 
        }
    } catch (error) {
        errorLogger("", "Activity config error", activity, error)
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
    let activity = await activityDB.findActivityType3ById(req.activityID, answer.transectionTime)
    if (activity == null) {
        return null
    } 

    answer = await baseCalculatePrice(req,answer) 
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
        errorLogger("","Activity config error", activity, error)
        answer.errCode = errMongo
        return answer
    }

    answer.totalPrice -= totalDiscount
    answer.activityType = 3
    answer.activityInfo = JSON.stringify(activity) 
    return answer
}

export async function calculatePrice(req:TransectionRequest): Promise<Answer> {
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
            return await baseCalculatePrice(req, answer)
    }
}