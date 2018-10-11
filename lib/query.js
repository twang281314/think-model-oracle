const {
    Query
} = require('think-model-abstract');
const OracleSocket = require('./socket.js');
const oracledb = require('oracledb');
const helper = require('think-helper');

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
            return data || 0;
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
        const bindDefs = {};
        const fields = Object.keys(data[0]).map(item => {
            let bindDef = {
                type: oracledb.STRING,
                maxSize: 10
            }
            if (data[0][item]) {
                bindDef.maxSize = data[0][item].length * 2
            }
            if (helper.isNumber(data[0][item])) {
                bindDef.type = oracledb.NUMBER
            } else if (helper.isDate(data[0][item])) {
                bindDef.type = oracledb.DATE
            } else if (!isNaN(Date.parse(data[0][item]))) {
                bindDef.type = oracledb.DATE
            }
            bindDefs[item] = bindDef
            return ':' + item
        })
        const dateFieldsKey = []
        Object.keys(bindDefs).map(item => {
            if (bindDefs[item].type == oracledb.DATE) {
                dateFieldsKey.push(item)
            }
        })

        if (dateFieldsKey.length > 0) {
            for (let item of data) {
                dateFieldsKey.forEach(fieldKey => {
                    item[fieldKey] = new Date(item[fieldKey])
                })
            }
        }

        const insertSql = 'insert into  ' + options.table + ' values (' + fields.join(',') + ')'

        options.data = data
        options.sql = insertSql;
        options.bindDefs = bindDefs
       
        return this.execute(options).then((result) => {
            return result;
        })
    }

    add(data, options) {
        let tempData = []
        tempData.push(data)
        return this.addMany(tempData, options)
    }
};