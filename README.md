PGSQLCRUD
=========

tools of node.js for crud on db2

## Installation

  `npm install pgsqlcrud`

## Usage
  
  Firstly, you need init db2 connection before usage.
  
    var pgsqlcrud = require('pgsqlcrud');
    
    //db:variable for opening connection  
    pgsqlcrud.init({db:db2,dbname:'TEST'});
  
    // select * from pgsqlcrudtest where ID=2 and STR='str3';
    var tbObj = {
      ID : 2,
      STR : "str3"
    };
    pgsqlcrud.get("pgsqlcrudtest", tbObj).then(function(rdata) {
      console.log("retdata=" + JSON.stringify(rdata));
    })

    // delete from pgsqlcrudtest where ID=2 and STR='str3'
    var tbObj = {
      ID : 2,
      STR : "str3"
    };
    pgsqlcrud.remove("pgsqlcrudtest", tbObj).then(function(rdata) {
      console.log("retdata=" + JSON.stringify(rdata));
    })

    // update pgsqlcrudtest set STR='str3' where ID=2
    var tbObj = {
      ID : 2,
      STR : "str3"
    };
    pgsqlcrud.update("pgsqlcrudtest", tbObj).then(function(rdata) {
      console.log("retdata=" + JSON.stringify(rdata));
    })

    // insert pgsqlcrudtest(ID,STR) VALUES (2,"str2")
    tbObj = {
      ID : 2,
      STR : "str2"
    };
    pgsqlcrud.insert("pgsqlcrudtest", tbObj).then(function(rdata) {
      console.log("retdata=" + JSON.stringify(rdata));
    })
    
    // insert pgsqlcrudtest(ID,STR) VALUES (3,"str3")
    // insert pgsqlcrudtest(ID,STR) VALUES (4,"str4")
    tbObj = [{ID:3,STR:"str3"},{ID:4,STR:"str4"}];
    dbutils.insert("pgsqlcrudtest",tbObj).then(function(rdata){
      console.log("retdata=" + JSON.stringify(rdata));
    });

    //pagination, parameter are tablename, page index, page size
    //return totalCount totalPage currentPage data
    dbutils.getAllWithPagination('pgsqlcrudtest', 1, 10)(function(rdata){
      console.log("retdata=" + JSON.stringify(rdata));
    });

    //pagination, parameter are sql, vars, orderBy and pagination
    dbutils.executeQuery('select user_id, name, phone, create_by from public.user where create_time > $1', ['2022-01-01'], 
    {'cols':'create_by','method': 'desc'}, {'page': 2, 'size': 3})
    
## Error Check

    //retdata=    [  
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
    tbObj = [{NUM:"2",STR:"2",DATEFIELD:"2017-09-03 05:25:00"}
           ,{NUM:3,STR:3,DATEFIELD:"2017-09-03 05:25:00"}
           ,{NUM:3,STR:3,DATEFIELD:"abc"}
           ,{NUM:3,STR:"123456",DATEFIELD:"2017-09-03 05:25:00"}];
    dbutils.insert("pgsqlcrudtest",tbObj).then(function(rdata){
          console.log("retdata=" + JSON.stringify(rdata));
    });

//???????????????
const context = require('node-execution-context');
const ContextMiddleware = (req, res, next) => {
  context.run(next, { reference: Math.random() });
};
app.use('/', ContextMiddleware);


//???????????????????????????app?????????app ???Express
await init({ db: pool, dbname: "buzzudev", app: app })

//????????????
await beginTrans()

//????????????
await insert("users", user)

//????????????
await commit()

// ???????????????????????????
await rollback()

You can refer test.js for further detail!

## Tests

  node test

## Contributing

  Email:sword_zhang@163.com,chengqingsong555@163.com
  
  QQ:974566030


## License
  
  Copyright(c) 2022 Jian Zhang,Cheng Qing Song

  MIT Licensed
  
  
