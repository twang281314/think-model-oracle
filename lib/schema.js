const helper = require('think-helper');
const {
  Schema
} = require('think-model-abstract');
const Debounce = require('think-debounce');

const debounce = new Debounce();

const SCHEMAS = {};

/**
 * mysql Schema
 */
module.exports = class OracleSchema extends Schema {
  _getItemSchemaValidate(fieldData) {
    const validate = {};

    return validate;
  }
  _parseItemSchema(item) {

    item.type = item.type || 'varchar(100)';
    const pos = item.type.indexOf('(');
    item.tinyType = (pos === -1 ? item.type : item.type.slice(0, pos)).toLowerCase();

    return item;
  }
  /**
   * get table schema
   * @param {String} table
   */
  getSchema(table = this.table) {
    table = table.toUpperCase();
    if (SCHEMAS[table]) return Promise.resolve(SCHEMAS[table]);
    return debounce.debounce(`getTable${table}Schema`, () => {
      const columnSql=`
        SELECT
            utc.column_name AS column_name,
            utc.data_type AS data_type,
            utc.data_length AS max_length ,
            CASE
              utc.nullable
              WHEN 'N' THEN '否'
              ELSE '是'
            END AS required,
            utc.data_default AS default_value,
            ucc.comments AS comments,
            utc.table_name AS table_name ,
            CASE
              utc.COLUMN_NAME
              WHEN (
              SELECT
                col.column_name
              FROM
                user_constraints con,
                user_cons_columns col
              WHERE
                (con.constraint_name = col.constraint_name
                AND con.constraint_type = 'P'
                AND col.table_name = '${this.parser.parseKey(table)}') ) THEN '是'
              ELSE '否'
            END AS is_primary,
            CASE
              NVL(uuc.column_name, '空值')
              WHEN '空值' THEN '否'
              ELSE '是'
            END AS is_unique
          FROM
            user_tab_columns utc
          INNER JOIN user_col_comments ucc ON
            utc.column_name = ucc.column_name
            AND utc.table_name = ucc.table_name
          LEFT JOIN (
            SELECT
              col.column_name
            FROM
              user_constraints con,
              user_cons_columns col
            WHERE
              (con.constraint_name = col.constraint_name
              AND con.constraint_type = 'U'
              AND col.table_name = '${this.parser.parseKey(table)}') ) uuc ON
            utc.column_name = uuc.column_name
          WHERE
            utc.table_name = '${this.parser.parseKey(table)}'
          ORDER BY
            column_id
      `
      return this.query.query(columnSql).catch(() => []).then(data => {
        let ret = {};
        data.forEach(item => {
          ret[item.column_name.toLowerCase()] = {
            name: item.column_name.toLowerCase(),
            type: item.data_type.toLowerCase(),
            required: item.required === '是',
            default: item.default_value,
            primary: item.is_primary === '是',
            unique: item.is_unique === '是',
            autoIncrement: false,
            max_length:item.max_length
          };
        });
        ret = helper.extend(ret, this.schema);
        for (const key in ret) {
          ret[key] = this._parseItemSchema(ret[key]);
        }
        SCHEMAS[table] = ret;
        return ret;
      });
    });
  }

  /**
   * parse data
   * @param {Object} data
   * @param {Boolean} isUpdate
   */
  parseData(data, isUpdate = false, table) {
    return this.getSchema(table).then(schema => {
      const result = {};
      for (const key in schema) {
        if (isUpdate && schema[key].readonly) continue;
        // add default value
        if (data[key] === undefined) {
          const flag = !isUpdate || (isUpdate && schema[key].update);
          if (flag && schema[key].default !== '') {
            let defaultValue = schema[key].default;
            if (helper.isFunction(defaultValue)) {
              defaultValue = defaultValue(data);
            }
            if (defaultValue == null) {
              if (schema[key].tinyType == 'number') {
                defaultValue = 0;
              }
            }
            result[key] = defaultValue;
          }
          continue;
        } else if (data[key] === '') {
          result[key] = ' ';
          continue;
        }
        result[key] = this.parseType(schema[key].tinyType, data[key]);
      }
      return this.validateData(result, schema);
    });
  }
  /**
   * parse type
   * @param {String} tinyType
   * @param {Mixed} value
   */
  parseType(tinyType, value) {
    if (tinyType === 'date') return new Date(value);
    if (tinyType === 'enum' || tinyType === 'set' || tinyType === 'bigint') return value;
    if (tinyType.indexOf('int') > -1) return parseInt(value, 10) || 0;
    if (['number', 'float'].indexOf(tinyType) > -1) return parseFloat(value, 10) || 0;
    if (tinyType === 'bool') return value ? 1 : 0;
    return value;
  }
};