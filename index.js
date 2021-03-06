/*!
 * db2crud
 * Copyright(c) 2017 Jian Zhang
 * sword_zhang@163.com
 * MIT Licensed
 */


var tbDefine = [];
var dbname = "TEST";
var Q = require("q");
var fs = require("fs");
var moment = require("moment");
var db2;
var log = require("log4node");
var TIMESTAMP_FORMAT = "YYYY-MM-DD HH:mm:ss";

/**
 * set database with param "name"
 *
 * @param String name:database name :sample 'TEST'
 * @return
 **/
var setDbname = function (name) {
  dbname = name;
};

/**
 * set time format for timestamp field
 *
 * @param String tf :time format of db2:like 'YYYY-MM-DD HH:mm:ss'
 * @return
 * @reference refer following url about date format
 * https://momentjs.com/docs/#/use-it/
 **/
var setTimeFormat = function (tf) {
  TIMESTAMP_FORMAT = tf;
};
var intType = 4;
var varcharType = 12;
var timestampType = 93;

const DEFAUTLT_SIZE = 10
const DEFAUTLT_PAGE = 1

/**
 * check field value on type,length,format
 *
 * @param String name :table name of db2 need operate on
 * @param JSON tbObjArr :like following obj
    [  
      {  
        NUM:"2",
        STR:"2",
        DATEFIELD:"2017-09-03 05:25:00"
      },
      {  
        NUM:3,
        STR:3,
        DATEFIELD:"2017-09-03 05:25:00"
      }
    ]
 * @return promise object included checkResult:
 * 【success result sample】: []
 * 【error result sample】
    [  
      [  
        {  
          "field":"STR",
          "value":3,
          "errMsg":"STR[3] is not varchar"
        },
        {  
          "field":"DATEFIELD",
          "value":"abc",
          "errMsg":"format of DATEFIELD[abc] is invalid "
        }
      ],
      [  
        {  
          "field":"STR",
          "value":"123456",
          "errMsg":"length ofSTR[123456] must be less than 5"
        }
      ]
    ]
 * @reference refer following url about date format 
 * https://momentjs.com/docs/#/use-it/    
 **/
var checkArrValid = function (name, tbObjArr) {
  var deferred = Q.defer();
  var promises = [];
  for (var i = 0; i < tbObjArr.length; i++) {
    var item = tbObjArr[i];
    promises.push(checkValid(name, item));
  }
  Q.all(promises).then(function (result) {
    var errFlag = false;
    for (var i = 0; i < result.length; i++) {
      if (result[i].length > 0) {
        errFlag = true;
      }
    }
    if (errFlag) {
      deferred.resolve(result);
    } else {
      deferred.resolve([]);
    }
  });
  return deferred.promise;
};

/**
 * check field value on type,length,format
 *
 * @param String name :table name of db2 need operate on
 * @param JSON tbObj :like following obj 
    {  
      NUM:"2",
      STR:"2",
      DATEFIELD:"2017-09-03 05:25:00"
    }
 * @return promise object included checkResult:
 * 【success result sample】: []
 * 【error result sample】  
    [  
      {  
        "field":"DATEFIELD",
        "value":"abc",
        "errMsg":"format of DATEFIELD[abc] is invalid "
      },
      {  
        "field":"STR",
        "value":"123456",
        "errMsg":"length of STR[123456] must be less than 5"
      }
    ]
 * @reference refer following url about date format 
 * https://momentjs.com/docs/#/use-it/   
 *  
 **/
