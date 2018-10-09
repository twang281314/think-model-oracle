const {
    test
} = require('ava');
const mock = require('mock-require');
const Socket = require('../lib/socket');


const sql2='select * from hr.test'


// test('getConnection', async t => {
//     t.plan(3);
//     const socket = new Socket();
//     t.is(await socket.getConnection(2), 2);
//     socket.pool.then((pool)=>{
//         pool.getConnection()
//     })
//     t.is(socket.getConnection(), 3);  
// });

test('execute', async t => {
    let oracleSocket = new Socket();
    let result = await oracleSocket.query({
        sql: 'delete from hr.test',
    })
    console.log(JSON.stringify(result))
    t.pass();
});


test('trans', async t => {
    let oracleSocket = new Socket();

    let connection = await oracleSocket.startTrans()
    for (let i =10; i <= 200; i++) {
        let result = await oracleSocket.execute({
            sql: 'INSERT INTO hr.test VALUES (:id, :name)',
            data: 
              {
                id:{
                    val:i
                },
                name:{
                    val:'tao'
                }
              }
            ,
            transaction:1
        }, connection)
        console.log(result)
    }
    await oracleSocket.commit(connection)
    t.pass();
})

// test('addMany', async t => {

//     let oracleSocket = new Socket();

//     let dataArray = [];

//     // let connection = await oracleSocket.startTrans()
//     for (let i = 0; i <= 100000; i++) {
//         dataArray.push({
//             id: i + 1,
//             name: 'anytao'
//         })
//     }

//     let result = await oracleSocket.execute({
//         sql: 'INSERT INTO hr.test VALUES (:id, :name)',
//         data: dataArray
//     })
//     t.pass();
// })

// test('commit', async t => {

//     let oracleSocket = new Socket();
//     let result = await  oracleSocket.commit()
//     let result2 = await oracleSocket.query({
//         sql: 'select* from hr.employees'
//     })
//     console.log(result)
//     t.pass();
// })