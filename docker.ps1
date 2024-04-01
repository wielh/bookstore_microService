docker network create --driver bridge --subnet 172.22.0.0/16 --gateway 172.22.0.1 bookstore_network 

docker pull rabbitmq:management
docker build -f  gate\Dockerfile -t gate .
docker build -f  micro-account\Dockerfile -t micro-account .
docker build -f  micro-mail\Dockerfile -t micro-mail .
docker build -f  micro-book\Dockerfile -t micro-book .
docker build -f  micro-transection\Dockerfile -t micro-transection .

docker run -it -d -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=root -e RABBITMQ_DEFAULT_PASS=1234 --network bookstore_network --ip 172.22.0.6 rabbitmq:management
docker run -it -d --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 3000:3000 --ip 172.22.0.2 gate
docker run -it -d --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 9501:9501 --ip 172.22.0.3 micro-account
docker run -it -d --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 9502:9502 --ip 172.22.0.4 micro-book
docker run -it -d --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 9503:9503 --ip 172.22.0.5 micro-transection
docker run -it -d --network bookstore_network --add-host=host.docker.abc:192.168.0.14 -p 9504:9504 --ip 172.22.0.7 micro-mail