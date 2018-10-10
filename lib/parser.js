const helper = require('think-helper');
const {
  Parser
} = require('think-model-abstract');

module.exports = class OracleParser extends Parser {
  /**
   * parse key
   * @param  {String} key []
   * @return {String}     []
   */
  parseKey(key = '') {
    key = key.trim();
    if (helper.isEmpty(key)) return '';
    if (helper.isNumberString(key)) return key;
    // if (!(/[,'"*()`.\s]/.test(key))) {
    //   key = '`' + key + '`';
    // }
    return key;
  }
  /**
   * escape string
   * @param  {String} str []
   * @return {String}     []
   */
  escapeString(str) {
    if (!str) return '';

    // eslint-disable-next-line no-control-regex
    return str.replace(/[\0\n\r\b\t\\'"\x1a]/g, s => {
      switch (s) {
        case '\0':
          return '\\0';
        case '\n':
          return '\\n';
        case '\r':
          return '\\r';
        case '\b':
          return '\\b';
        case '\t':
          return '\\t';
        case '\x1a':
          return '\\Z';
        default:
          return '\\' + s;
      }
    });
  }

  /**
   * parse sql
   * @param  {String} sql     []
   * @param  {Object} options []
   * @return {String}         []
   */
  parseSql(sql, options) {
    let selectSql = sql.replace(/%([A-Z]+)%/g, (a, type) => {
      type = type.toLowerCase();
      const ucfirst = type[0].toUpperCase() + type.slice(1);
      if (helper.isFunction(this['parse' + ucfirst])) {
        return this['parse' + ucfirst](options[type] || '', options);
      }
      return a;
    }).replace(/\s__([A-Z_-]+)__\s?/g, (a, b) => {
      return ' `' + this.config.prefix + b.toLowerCase() + '` ';
    });

    let limit = options.limit
    if (limit) {
      return this.parseLimit(selectSql, limit)
    }

    return selectSql;
  }

  /**
   * 处理oracle 分页
   * @param {} options 
   */
  parseLimit(selectSql, limit) {

    if (helper.isEmpty(limit)) return '';
    if (helper.isNumber(limit)) {
      limit = Math.max(limit, 0);
      return ` SELECT * FROM  ( ${selectSql} ) WHERE ROWNUM = ${limit}`;
    }
    if (helper.isString(limit)) {
      limit = limit.split(/\s*,\s*/);
    }
    const data = [Math.max(limit[0] | 0, 0)];
    if (limit[1]) {
      data.push(Math.max(limit[1] | 0, 0));
    }
    const sql = `
      SELECT *
      FROM (SELECT ROWNUM AS rowno,r.*
                FROM(  ${selectSql}
                        ) r
                where ROWNUM <= ${data[1]+data[0]}
                ) table_alias
      WHERE table_alias.rowno > ${data[0]}
      `;
    return sql;
  }

  /**
   * get select sql
   * @param  {Object} options []
   * @return {String}         [sql string]
   */
  buildSelectSql(options) {
    const sql = '%EXPLAIN%SELECT%DISTINCT% %FIELD% FROM %TABLE%%JOIN%%WHERE%%GROUP%%HAVING%%ORDER%%UNION%%LOCK%%COMMENT%';
    return this.parseSql(sql, options);
  }

   /**
   * build update sql
   * @param {Object} options
   */
  buildUpdateSql(data, options) {
    const set = this.parseSet(data);
    const sql = `UPDATE %TABLE%${set}%WHERE%%ORDER%%LOCK%%COMMENT%`;
    return this.parseSql(sql, options);
  }

  /**
   * build delete sql
   * @param {Object} options
   */
  buildDeleteSql(options) {
    const sql = `DELETE FROM %TABLE%%WHERE%%ORDER%%LOCK%%COMMENT%`;
    return this.parseSql(sql, options);
  }
};