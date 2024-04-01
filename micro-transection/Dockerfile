FROM ubuntu:20.04

COPY micro-transection /home/app/micro-transection
COPY common /home/app/common
COPY proto /home/app/proto
COPY package.json /home/app/package.json

SHELL ["/bin/bash", "-c"]
RUN apt update
RUN apt install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt install  build-essential nodejs protobuf-compiler -y
WORKDIR /home/app
RUN npm install typescript -g
RUN npm install protoc-gen-ts -g
RUN npm install
RUN protoc -I="." --ts_out="."  proto/*.proto
WORKDIR /home/app/micro-transection
RUN tsc
CMD node main.js 1