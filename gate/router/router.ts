
import {Express, Request, Response,NextFunction} from 'express'

import {registerServiceAccount} from './action/account.js'
import {registerServiceBook} from './action/book.js'
import {registerServiceTransection} from './action/transection.js'
import {errorLogger} from '../../common/config.js';
import {errUnknown} from '../../common/errCode.js'

export function registerRouter(app: Express){
    app.use('/account', registerServiceAccount())
    app.use('/book', registerServiceBook())
    app.use('/transection', registerServiceTransection())
    app.use((error:Error, req:Request, res:Response, next: NextFunction)=>{
        errorLogger("errorHandler", "app.use", "An unexpected error happens,reason:\n", req, error)
        res.status(500).json({errCode: errUnknown})
    })
}




