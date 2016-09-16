var express = require('express');
var assert = require('assert')
var request = require('request');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var app = express();
var API_KEY = process.env.BING_API_KEY;
var MONGO_URL = process.env.MONGOLAB_URI;

app.set('port', (process.env.PORT || 5000));

MongoClient.connect(MONGO_URL, function(err, db) {
  assert.equal(err, null);
  console.log("Connected correctly to server.");
  db.close();
});

var insertDocument = function(db, searchString) {
  var date = new Date();
  db.collection('recent').insertOne({
     "term" : searchString,
     "when" : date
  });
};

app.get('/', function(req, res) {
  MongoClient.connect(MONGO_URL, function (err, db) {
    assert.equal(err, null);
    db.collection('recent').find({}, { _id: 0 }).toArray(function(err, docs) {
      assert.equal(err, null);
      res.send(docs.reverse());
    });
    db.close();
  });
});

app.get('/favicon.ico', function(req, res) {
    res.sendStatus(200);
});

app.get('/:query', function(req, res) {
  var query = req.params.query;

  if (!isNaN(req.query.offset)) {
    query = req.params.query + '&offset=' + req.query.offset
  }

  MongoClient.connect(MONGO_URL, function (err, db) {
    assert.equal(err, null);
    insertDocument(db, req.params.query);
  });

  var options = {
    url: 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=' + query + '&mkt=en-us',
    headers: {
      'Ocp-Apim-Subscription-Key': API_KEY
    }
  };

  request(options, function(err, response, body) {
    assert.equal(err, null);
    var results = JSON.parse(body);
    var arr = [];
    for (var i = 0; i < results.value.length; i++) {
      arr.push({
        "url": results.value[i].contentUrl,
        "snippet": results.value[i].name,
        "thumbmail": results.value[i].thumbnailUrl,
        "context": results.value[i].hostPageUrl
      })
    }
    res.send(arr);
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