var checkValid = function (name, tbObj) {
  var deferred = Q.defer();
  var resultArr = [];
  var tb = getTbDefine(name);
  for (var i = 0; i < tb.FIELD_DEFINITION.length; i++) {
    var item = tb.FIELD_DEFINITION[i];
    var data = tbObj[item.column_name];
    if (
      !item.is_nullable &&
      item.column_name != tb.PK_FIELD &&
      (data == null || data == undefined)
    ) {
      resultArr.push(item.column_name + " must be not null");
    } else {
      if (item.column_name != tb.PK_FIELD) {
        if (item.is_nullable && (data == null || data == undefined)) {
          continue;
        } else {
          switch (item.data_type) {
            case 4:
              console.debug(
                "data != parseInt(data, 10):" + (data != parseInt(data, 10))
              );
              if (
                data != parseInt(data, 10) ||
                typeof data == "string" ||
                data instanceof String
              ) {
                console.debug("data is invalid");
                resultArr.push({
                  field: item.COLUMN_NAME,
                  value: data,
                  errMsg:
                    item.COLUMN_NAME + "[" + data + "]" + " is not integer",
                });
              }
              break;
            case 12:
              console.debug(
                "typeof data != 'string' && !data instanceof String:" +
                  (typeof data != "string" && !data instanceof String)
              );
              if (typeof data != "string" && !(data instanceof String)) {
                console.debug("data type invalid");
                resultArr.push({
                  field: item.COLUMN_NAME,
                  value: data,
                  errMsg:
                    item.COLUMN_NAME + "[" + data + "]" + " is not varchar",
                });
              } else {
                if (data.length > item.COLUMN_SIZE) {
                  console.debug("data length invalid");
                  resultArr.push({
                    field: item.COLUMN_NAME,
                    value: data,
                    errMsg:
                      "length of" +
                      item.COLUMN_NAME +
                      "[" +
                      data +
                      "] must be less than " +
                      item.COLUMN_SIZE,
                  });
                }
              }
              break;
            case 93:
              console.debug(
                "!moment(data, TIMESTAMP_FORMAT):" +
                  !moment(data, TIMESTAMP_FORMAT).isValid()
              );
              if (!moment(data, TIMESTAMP_FORMAT).isValid()) {
                console.debug("date format invalid");
                resultArr.push({
                  field: item.COLUMN_NAME,
                  value: data,
                  errMsg:
                    "format of " +
                    item.COLUMN_NAME +
                    "[" +
                    data +
                    "]" +
                    " is invalid ",
                });
              }
              break;
          }
        }
      }
    }
  }
  deferred.resolve(resultArr);
  return deferred.promise;
};

/**
 * get definition of table by tablename
 *
 * @param String name:name of table
 * @return JSON object just like as display following
   {  
    "TABLE_CAT":null,
    "TABLE_SCHEM":"ADMIN",
    "TABLE_NAME":"DB2CRUDTEST",
    "TABLE_TYPE":"TABLE",
    "REMARKS":null,
    "PK_FIELD":"ID",
    "FIELD_DEFINITION":[  
      {  
        "TABLE_CAT":null,
        "TABLE_SCHEM":"ADMIN",
        "TABLE_NAME":"DB2CRUDTEST",
        "COLUMN_NAME":"ID",
        "DATA_TYPE":4,
        "TYPE_NAME":"INTEGER",
        "COLUMN_SIZE":10,
        "BUFFER_LENGTH":4,
        "DECIMAL_DIGITS":0,
        "NUM_PREC_RADIX":10,
        "NULLABLE":0,
        "REMARKS":null,
        "COLUMN_DEF":null,
        "SQL_DATA_TYPE":4,
        "SQL_DATETIME_SUB":null,
        "CHAR_OCTET_LENGTH":null,
        "ORDINAL_POSITION":1,
        "IS_NULLABLE":"NO"
      }
    }
 *
 **/
var getTbDefine = function (name) {
  for (var i = 0; i < tbDefine.length; i++) {
    var item = tbDefine[i];
    if (item.table_name == name) {
      return item;
    }
  }
  return null;
};

/**
 * get field definition of field by tablename&fldname
 *
 * @param String tbname:name of table
 * @param String fldname:field name
 * @return JSON object just like as display following
      {  
        "TABLE_CAT":null,
        "TABLE_SCHEM":"ADMIN",
        "TABLE_NAME":"DB2CRUDTEST",
        "COLUMN_NAME":"ID",
        "DATA_TYPE":4,
        "TYPE_NAME":"INTEGER",
        "COLUMN_SIZE":10,
        "BUFFER_LENGTH":4,
        "DECIMAL_DIGITS":0,
        "NUM_PREC_RADIX":10,
        "NULLABLE":0,
        "REMARKS":null,
        "COLUMN_DEF":null,
        "SQL_DATA_TYPE":4,
        "SQL_DATETIME_SUB":null,
        "CHAR_OCTET_LENGTH":null,
        "ORDINAL_POSITION":1,
        "IS_NULLABLE":"NO"
      }
 *
 **/
