const thinkInstance = require('think-instance');

const assert = require('assert');
const helper = require('think-helper');
const Debounce = require('think-debounce');
const oracledb = require('oracledb');
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OBJECT

const debounceInstance = new Debounce();


const QUERY = Symbol('think-oracle-query');
const CONNECTION_LOST = Symbol('think-oracle-connection-lost');
const POOL = Symbol('think-oracle-pool');

const defaultOptions = {
    logger: console.log.bind(console),
    logConnect: false,
    logSql: false,
    port: 49161,
    host: '127.0.0.1',
    user: 'hr',
    password: '123456',
    database: 'xe' //SERVICE_NAME
};

/**
 * transaction status
 */
const TRANSACTION = {
    start: 1,
    end: 2
};

class OracleSocket {
    constructor(config = {}) {
        this.config = Object.assign({}, defaultOptions, config);
    }

    /**
     * get pool
     */
    get pool() {
 
        let promise = new Promise((resolve, reject) => {

            if (this[POOL]) {
                if (this.config.logConnect) {
                    this.config.logger('get pool from cache')
                }
                return resolve(this[POOL])
            }
            if (this.config.logConnect) {
                this.config.logger('try to create pool')
            }
            oracledb.createPool({
                user: this.config.user,
                password: this.config.password,
                connectString: this.config.host + ':' + this.config.port + '/' + this.config.database
            }).then((poolResult) => {
                if (this.config.logConnect) {
                    this.config.logger('connectString:' + this.config.host + ':' + this.config.port + '/' + this.config.database + ';user:' + this.config.user + ';password:' + this.config.password);
                }
                this[POOL] = poolResult;
                return resolve(poolResult)
            }).catch((err) => {
                console.log(err)
                return reject(err)
            })
        })
        return promise;
    }


    /**
     * get connection
     */
    getConnection(connection) {
        if (connection && !connection[CONNECTION_LOST]) return Promise.resolve(connection);
        let promise = new Promise((resolve, reject) => {
            this.pool.then((pool) => {
                if (pool) {
                    pool.getConnection().then((conn) => {
                        resolve(conn)
                    })
                }
            }).catch((err) => {
                reject(err)
            })
        })
        return promise;
    }

    /**
     * start transaction
     * @param {Object} connection
     */
    startTrans(connection) {
        oracledb.autoCommit = false;
        return this.getConnection();
    }

    /**
     * commit transaction
     * @param {Object} connection
     */
    commit(connection) {
        if (connection) {
            connection.transaction = TRANSACTION.end
            return connection.commit()
        }
        return this.getConnection(connection).then(connection => {
            connection.transaction = TRANSACTION.end
            return connection.commit();
        })
    }
    /**
     * rollback transaction
     * @param {Object} connection
     */
    rollback(connection) {
        return this.getConnection(connection).then(connection => {
            return connection.rollback();
        })
    }

    /**
     * release connection
     * @param {Object} connection
     */
    releaseConnection(connection) {
        let that = this;
        // if not in transaction, release connection
        if (connection.transaction !== TRANSACTION.start) {
            // connection maybe already released, so and try for it
            try {
                connection.close(function (err) {
                    if (that.config.logConnect) {
                        that.config.logger('connection has close')
                    }
                    if (err) {
                        console.error(err)
                    }
                });
            } catch (e) {}
        }
    }

    /**
     * query data
     */
    [QUERY](sqlOptions, connection, startTime) {
        if (sqlOptions.data && Array.isArray(sqlOptions.data)) {
            return connection.executeMany(sqlOptions.sql, sqlOptions.data, {
                bindDefs: sqlOptions.bindDefs
            }).catch(err => {
                return helper.isError(err) ? err : new Error(err);
            }).then(data => {
                // log sql
                if (this.config.logSql) {
                    const endTime = Date.now();
                    this.config.logger(`SQL: ${sqlOptions.sql}, Time: ${endTime - startTime}ms`);
                }
                this.releaseConnection(connection);

                if (helper.isError(data)) return Promise.reject(data);

                return data.rows || data.rowsAffected;
            });

        } else {
            return connection.execute(sqlOptions.sql, sqlOptions.data || [], {
                outFormat: oracledb.OBJECT // Return the result as Object
            }).catch(err => {
                return helper.isError(err) ? err : new Error(err);
            }).then(data => {
                // log sql
                if (this.config.logSql) {
                    const endTime = Date.now();
                    this.config.logger(`SQL: ${sqlOptions.sql}, Time: ${endTime - startTime}ms`);
                }
                this.releaseConnection(connection);

                if (helper.isError(data)) return Promise.reject(data);
                return data.rows || data.rowsAffected;
            });
        }
    }

    /**
     * query
     * @param {Object} sqlOptions
     * @param {Object} connection
     */
    query(sqlOptions, connection) {
        if (helper.isString(sqlOptions)) {
            sqlOptions = {
                sql: sqlOptions
            };
        }
        if (sqlOptions.debounce === undefined) {
            if (this.config.debounce !== undefined) {
                sqlOptions.debounce = this.config.debounce;
            } else {
                sqlOptions.debounce = true;
            }
        }
        const startTime = Date.now();
        return this.getConnection(connection).then(connection => {
            // set transaction status to connection
            if (sqlOptions.transaction) {
                if (sqlOptions.transaction === TRANSACTION.start) {
                    if (connection.transaction === TRANSACTION.start) return;
                } else if (sqlOptions.transaction === TRANSACTION.end) {
                    if (connection.transaction !== TRANSACTION.start) {
                        this.releaseConnection(connection);
                        return;
                    }
                }
                connection.transaction = sqlOptions.transaction;
            }

            if (sqlOptions.debounce) {
                const key = JSON.stringify(sqlOptions);
                return debounceInstance.debounce(key, () => {
                    return this[QUERY](sqlOptions, connection, startTime);
                });
            } else {
                return this[QUERY](sqlOptions, connection, startTime);
            }
        });
    }

    /**
     * execute
     * @param  {Array} args []
     * @returns {Promise}
     */
    execute(sqlOptions, connection) {
        if (helper.isString(sqlOptions)) {
            sqlOptions = {
                sql: sqlOptions
            };
        }
        sqlOptions.debounce = false;
        return this.query(sqlOptions, connection);
    }
}
module.exports = thinkInstance(OracleSocket);