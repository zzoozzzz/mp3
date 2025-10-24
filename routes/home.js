// module.exports = function (router) {

//     var homeRoute = router.route('/');

//     homeRoute.get(function (req, res) {
//         var connectionString = process.env.TOKEN;
//         res.json({ message: 'My connection string is ' + connectionString });
//     });

//     return router;
// }

// ===== routes/home.js =====
const express = require('express');
const router = express.Router();

// GET /api
router.get('/', (req, res) => {
  const connectionString = process.env.TOKEN || 'No TOKEN found';
  res.json({
    message: 'My connection string is ' + connectionString,
  });
});

module.exports = router;