var getFldDefine = function (tbname, fldname) {
  var tb = getTbDefine(tbname);
  for (var i = 0; i < tb.FIELD_DEFINITION.length; i++) {
    var item = tb.FIELD_DEFINITION[i];
    if (item.COLUMN_NAME == fldname.toUpperCase()) return item;
  }
  return null;
};

/**
 * execute sql and return result
 *
 * @param String sql:sql need be executed
 * @return promise object included all of records meet condition of sql
    [  
      {  
        "ID":3,
        "STR":"str3",
        "DATEFIELD":"2017-09-03 05:25:00.518"
      },
      {  
        "ID":4,
        "STR":"str4"
      }
    ]
 *   
 **/
function exeQuery(sql) {
  var deferred = Q.defer();
  db2.query(sql, function (error, data) {
    if (error) {
      log.error("db error:" + JSON.stringify(error));
      deferred.reject(error);
    } else {
      deferred.resolve(data);
    }
  });
  return deferred.promise;
}

/**
 * get next value of sequence
 *
 * @param String name:name of sequence want get
 * @return promise object included next value of sequence, type of result is integer.
 *
 **/
var getSeq = function (name) {
  var deferred = Q.defer();
  exeQuery(
    "select NEXT VALUE FOR " + name + "_seq value from sysibm.sysdummy1"
  ).then((data) => deferred.resolve(data[0].VALUE));
  return deferred.promise;
};

/**
 * insert one record or multiple records into some table
 *
 * @param String name:name of table
 * @param String dataObj:JSON object included record need to be inserted
 * attention: PK field need not be set, db2crud will automatically get next value of sequence as PK field 
 * sequence name rule: [tablename] + "_SEQ" 
    {  
      "STR":"str3",
      "DATEFIELD":"2017-09-03 05:25:00.518"
    }
    OR
   [  
      {  
        "STR":"str3",
        "DATEFIELD":"2017-09-03 05:25:00.518"
      },
      {  
        "STR":"str4"
      }
    ]
 * @return promise object included all of field values inserted into table.
   {  
      "ID" :1,
      "STR":"str3",
      "DATEFIELD":"2017-09-03 05:25:00.518"
    }
    OR
   [  
      {  
        "ID" :1,      
        "STR":"str3",
        "DATEFIELD":"2017-09-03 05:25:00.518"
      },
      {  
        "ID" :2,       
        "STR":"str4"
      }
    ]
 * 
 **/
var insert = async function (name, dataObj) {
  var deferred = Q.defer();
  var rArr = [];
  if (dataObj.constructor == Array) {
    checkArrValid(name, dataObj).then(function (result) {
      if (result.length > 0) {
        deferred.reject(result);
      } else {
        var promises = [];
        for (var i = 0; i < dataObj.length; i++) {
          var item = dataObj[i];
          promises.push(_insert(name, item));
        }
        Q.all(promises).then(function (result2) {
          deferred.resolve(result2);
        });
      }
    });
  } else {
    checkValid(name, dataObj).then(function (result) {
      if (result.length > 0) {
        deferred.reject(result);
      } else {
        deferred.resolve(_insert(name, dataObj));
      }
    });
  }
  return deferred.promise;
};

/**
 * execute multiple sqls with transactions
 * @param {*} sqls 
 * @param {*} valstrs 
 * @returns 
 */
