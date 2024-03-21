import * as grpc from "@grpc/grpc-js";
import { logger, bookServiceIP,mongooseConnection } from '../common/config.js'
import {Book, BookListRequest, BookListResponse,UnimplementedBookServiceService, BookData} from "../proto/book.js";
import {errMongo, errSuccess} from '../common/errCode.js'
import {generateMessage,pageX} from '../common/utils.js'
import * as bookDB from '../common/dbStructure/book.js'

async function bookList(call: grpc.ServerUnaryCall<BookListRequest, BookListResponse>, callback: grpc.sendUnaryData<BookListResponse>){
    let functionName:string = "bookList"
    let req = call.request
    let res = new BookListResponse()
    let bookCount = 0 

    try {
        bookCount = await bookDB.count(req.bookName, req.tags, req.priceLowerbound, req.priceUpperbound)
    } catch (error) {
        logger.error(generateMessage("", functionName, "mongoErr happens while searching book", JSON.stringify({"req": req})))
        res.errcode = errMongo
        callback(null,res)
    }

    let pageConfig = new pageX(req.pageSize, bookCount)
    let books: Book[] = []
    let book: Book
    try {
        let data = await bookDB.getbookData(req.bookName,req.tags,req.priceLowerbound,req.priceUpperbound, req.pageSize, req.page, bookCount)
        for(let bookData of data) {
            if (bookData.price <= 0 || bookData.remainNumber <=0 ){
                continue
            }
            book = new Book()
            book.ID = bookData._id.toString()
            book.name = bookData.bookName
            book.price =  bookData.price
            book.remainNumber = bookData.remainNumber
            book.tags = bookData.tags
            books.push(book)
        }
    } catch (error) {
        logger.error(generateMessage("", functionName, "mongoErr happens while searching book",  JSON.stringify({"req": req})))
        res.errcode = errMongo
        callback(null,res)
    }

    res.errcode = errSuccess
    let bookdata = new BookData()
    bookdata.page = pageConfig.getPageNumber(req.page)
    bookdata.pageSize = pageConfig.getPageSize()
    bookdata.totalBookNumber = bookCount
    bookdata.books = books
    res.bookdata = bookdata
    callback(null,res)
}

await mongooseConnection()
const server = new grpc.Server();
server.addService( UnimplementedBookServiceService.definition, {bookList})
server.bindAsync( bookServiceIP , grpc.ServerCredentials.createInsecure(), 
(err: Error | null, port: number) => {
    if (err) {
      console.error(`Server error: ${err.message}`);
    } else {
       console.log(`Server run on port: ${port}`)
    }
  }
);
