/*
 * Connect all of your endpoints together here.
 */
module.exports = function (app) {
  app.use('/api/users', require('./users.js'));  // 用户接口
  app.use('/api/tasks', require('./tasks.js'));  // 任务接口（后续可添加）
  app.use('/api', require('./home.js'));         // 首页接口（最后挂）   
};