var executeQuerys = async function (sqls, valstrs) {
  var deferred = Q.defer();
  const client = await db2.connect();
  try {
    await client.query('BEGIN')
    var promises = []
    for (var i=0; i<sqls.length; i++) {
      promises.push(client.query(sqls[i], valstrs[i]))
    }
    await Q.all(promises).then(
      function (result2) {
        // console.log(result2)
        client.query('COMMIT')
        deferred.resolve(result2)
        return deferred.promise
      }, function (err) {
        console.log(err)
        deferred.reject(err);
        return deferred.promise
      }
    )
  } catch (error) {
    client.query("ROLLBACK")
    throw error
  } finally {
    client.release();
  }
};

var executeQuery = async function (sql, valArr, orderBy, pagination)  {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  var deferred = Q.defer()
  if (!sql.toLowerCase().startsWith('select')) {
    connect.query(sql, valArr, (error, results) => {
      if (error) {
        console.log("error>>>>>>> " + error);
        deferred.reject(error);
      } else {
        deferred.resolve(results);
      }
    });
  } else {
    let order = (orderBy !== null && orderBy !== undefined)
    let pageParam = (pagination == null)?DEFAUTLT_PAGE:pagination.page
    let sizeParam = (pagination == null)?DEFAUTLT_SIZE:pagination.size

    const result = await executeQueryNoPage('select count(1) from (' + sql + ') as foo', valArr)
    const totalCount = result.rows[0].count
    const totalPage = Math.ceil(totalCount / sizeParam)
    let offPos = (pageParam -1) * sizeParam
    
    if (order) { 
      let orderByCols = orderBy.cols
      let orderByMethod = orderBy.method
      sql = sql.concat(' order by ')
      orderByCols.split(',').forEach(element => sql = sql.concat(element).concat(' ').concat(orderByMethod).concat(','))
      sql = sql.substring(0, sql.length-1)
    }
    
    sql = sql.concat(' offset ' + offPos + ' limit ' + sizeParam)
    let paginationResult = {}
    connect.query(sql, valArr, (error, results) => {
      if (error) {
        console.debug("error>>>>>>> " + error);
        deferred.reject(error);
      } else {
        paginationResult.totalCount = totalCount
        paginationResult.totalPage = totalPage
        paginationResult.currentPage = pageParam
        paginationResult.data = results.rows
        deferred.resolve(paginationResult)
      }
    })
  }
  return deferred.promise;
};

var executeQueryNoPage = async function (sql, valArr)  {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  var deferred = Q.defer();
  connect.query(sql, valArr, (error, results) => {
    if (error) {
      console.debug("error>>>>>>> " + error);
      deferred.reject(error)
    } else {
      deferred.resolve(results)
    }
  });
  return deferred.promise;
};

/**
 * mapping fieldname with JSON field and insert into table named "name" parameter
 *
 * @param String name:name of table
 * @param String dataObj:JSON object included record need to be inserted
 * attention: PK field need not be set, db2crud will automatically get next value of sequence as PK field 
 * sequence name rule: [tablename] + "_SEQ" 
    {  
      "STR":"str3",
      "DATEFIELD":"2017-09-03 05:25:00.518"
    }
 * @return promise object included all of field values inserted into table.
   {
      "ID" : 1,
      "STR":"str3",
      "DATEFIELD":"2017-09-03 05:25:00.518"
    }
 * 
 **/
var _insert = function (name, dataObj) {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  var deferred = Q.defer();
  var tb = getTbDefine(name);
  var sql = "insert into " + tb.table_schema + '.' + tb.table_name + "([fldstr]) values([valstr])";
  var fldstr = "";
  var valstr = "";
  var valarr = [];
  var columnIndex = 0;

  for (let item of tb.FIELD_DEFINITION) {
    var fldname = item.column_name;
    if (dataObj[fldname] != null && dataObj[fldname] != undefined) {
      fldstr = fldstr + fldname + ",";
      valstr = valstr + "$" + ++columnIndex + ",";
      valarr.push(dataObj[fldname]);
    }
  }

  fldstr = fldstr.substring(0, fldstr.length - 1);
  valstr = valstr.substring(0, valstr.length - 1);

  sql = sql
    .replace("[fldstr]", fldstr)
    .replace("[valstr]", valstr)
    .concat(" RETURNING *");

  connect.query(sql, valarr, (error, results) => {
    if (error) {
      console.debug("error>>>>>>> " + error);
      deferred.reject(error);
    } else {
      deferred.resolve(results.rows);
    }
  });

  return deferred.promise;
};

