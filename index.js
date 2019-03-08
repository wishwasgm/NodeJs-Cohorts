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
  readline = require('readline');

var app = express();

//rest API requirements
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(fileUpload());

//middleware for create
var getCohorts = function (req, res, next) {
  fs.readFile('DATA', 'utf8', function (err, contents) {
    console.log(contents);
  });
  res.json("Not yet implemented").status(501);
};

var processCohorts = function (req, res, next) {
  debugger;
  if (Object.keys(req.files).length == 0) {
    return res.status(400).send('No files were uploaded 1.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.ordersFile;

  // fs.createReadStream(sampleFile.data)
  //   .on('data', function (data) {
  //     debugger;
  //     try {
  //       data = data.split("\n");
  //       console.log(`data`);
  //       res.status(201).send('Files were uploaded 2.');
  //     }
  //     catch (err) {
  //       console.log(err);
  //     }
  //   })
  //   .on('end', function () {
  //     res.send('File uploaded!');
  //   })
  //   .on('error', (err) => res.status(500).send('Files were uploaded 3. : ' + err));

  var lineReader = readline.createInterface({
    input: require('fs').createReadStream(sampleFile.data)
  });
  
  lineReader.on('line', function (line) {
    console.log('Line from file:', line);
  });

  // Use the mv() method to place the file somewhere on your server
  // sampleFile.mv('./uploads/' + sampleFile.name, function (err) {
  //   if (err)
  //     return res.status(500).send(err);

  //   res.send('File uploaded!');
  // });
};



router.route('/cohorts')
  .post(processCohorts)
  .get(getCohorts);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/v1', router);

app.listen(3000);
module.exports = app;