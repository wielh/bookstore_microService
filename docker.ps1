docker network create --driver bridge --subnet 172.22.0.0/16 --gateway 172.22.0.1 bookstore_network 

docker pull rabbitmq:management
docker build -f  gate\Dockerfile -t gate .
docker build -f  micro-account\Dockerfile -t micro-account .
docker build -f  micro-mail\Dockerfile -t micro-mail .
docker build -f  micro-book\Dockerfile -t micro-book .
docker build -f  micro-transection\Dockerfile -t micro-transection .

docker run -it -d --name rabbitMQ-container-0 -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=root -e RABBITMQ_DEFAULT_PASS=1234 --network bookstore_network rabbitmq:management
docker run -it -d --name micro-mail-container --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 9504:9504 micro-mail
docker run -it -d --name micro-account-container --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 9501:9501  micro-account
docker run -it -d --name micro-book-container --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 9502:9502 micro-book
docker run -it -d --name micro-transection-container --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 9503:9503 micro-transection
docker run -it -d --name gate-container --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 3000:3000 gate