/**
 * get records that field equal with corresponding JSON field
 *
 * @param String name:name of table
 * @param String dataObj:JSON object included search criterion
    {  
      "STR":"str3",
      "DATEFIELD":"2017-09-03 05:25:00.518"
    }
 * @return promise object included all of field values met criterion.
   {
      "ID" : 1,
      "STR":"str3",
      "DATEFIELD":"2017-09-03 05:25:00.518"
    }
    OR
    [  
      {  
        "ID" :1,      
        "STR":"str3",
        "DATEFIELD":"2017-09-03 05:25:00.518"
      },
      {  
        "ID" :2,       
        "STR":"str4",
        "DATEFIELD": null
      }
    ]
 * 
 **/
var get = function (name, dataObj) {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  var deferred = Q.defer();
  var tb = getTbDefine(name);
  var sql = "select * from " +  tb.table_schema + '.' + tb.table_name + " where [fldstr]";

  var fldstr = "",
  valarr = [];
  var paraCount = 0;
  for (var i = 0; i < tb.FIELD_DEFINITION.length; i++) {
    var item = tb.FIELD_DEFINITION[i];
    var fldname = item.column_name;
    if (dataObj[fldname] != null && dataObj[fldname] != undefined) {
      fldstr = fldstr + fldname + " = $" + ++paraCount + " and ";
      valarr.push(dataObj[fldname]);
    }
  }

  fldstr = fldstr.substring(0, fldstr.length - 5);
  sql = sql.replace("[fldstr]", fldstr);

  connect.query(sql, valarr, (error, results) => {
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(results.rows);
    }
  });
  return deferred.promise;
};

var getAll = function (name) {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  var deferred = Q.defer();
  var tb = getTbDefine(name);
  var sql = "select * from " + tb.table_schema + '.' + tb.table_name;
  connect.query(sql, (error, results) => {
    if (error) {
      console.debug("error====" + error);
      deferred.reject(error);
    } else {
      deferred.resolve(results.rows);
    }
  });
  return deferred.promise;
};

var getAllWithPagination = async function (name, page, size) {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  var deferred = Q.defer();
  var tb = getTbDefine(name);

  let pageParam = (page == null)?DEFAUTLT_PAGE:page
  let sizeParam = (size == null)?DEFAUTLT_SIZE:size

  const totalCount = await executeQuery('select count(1) from ' + tb.table_schema + '.' + tb.table_name, [])
  const totalPage = Math.ceil(totalCount.rows[0].count / sizeParam)
  
  let paginationResult = {}
  var sql = "select * from " + tb.table_schema + '.' + tb.table_name + ' offset ($1-1)*$2 limit $2'
  connect.query(sql, [pageParam, sizeParam], (error, results) => {
    if (error) {
      deferred.reject(error)
    } else {
      paginationResult.totalCount = totalCount.rows[0].count
      paginationResult.totalPage = totalPage
      paginationResult.currentPage = pageParam
      paginationResult.data = results.rows
      deferred.resolve(paginationResult)
    }
  });
  return deferred.promise;
}

/**
 * get records with PK id
 *
 * @param String name:name of table
 * @param Integer id: value of pk field
 * @return promise object included all of field values met criterion.
   {
      "ID" : 1,
      "STR":"str3",
      "DATEFIELD":"2017-09-03 05:25:00.518"
    }
 * 
 **/
var getById = function (name, id) {
  var tb = getTbDefine(name);
  var dataObj = {};
  dataObj[tb.PK_FIELD] = id;
  return get(name, dataObj);
};

/**
 * update records that field equal with corresponding JSON field
 *
 * @param String name:name of table
 * @param String dataObj:JSON object included update criterion
 * @return promise object included Affected rows.
 *
 **/
