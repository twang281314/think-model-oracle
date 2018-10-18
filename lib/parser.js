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
   * parse table
   * @param  {Mixed} tables []
   * @return {}        []
   */
  parseTable(table, options = {}) {
    table = table.toUpperCase()
    if (helper.isString(table)) {
      if (options.alias) {
        return `${this.parseKey(table)}  ${options.alias}`;
      }
      table = table.split(/\s*,\s*/);
    }
    if (helper.isArray(table)) {
      return table.map(item => this.parseKey(item)).join(',');
    } else if (helper.isObject(table)) {
      const data = [];
      for (const key in table) {
        data.push(this.parseKey(key) + ' ' + this.parseKey(table[key]));
      }
      return data.join(',');
    }
    return '';
  }

  /**
   * parse value
   * @param  {Mixed} value []
   * @return {Mixed}       []
   */
  parseValue(value) {
    if (helper.isString(value)) {
      if (isNaN(value) && !isNaN(Date.parse(value))) {
        value = "to_date('" + value + "','yyyy-mm-dd,hh24:mi:ss')"
      } else {
        value = '\'' + this.escapeString(value) + '\'';
      }
    } else if (helper.isArray(value)) {
      if (/^exp$/i.test(value[0])) {
        value = value[1];
      } else {
        value = value.map(item => this.parseValue(item));
      }
    } else if (helper.isBoolean(value)) {
      value = value ? '1' : '0';
    } else if (value === null) {
      value = 'null';
    }
    return value;
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
   * parse join
   * @param  {String} join []
   * @return {String}      []
   */
  parseJoin(join, options = {}) {
    if (helper.isEmpty(join)) return '';
    let joinStr = '';
    const defaultJoin = ' LEFT JOIN ';
    if (!helper.isArray(join)) {
      joinStr += defaultJoin + join;
      return joinStr;
    }

    const joins = {
      'left': ' LEFT JOIN ',
      'right': ' RIGHT JOIN ',
      'inner': ' INNER JOIN '
    };
    join.forEach(val => {
      if (!helper.isString(val) && !helper.isObject(val)) {
        return;
      }

      if (helper.isString(val)) {
        const hasJoin = val.toLowerCase().indexOf(' join ') > -1;
        joinStr += (hasJoin ? ' ' : defaultJoin) + val;
        return;
      }

      const ret = [];
      if (!('on' in val)) {
        for (const key in val) {
          const v = val[key];
          if (!helper.isObject(v)) {
            ret.push(val);
            break;
          }

          v.table = key;
          ret.push(v);
        }
      } else {
        ret.push(val);
      }

      ret.forEach(item => {
        const joinType = joins[item.join] || item.join || defaultJoin;
        let table = item.table.trim();
        // table is sql
        if (table.indexOf(' ') > -1) {
          if (table.indexOf('(') !== 0) {
            table = '(' + table + ')';
          }
          joinStr += joinType + table;
        } else {
          table = options.tablePrefix + table;
          if (table.indexOf('.') === -1) {
            joinStr += joinType + this.parseKey(table);
          } else {
            joinStr += joinType + table;
          }
        }
        if (item.as) {
          joinStr += '  ' + this.parseKey(item.as);
        }
        if (item.on) {
          const mTable = this.parseKey(options.alias || options.table);
          const jTable = this.parseKey(item.as || table);

          if (!helper.isObject(item.on)) {
            if (helper.isString(item.on)) {
              item.on = item.on.split(/\s*,\s*/);
            }
            joinStr += ' ON ' + (item.on[0].indexOf('.') > -1 ? item.on[0] : (mTable + '.' + this.parseKey(item.on[0])));
            joinStr += ' = ' + (item.on[1].indexOf('.') > -1 ? item.on[1] : (jTable + '.' + this.parseKey(item.on[1])));
            return;
          }

          const where = [];
          for (const key in item.on) {
            let onKey = key;
            if (onKey.indexOf('.') === -1) {
              onKey = mTable + '.' + this.parseKey(onKey);
            }

            const onVal = item.on[key];
            const onWhereItem = [onKey];
            if (helper.isString(onVal) && onVal.indexOf('.') === -1) {
              onWhereItem.push('=', jTable + '.' + this.parseKey(onVal));
            } else if (helper.isArray(onVal) && /^exp$/i.test(onVal[0])) {
              onWhereItem.push(onVal[1]);
            } else {
              onWhereItem.push('=', onVal);
            }

            where.push(onWhereItem.join(''));
          }
          joinStr += ' ON (' + where.join(' AND ') + ')';
        }
      });
    });
    return joinStr;
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