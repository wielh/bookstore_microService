import {Port} from '../common/config.js';
import express from 'express';
import {registerRouter} from './router/router.js'
import {logger} from '../common/config.js'

var app = express();
registerRouter(app)

//start
app.listen(Port.gate, function () {
    logger.info(`Example app listening on port ${Port.gate} !`)
});
 

 