var update = async function (name, dataObj) {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  var deferred = Q.defer();
  var resultArr = checkValid(name, dataObj);
  if (resultArr.length > 0) {
    console.debug("data are invalid!__________________");
    deferred.reject(resultArr);
  }
  var tb = getTbDefine(name);
  var sql = "update " + tb.table_schema + '.' + tb.table_name + " set [fldstr]" + " where [pkstr]";
  var fldstr = "",
    valarr = [],
    pkstr = "";
  var columnIndex = 0;

  for (let item of tb.FIELD_DEFINITION) {
    var fldname = item.column_name;
    if (dataObj[fldname] != null && dataObj[fldname] != undefined) {
      fldstr = fldstr + fldname + " = $" + ++columnIndex + " , ";
      valarr.push(dataObj[fldname]);
    }
  }
  fldstr = fldstr.substring(0, fldstr.length - 3);
  sql = sql
    .replace("[fldstr]", fldstr)
    .replace("[pkstr]", tb.PK_FIELD + "=" + dataObj[tb.PK_FIELD]);
  connect.query(sql, valarr, (error, results) => {
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(results);
    }
  });
  return deferred.promise;
};

/**
 * delete records that field equal with corresponding JSON field
 *
 * @param String name:name of table
 * @param String dataObj:JSON object included update criterion
 * @return promise object included Affected rows.
 *
 **/
var remove = async function (name, dataObj) {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  var deferred = Q.defer();
  var tb = getTbDefine(name);
  var sql = "delete from " + tb.table_schema + '.'  + tb.table_name + " where [fldstr]";
  var fldstr = "",
    valarr = [];
  var columnIndex = 0;
  for (let item of tb.FIELD_DEFINITION) {
    var fldname = item.column_name;
    if (dataObj[fldname] != null && dataObj[fldname] != undefined) {
      fldstr = fldstr + fldname + " = $" + ++columnIndex + " and ";
      valarr.push(dataObj[fldname]);
    }
  }
  fldstr = fldstr.substring(0, fldstr.length - 5);
  sql = sql.replace("[fldstr]", fldstr);
  connect.query(sql, valarr, (error, results) => {
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(results);
    }
  });
  return deferred.promise;
};

/**
 * delete record by PK
 *
 * @param String name:name of table
 * @param Integer id:value of pk field
 * @return promise object included Affected rows.
 *
 **/
var removeById = async function (name, id) {
  var tb = getTbDefine(name);
  var dataObj = {};
  dataObj[tb.PK_FIELD] = id;
  return remove(name, dataObj);
};

var describeDatabase = function () {
  var deferred = Q.defer();
  var sql =
    "SELECT distinct table_name, table_schema FROM information_schema.columns c WHERE table_schema = 'public' ";
  db2.query(sql, function (err, results) {
    if (err) {
      log.error(err);
      deferred.reject(err);
    } else {
      deferred.resolve(results.rows);
    }
  });
  return deferred.promise;
};

var describeTable = function (tableName) {
  var deferred = Q.defer();
  var sql =
    "SELECT * FROM information_schema.columns c WHERE table_schema = 'public' and table_name = $1";
  db2.query(sql, [tableName], function (err, results) {
    if (err) {
      log.error(err);
      deferred.reject(err);
    } else {
      deferred.resolve(results.rows);
    }
  });
  return deferred.promise;
};

/**
 * get tablelist of current schema and fields definition of these tables
 *
 * @param Connection option.db:connection that ibmdb.open returned 
     ibmdb.open(common.connectionString, function(err,conn){});
 * @param String option.dbname:databse name     
 * @return promise included null value
 * 
 **/
