var oracledb = require('oracledb');
console.log("Oracle client library version number is " + oracledb.oracleClientVersion);
var config = {
  user:'system',　　//用户名
  password:'oracle',　　//密码
  //IP:数据库IP地址，PORT:数据库端口，SCHEMA:数据库名称
  connectString : "localhost:49161/xe"
};

oracledb.createPool(config).then((pool)=>{
    pool.getConnection(function(err, connection) {
        if(err){
          console.log(err)
        }
        connection.execute("select * from  HR.EMPLOYEES WHERE ROWNUM<10").then((result)=>{
           console.log(result.rows)
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
