import {Request, Response, json, Router} from 'express';

import {bookServiceClient} from '../../../common/config.js'
import {checkParameterFormat} from '../../../common/utils.js'
import {errParameter,errMicroServiceNotResponse} from '../../../common/errCode.js'
import {BookListRequest,BookListResponse} from '../../../proto/book.js'

export function registerServiceBook(): Router{
    let router = Router()
    router.get('/', json(), listBook)
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
    let bookNameOK = checkParameterFormat(req.body,"bookName","string", true)
    let tagsOK = checkParameterFormat(req.body,"tags","array:string", true)
    let priceUpperboundOK = checkParameterFormat(req.body,"priceUpperbound","number",true)
    let priceLowerboundOK = checkParameterFormat(req.body,"priceLowerbound","number",true)

    if (!checkParameterFormat(req.body,"page","number") || 
        !checkParameterFormat(req.body,"pageSize","number") ||
        !bookNameOK || !tagsOK || !priceLowerboundOK || !priceUpperboundOK){
        res.status(200).json({errCode: errParameter});
        return
    }

    const {page, pageSize, bookName, tags, priceUpperbound, priceLowerbound} = req.body;

    let grpcReq = new BookListRequest()
    grpcReq.page = Math.floor(page)
    grpcReq.pageSize = Math.floor(pageSize)
    grpcReq.bookName = bookNameOK? bookName: ""
    grpcReq.tags = tagsOK ? tags: []
    grpcReq.priceUpperbound = priceUpperboundOK? priceUpperbound:0
    grpcReq.priceLowerbound = priceLowerboundOK? priceLowerbound:0

    bookServiceClient.bookList(grpcReq,(err, response) => {
        if (err || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
            return
        } 
        res.status(200).json(new bookList(response))
        return
    })
}