var init = function (options) {
  log.setLogLevel("info");
  db2 = options.db;
  if (options.app !== null && options.app !== undefined) {
    options.app.use('/', ContextMiddleware)
  } else {
    let reference = Math.random()
    context.create({ reference })
  }
  if (options.dbname != null && options.dbname != undefined) {
    dbname = options.dbname;
  }
  var deferred = Q.defer();
  if (localLoadFlag) {
    setTbInfo("./tbinfo.json").then(function (data) {
      deferred.resolve(null);
    });
    return deferred.promise;
  }

  describeDatabase().then(function (data, err) {
    var promises = [];
    tbDefine = data;
    for (var i = 0; i < tbDefine.length; i++) {
      var item = tbDefine[i]
      promises.push(describeTable(item.table_name))
    }

    Q.all(promises).then(function (result) {
      for (var i = 0; i < result.length; i++) {
        tbDefine[i].FIELD_DEFINITION = result[i];
        if (i == result.length - 1) {
          log.info("got table&field metadata!");
          setPK().then(function () {
            log.info("set PK of table!");
            deferred.resolve(tbDefine);
          });
        }
      }
    });
  });
  return deferred.promise;
};

/**
 * get tablelist of current schema
 *
 * @param String name:name of current schema
 * @return promise object included table list
 *
 **/
var getTbInfo = function (name) {
  var deferred = Q.defer();
  db2.describe(
    {
      database: dbname,
      table: name,
    },
    function (err, data) {
      if (err) {
        deferred.reject(err);
      }
      deferred.resolve(data);
    }
  );
  return deferred.promise;
};

/**
 * set pk field for each item of table list
 *
 * @return promise object included pk field name list
 *
 **/
var setPK = function () {
  var deferred = Q.defer();
  var sql =
    'select pg_class.relname as "TABLENAME", pg_attribute.attname as "COLNAME",pg_type.typname \
            as typename,pg_constraint.conname as pk_name from \
            pg_constraint  inner join pg_class \
            on pg_constraint.conrelid = pg_class.oid \
            inner join pg_attribute on pg_attribute.attrelid = pg_class.oid \
            and  pg_attribute.attnum = pg_constraint.conkey[1] \
            inner join pg_type on pg_type.oid = pg_attribute.atttypid \
            where  pg_constraint.contype=\'p\'';
  exeQuery(sql).then(function (data) {
    for (var i = 0; i < data.rows.length; i++) {
      for (var j = 0; j < tbDefine.length; j++) {
        if (data.rows[i].TABLENAME == tbDefine[j].table_name) {
          tbDefine[j].PK_FIELD = data.rows[i].COLNAME;
        }
      }
      if (i == data.rows.length - 1) {
        fs.writeFile("./tbinfo.json", JSON.stringify(tbDefine), function (err) {
          if (err) {
            return console.debug(err);
          }
          console.debug("The file was saved!");
        });
        deferred.resolve(tbDefine);
      }
    }
  });
  return deferred.promise;
};
var localLoadFlag = false;
function setTbInfo(filePath) {
  var deferred = Q.defer();
  fs.readFile(filePath, "utf8", function (err, data) {
    if (err) {
      deferred.reject(err);
    }
    tbDefine = JSON.parse(data);
    deferred.resolve(data);
  });
  return deferred.promise;
}

var beginTrans = async function () {
  const client = await db2.connect();
  await context.set({connection: client})
  await client.query('BEGIN')
}

var commit = async function () {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  await connect.query('COMMIT', function () {
    connect.release()
  })
}

var rollback = async function () {
  const connect = (context == null  || context.get() == null || context.get().connection == null) ? db2: context.get().connection
  await connect.query("ROLLBACK", function () {
    connect.release()
  })
}

module.exports = {
  get: get,
  getById: getById,
  getAll: getAll,
  getAllWithPagination: getAllWithPagination,
  insert: insert,
  remove: remove,
  removeById: removeById,
  update: update,
  getTbDefine: getTbDefine,
  init: init,
  setTimeFormat: setTimeFormat,
  setDbname: setDbname,
  executeQuerys: executeQuerys,
  executeQuery: executeQuery,
  executeQueryNoPage: executeQueryNoPage,
  beginTrans: beginTrans,
  commit: commit,
  rollback: rollback,
}

const context = require('node-execution-context');

const ContextMiddleware = (req, res, next) => {
  let reference = Math.random()
  context.create({ reference });
  next()
}