'use strict';

//mongoose file must be loaded before all other files in order to provide
// models to other modules
var express = require('express'),
  router = express.Router(),
  bodyParser = require('body-parser'),
  swaggerUi = require('swagger-ui-express'),
  fs = require('fs'),
  fileUpload = require('express-fileupload'),
  swaggerDocument = require('./swagger.json'),
  paginate = require("paginate-array"),
  hateoasLinker = require('express-hateoas-links');

var customersMap = {};
var ordersMap = {};
let cohorts = [];

var app = express();

//rest API requirements
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(hateoasLinker);

//middleware for create
var getCohorts = function (req, res, next) {

  if (Object.keys(customersMap).length === 0) {
    return res.json("No results available");
  }
  let currentFullURL = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
  let currentPage = parseInt(req.query.page) || 1;
  let currentlimit = parseInt(req.query.limit) || 10;
  let paginatedResult = paginate(Object.values(customersMap), currentPage, currentlimit);

  res.json(paginatedResult, [
    { rel: "self", method: "GET", href: `${currentFullURL}?page=${currentPage}&limit=${currentlimit}` },
    { rel: "previous", method: "GET", href: `${currentFullURL}?page=${currentPage == 1 ? paginatedResult.totalPages : currentPage - 1}&limit=${currentlimit}` },
    { rel: "next", method: "GET", href: `${currentFullURL}?page=${currentPage == paginatedResult.totalPages ? 1 : currentPage + 1}&limit=${currentlimit}` }
  ]);
};

var processCohorts = function (req, res, next) {
  if (Object.keys(req.files).length == 0) {
    return res.status(400).send('No files were uploaded 1.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let customerFile = req.files.customersFile;
  let ordersFile = req.files.ordersFile;
  let lineContents = customerFile.data.toString('utf8').split('\n');
  let orderContents = ordersFile.data.toString('utf8').split('\n');
  var orderedDates = [];

  for (let line of lineContents) {
    let custData = line.split(',');
    if (!customersMap[custData[0]]) {
      let actDates = [];
      actDates.push(custData[1]);
      customersMap[custData[0]] = {
        "custId": custData[0],
        "regDate": custData[1],
        "activityDates": actDates
      }
    } else {
      customersMap[custData[0]]["activityDates"].push(custData[1]);
    }
  }

  for (let ordersLine of orderContents) {

    let order = ordersLine.split(',');

    if (order[0] !== "id") {
      if (customersMap[order[2]]) {
        customersMap[order[2]]["activityDates"].push(order[3]);
      }
      orderedDates.push(new Date(order[3]));
      if (!ordersMap[new Date(order[3]).toLocaleDateString()]) {
        let ordersCustomers = new Set();
        ordersCustomers.add(order[2]);
        ordersMap[new Date(order[3])] = {
          "date": new Date(order[3]),
          "customers": [...ordersCustomers]
        }
      } else {
        ordersMap[new Date(order[3])]["customers"].push(order[2]);
      }
    }

  }

  let x = orderedDates.sort(function (d1, d2) {

    var t2 = new Date(d2).getTime();
    var t1 = new Date(d1).getTime();

    return parseInt((t1 - t2) / (24 * 3600 * 1000)) > 0 ? 1 : -1;


  });
  
  let startDate = x[0];
  let endDate = x[x.length - 3];
  let currentDate = startDate;
  while (currentDate <= endDate) {
    currentDate = addDays(currentDate);
    cohorts.push({
      "start": `${currentDate}`,
      "end": `${addDays(currentDate, 6)}`,
      "count": 0,
      "customers": []
    });

  }

  let cohortIndex = 0;

  for (let i = 0; i < x.length; i++) {
    try {
      if (ordersMap[x[i]].date.getTime() <= new Date(cohorts[cohortIndex].end).getTime()) {
        cohorts[cohortIndex].count += 1;
        cohorts[cohortIndex].customers = cohorts[cohortIndex].customers.concat(ordersMap[x[i]].customers);
      } else {
        cohortIndex++;
        cohorts[cohortIndex].count += 1;
        cohorts[cohortIndex].customers = cohorts[cohortIndex].customers.concat(ordersMap[x[i]].customers);
      }

    } catch (e) {
      console.log(e);
    }
  }

    res.send(cohorts);
};

var dateDiff = function (d1, d2) {

  var t2 = new Date(d2).getTime();
  var t1 = new Date(d1).getTime();

  return parseInt((t1 - t2) / (24 * 3600 * 1000));


};

const addDays = function (date, days = 7) {
  var date = new Date(date);
  date.setDate(date.getDate() + days);
  return date;
}



router.route('/cohorts')
  .post(processCohorts)
  .get(getCohorts);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/v1', router);

app.listen(3000);
module.exports = app;