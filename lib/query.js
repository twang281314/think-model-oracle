const {
    Query
} = require('think-model-abstract');
const OracleSocket = require('./socket.js');

/**
 * mysql query
 */
module.exports = class OracleQuery extends Query {
    /**
     * get socket
     * @param {String|Object} sql
     */
    socket(sql) {
        return super.socket(sql, OracleSocket);
    }
    /**
     * query sql
     * @param {Object} sqlOptions
     * @param {Object} connection
     */
    query(sqlOptions, connection) {
        return super.query(sqlOptions, connection).then(data => {
            let tempData = [];
            if (data && data.length > 0) {

                for (let item of data) {
                    tempData.push(this.lowerJSONKey(item))
                }
            }
            return tempData;
        });
    }

    /**
     * execute sql
     */
    execute(sqlOptions, connection) {
        return super.execute(sqlOptions, connection).then(data => {
            if (data.insertId) {
                this.lastInsertId = data.insertId;
            }
            return data.affectedRows || 0;
        });
    }

    lowerJSONKey(jsonObj) {
        for (var key in jsonObj) {
            jsonObj[key.toLowerCase()] = jsonObj[key];
            delete(jsonObj[key]);
        }
        return jsonObj;
    }

    addMany(data, options) {

        const fields = Object.keys(data[0]).map(item => {
            return ':' + item
        })
        const insertSql = 'insert into  ' + options.table + ' values (' + fields.join(',') + ')'

        options.data = data
        options.sql = insertSql;
        console.log(insertSql)
        return this.execute(options).then((result) => {
            return data;
        })
    }
};