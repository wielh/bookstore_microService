import {Request, Response, Router} from 'express';
import { query, validationResult } from 'express-validator';

import {bookServiceClient} from '../../../common/config.js'
import {errParameter,errMicroServiceNotResponse} from '../../../common/errCode.js'
import {BookListRequest,BookListResponse} from '../../../proto/book.js'
import {castToString, castToStringArray} from '../../../common/utils.js'

export function registerServiceBook(): Router{
    let router = Router()
    router.get(
        '/', 
        [
            query("page").isInt({ min: 0 }).withMessage("field page should be int and val>=0"),
            query("pageSize").isInt({ min: 1 }).withMessage("field pageSize should be int and val>=0"),
        ],
        listBook
    )
    return router
}

class bookList {
    errcode:number
    bookdata:{
        totalNumber:number
        page:number
        pageSize:number
        books:{
            ID:string
            name:string
            price:number
            remainNumber:number
            tags:string[];
        }[]
    }

    constructor(res:BookListResponse) {
        this.errcode = res.errcode
        if (!res.has_bookdata) {
            return
        }

        this.bookdata = {
            totalNumber: res.bookdata.totalBookNumber,
            page: res.bookdata.page,
            pageSize: res.bookdata.pageSize,
            books:[]
        }

        for (let book of res.bookdata.books) {
            this.bookdata.books.push({
                ID:book.ID,
                name:book.name,
                price:book.price,
                remainNumber:book.remainNumber,
                tags:book.tags
            })
        }
    }
}

async function listBook(req:Request, res:Response):Promise<void> {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400).json({ errorCode:errParameter, errors: errors.array() });
       return
    }

    const {page, pageSize, bookName, tags, priceUpperbound, priceLowerbound} = req.query;

    let grpcReq = new BookListRequest()
    grpcReq.page = Math.floor(parseInt(castToString(page), 10))
    grpcReq.pageSize = Math.floor(parseInt(castToString(pageSize), 10))
    grpcReq.bookName = castToString(bookName)

    let array = castToStringArray(tags)
    grpcReq.tags = array
    let i = parseInt(castToString(priceUpperbound), 10);
    grpcReq.priceUpperbound = Number.isInteger(i)? i:0
    i = parseInt(castToString(priceLowerbound), 10);
    grpcReq.priceLowerbound = Number.isInteger(i)? i:0

    bookServiceClient.bookList(grpcReq,(err, response) => {
        if (err || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
            return
        } 
        res.status(200).json(new bookList(response))
        return
    })
}
