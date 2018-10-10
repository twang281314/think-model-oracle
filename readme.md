

https://github.com/oracle/node-oracledb

https://oracle.github.io/node-oracledb/doc/api.html

## 安装Oracle Instant Client

``` shell
cd /opt
mkdir oracle
cd oracle
git  clone https://gitee.com/anytao/Oracle-Instant-Client.git
cd Oracle-Instant-Client
unzip instantclient-basic-linux.x64-18.3.0.0.0dbru.zip 
unzip instantclient-sdk-linux.x64-18.3.0.0.0dbru.zip

mv instantclient_18_3  instantclient

mv instantclient /opt/oracle/instantclient

cd instantclient

sudo sh -c "echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf"

sudo ldconfig

```

##  设置环境变量  
```
vi /etc/profile  

```
编辑内容如下  
```
export LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH  
export OCI_LIB_DIR=/opt/oracle/instantclient  
export OCI_INC_DIR=/opt/oracle/instantclient/sdk/includ  

```
保存退出  

