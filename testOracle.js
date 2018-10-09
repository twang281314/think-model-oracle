var oracledb = require('oracledb');
console.log("Oracle client library version number is " + oracledb.oracleClientVersion);
var config = {
  user:'ods',　　//用户名
  password:'ods',　　//密码
  //IP:数据库IP地址，PORT:数据库端口，SCHEMA:数据库名称
  connectString : "192.168.30.198:1521/epdw"
};

oracledb.createPool(config).then((pool)=>{
    pool.getConnection(function(err, connection) {

        connection.execute("select* from ODS.O_GOODS_BRAND").then((result)=>{
           console.log(JSON.stringify(result.rows))
        })

    });
})
   




// oracledb.getConnection(
//   config,
//   function(err, connection)
//   {
//     if (err) {
//       console.error(err.message);
//       return;
//     }
// 　　//查询某表十条数据测试，注意替换你的表名
//     connection.execute("select* from v$version",
//       function(err, result)
//       {
//         if (err) {
//           console.error(err.message);
//           doRelease(connection);
//           return;
//         }
//         console.log(result)
//         //打印返回的表结构
//         console.log(result.metaData);
//         //打印返回的行数据
//         console.log(result.rows);
//       });
//   });

// function doRelease(connection)
// {
//   connection.close(
//     function(err) {
//       if (err) {
//         console.error(err.message);
//       }
//     });
// }
