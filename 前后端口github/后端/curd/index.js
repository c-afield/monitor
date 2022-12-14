/**
 *@author 
 *@date 2022/8/18
 *@Description:公共查询方法
 */
 const utilsTools = require("../utils/utils.tools");
 const db = require("../models/index");
 const logger = require("../utils/utils.logger");
 
 //整理统一返回格式
 function resExtra(data, code = 200, message = '操作成功！') {
     return {data, code, message}
 }
 
//  根据ip进行去重
function filterIp(arr) {
    var res = new Map();
    return arr.filter((a) => !res.has(a.ip) && res.set(a.ip, 1));
}
 //查询列表条件处理
 function queryConditions(conditions, count) {
     let queryCon = {
         where: {},
         // limit:500,
         // offset:0,
     }
 
     if (conditions.params) {
         queryCon.where = utilsTools.deleteNullObj(conditions.params)
     }
     //每页条数
     if (conditions.limit) {
         queryCon.limit = parseInt(conditions.limit)
     }
     //当前页
     if (conditions.offset || conditions.offset === 0) {
         queryCon.offset = conditions.limit * (conditions.offset - 1) || 0
     }
     if (conditions.sort) {
         queryCon.order = [[conditions.sort ? conditions.sort.prop : 'createdAt', conditions.sort ? conditions.sort.order : 'asc']] //默认按插入时间进行升序
     }
     if (conditions.order) {
         queryCon.order = conditions.order
     }
     if (conditions.exclude && !count) {
         queryCon.attributes = {exclude: [conditions.exclude]}
     }
     if (conditions.raw && !count) {
         queryCon.raw = true
     }
     if (conditions.include && !count) {
         queryCon.include = conditions.include
     }
     if (conditions.attributes) {
         queryCon.attributes = conditions.attributes
     }
     if (conditions.group) {
         queryCon.group = conditions.group
     }
     return queryCon
 }
 //***
 const sqlOpt = {
     /**
      * 查询数据总条数
      * @param  {Object}   model       模型实例
      * @param  {Object}   conditions  条件集合
      * @param  {Function} cb          回调函数
      */
     count: (model, conditions, cb) => {
         if (!model) return cb(resExtra('', 605, '模型不存在'));
         model.findAndCountAll(queryConditions(conditions, 'count')).then(data => {
             cb(resExtra(data.count))
         }).catch(err => {
             logger.error(JSON.stringify(err))
             cb(resExtra(err, 605, '查询条数失败'))
         })
     },
 
     /**
      * 查询所有数据
      * @param  {Object}   model       模型实例
      * @param  {Object}   conditions  条件集合
      * @param  {Function} cb          回调函数
      */
     list: (stability, pm, model, conditions,con, cb) => {
         /*查询条件格式
         conditions = {
             params: {
                 title: ''
             },
             limit: 20,
             offset: 0,
             sort: {
                 prop:'createdAt',
                 order:'desc / asc：升序',
             },
            {
                row: true
            }
         }*/
         
         let result;
         if (!model) return cb(resExtra('', 605, '模型不存在'));
         stability.findAll(queryConditions(con)).then(res => {
            // 总访问数
            res.map(x=>utilsTools.removeProperty(x))
            let pv_uv_sum = utilsTools.filterAryToJson(res, 'pv');
            // console.log(res);
            // console.log('pv_uv_sum',pv_uv_sum);
            model.findAll(queryConditions(conditions)).then(res2=>{
                res2.map(x=>utilsTools.removeProperty(x))
                if(pm.raw == true){
                    cb(resExtra(res2));
                } else {
                    let data = utilsTools.filterAryToJson(res2, pm.logType);
    
                    let res_data = []
                    let indicatorList = pm.indicatorList;
                    for(let i=0; i<data.length; i++) {
                        data[i]['pv_percent'] = data[i][pm.logType]/pv_uv_sum[i]['pv'];
                        data[i]['uv_percent'] = data[i]['uv']/pv_uv_sum[i]['uv']; 
                        let obj = {}
                        for(let j=0; j<indicatorList.length; j++) {
                            obj[indicatorList[j]] = data[i][indicatorList[j]]!=='undefined' ? data[i][indicatorList[j]]: null;
                        }
                        obj['key'] = data[i]['key']
                        res_data.push(obj)
                    }
                    // console.log(res_data)
                    cb(resExtra(res_data))
                }

            }).catch(err => {
                console.log(err)
                logger.error(JSON.stringify(err))
                result = resExtra(err, 605, '查询失败')
                cb(result)
            })
         }).catch(err => {
             console.log(err)
             logger.error(JSON.stringify(err))
             result = resExtra(err, 605, '查询失败')
             cb(result)
         })
     },
 
     /**
      * 更具主键 获取一条数据
      * @param  {Object}   model       模型实例
      * @param  {Object}   conditions  条件集合
      * @param  {Function} cb          回调函数
      */
     findOne: (model, conditions, cb) => {
         if (!model) return cb(resExtra('', 605, '模型不存在'));
         /* 根据主键查询一条数据 参数
         conditions:{
             params:{
             id:'123'
             }
          }*/
         if (!conditions.params.id) return cb(resExtra('', 605, '查询条件为空！'));
         model.findOne(queryConditions(conditions)).then(data => {
             cb(resExtra(data))
         }).catch(err => {
             logger.error(JSON.stringify(err))
             cb(resExtra(err, 605, '查询失败'))
         })
     },
 
     /**
      * 创建数据
      * @param  {Object}   model       模型实例
      * @param  {Object}   obj         数据集合
      * @param  {Function} cb          回调函数
      */
     create: (model, obj, cb) => {
         // obj = {
         // 模型属性1：前端参数1
         // title:params.title
         // }
         model.create(obj).then(data => {
            //  不需要返回创建成功的数据
             cb(resExtra('', 200, '创建成功！'))
         }).catch(err => {
             logger.error(JSON.stringify(err))
             console.log(err)
             cb(resExtra(err, 605, '创建失败!'))
         })
     },
 
     /**
      * 更新数据
      * @param  {Object}   model       模型实例
      * @param  {Object}   obj         数据集合
      * @param  {Object}   key         更新条件
      * @param  {Function} cb          回调函数
      */
     update: (model, obj, key, cb) => {
         /*key={
             id:body.id
         }*/
         model.update(obj, {where: key}).then(data => {
             if (data[0]) {
                 cb(resExtra('',200, '更新成功！'))
             } else {
                 cb(resExtra('', 605, 'ID不存在！'))
             }
         }).catch(err => {
             logger.error(JSON.stringify(err))
             cb(resExtra('', 605, '更新失败!'))
         })
     },
 
     /**
      * 删除某条数据
      * @param  {Object}   model       模型实例
      * @param  {Object}   key         删除条件
      * @param  {Function} cb          回调函数
      */
     delete: (model, key, cb) => {
         /*key={
             id:body.id
         }*/
         model.destroy({where: key}).then(data => {
             if (data) {
                 cb(resExtra(data, 200, '删除成功！'))
             } else {
                 cb(resExtra('', 605, 'ID不存在！'))
             }
         }).catch(err => {
             logger.error(JSON.stringify(err))
             cb(resExtra('', 605, '删除失败!'))
         })
     },
 
     /**
      * 删除整个表数据
      * @param  {Object}   model       模型实例
      * @param  {Function} cb          回调函数
      */
     deleteAll: (model, cb) => {
         model.destroy({where: {}, truncate: false}).then(data => {
             if (!data) {
                 cb(resExtra(data, 200, '全部删除成功！'))
             } else {
                 cb(resExtra('', 605, '删除失败！'))
             }
         }).catch(err => {
             logger.error(JSON.stringify(err))
             cb(resExtra('', 605, '删除失败!'))
         })
     },
 
     /**
      * 原始查询
      * @param  {String} sql           原始sql语句
      * @param  {Function} cb          回调函数
      */
     doQuery: (sql, cb) => {
         // sql = 'SELECT * FROM `tutorials`'
         db.sequelize.query(sql).then(data => {
             cb(resExtra(data, 200, '查询成功！'))
         }).catch(err => {
             logger.error(JSON.stringify(err))
             cb(resExtra('', 605, '查询失败!'))
         })
     },
 
 }
 
 module.exports = sqlOpt
 