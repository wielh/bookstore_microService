import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml'


import {BookServiceClient} from '../proto/book.js'
import {TransectionServiceClient} from '../proto/transection.js'

import {createLogger, Logger, transports, format} from 'winston'
import {credentials} from '@grpc/grpc-js'
import {connect, Connection} from 'amqplib'
import {createTransport} from 'nodemailer'
import mongoose from 'mongoose'
import {google}  from "googleapis";
import {OAuth2Client} from 'google-auth-library';
import {Client} from '@elastic/elasticsearch';

interface URL {
  localIP: string,
  dockerIP: string,
  dockerComposeIP : string
  port: number
}

interface Config {
  API: {
    tokenKey: string
    tokenExpireSecond: number
  }
  googleOauth2: {
    googleVerifyID: string
    googlePassword: string
    websiteEmail: string
  }
  elastic: URL,
  rabbitMQ: {
    username:string
    password:string
    url: URL
    ChannelName: {
      getVerificationCode:string
    }
  }
  MongoDB: {
    username:string
    password:string
    url: URL
    dbName: string
    directConnection: boolean
    serverSelectionTimeoutMS: number
    authSource: string
  }
  gate: {
    localIP:string,
    port: number
  }
  microAccount: URL
  microBook: URL
  microTransection: URL
  microMail: {
    url: URL,
    sendMailport: number
  }
}

export enum accountType {
  normal = 0,
  google = 1
}

var mode: number
export var GlobalConfig : Config

export var gateURL: string
export var googleCallbackUrl: string
export var oauth2Client:OAuth2Client
export var googleVerificationUrl: string
export var elasticClient: Client
export var log: Logger

export var rabbitMQConenctionStr: string
export var accountServiceURL: string
export var transectionServiceURL: string
export var bookServiceURL:string

function loadConfig() {
    try {
      const fullPath = path.resolve('config.yaml');
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      GlobalConfig = parse(fileContent) as Config;
    } catch (error) {
      throw new Error(`Failed to load YAML file: ${error.message}`);
    }
}

function getIPMode() {
  const args: string[] = process.argv;
  try {
    let type = parseInt(args[2])
    switch(type) {
        case 1:
            mode = 1
            break
        case 2:
            mode = 2
            break
        default:
            mode = 0 
            break
    }
  } catch (error) {
      mode = 0 
      return
  }
}

function getUrl(url:URL):string {
  switch(mode){
    case 1:
      return `${url.dockerIP}:${url.port}`
    case 2:
      return `${url.dockerComposeIP}:${url.port}`
    default:
      return `${url.localIP}:${url.port}`
  }
}

async function urlInit() {
  const gc = GlobalConfig
  gateURL = `${gc.gate.localIP}:${gc.gate.port}`
  googleCallbackUrl =  `http://${gateURL}/account/google_callback`
  oauth2Client = new google.auth.OAuth2( gc.googleOauth2.googleVerifyID, gc.googleOauth2.googlePassword, googleCallbackUrl)
  googleVerificationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ["email","profile"],
      include_granted_scopes: true
  });

  try {
    let mongoStr = `mongodb://${gc.MongoDB.username}:${gc.MongoDB.password}@${getUrl(gc.MongoDB.url)}`
    await mongoose.connect(mongoStr, {
      dbName: gc.MongoDB.dbName, 
      readPreference:"secondaryPreferred",  
      directConnection: gc.MongoDB.directConnection , 
      serverSelectionTimeoutMS: gc.MongoDB.serverSelectionTimeoutMS, 
      authSource: gc.MongoDB.authSource
    })
  } catch(error) {
      console.error('Error connecting to MongoDB with host:', error);
  } 

  elasticClient = new Client({node: `http://${getUrl(gc.elastic)}`, maxRetries:3});
  log = createLogger({
      level: 'info',
      format: format.json(),
      transports: [new transports.Console()],
  });

  rabbitMQConenctionStr = `amqp://${gc.rabbitMQ.username}:${gc.rabbitMQ.password}@${getUrl(gc.rabbitMQ.url)}/`;

  accountServiceURL = getUrl(GlobalConfig.microAccount)
  transectionServiceURL = getUrl(GlobalConfig.microTransection)
  bookServiceURL = getUrl(GlobalConfig.microBook)
}

async function start() {
  loadConfig()
  getIPMode()
  await urlInit()
}

await start()
