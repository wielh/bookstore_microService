import {Request, Response, json, Router} from 'express';

import {bookServiceClient} from '../../../common/config.js'
import {checkParameterFormat} from '../../../common/utils.js'
import {errParameter,errMicroServiceNotResponse} from '../../../common/errCode.js'
import {BookListRequest} from '../../../proto/book.js'

export function registerServiceBook(): Router{
    let router = Router()
    router.post('/', json(), listBook)
    return router
}

async function listBook(req:Request, res:Response):Promise<void> {
    let bookNameOK = checkParameterFormat(req.body,"bookName","string", true)
    let tagsOK = checkParameterFormat(req.body,"tags","array:string", true)
    let priceUpperboundOK = checkParameterFormat(req.body,"priceUpperbound","int",true)
    let priceLowerboundOK = !checkParameterFormat(req.body,"priceLowerbound","int",true)
    if (!checkParameterFormat(req.body,"page","int") || 
        !checkParameterFormat(req.body,"pageSize","int") ||
        !bookNameOK || !tagsOK || !priceLowerboundOK || !priceUpperboundOK){
        res.status(200).json({errCode: errParameter});
    }

    const {page, pageSize, bookName, tags, priceUpperbound, priceLowerbound} = req.body;

    let grpcReq = new BookListRequest()
    grpcReq.page = page
    grpcReq.pageSize = pageSize
    grpcReq.bookName = bookNameOK? bookName: ""
    grpcReq.tags = tagsOK ? tags: []
    grpcReq.priceUpperbound = priceUpperboundOK? priceUpperbound:0
    grpcReq.priceLowerbound = priceLowerboundOK? priceLowerbound:0

    bookServiceClient.list(grpcReq,(err, response) => {
        if (err || !response) {
            res.status(500).json({errCode: errMicroServiceNotResponse});
        } 
        res.status(200).json(response)
    })
}
