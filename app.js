var express = require('express');

var dao = require('./dao.js');

var app = module.exports = express.createServer();

var indexName = 'hypernotes';

function identificationMiddleware() {
  return function(req, res, next) {
    if (req.session && req.session.hypernotesIdentity) {
      var userid = req.session.hypernotesIdentity;
      req.currentUser = userid;
    } else {
      req.currentUser = null;
    }
    return next();
  }
};


// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set("view engine", "html");
  app.register(".html", require("jqtpl").express);
  app.set("jsonp callback");
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(identificationMiddleware());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});


// ======================================
// Main pages
// ======================================

app.get('/', function(req, res){
  res.render('index.html', {
  });
});

app.get('/dashboard', function(req, res){
  res.render('dashboard.html', {
  });
});

// ======================================
// User Accounts
// ======================================

app.get('/account/register', function(req, res){
  res.render('account/register.html', {});
});

app.post('/account/register', function(req, res){
  // TODO: check form validates (e.g. password valid etc)
  account = dao.Account.create({
      id: req.body.username
    , email: req.body.email
  });
  account.setPassword(req.body.password);
  account.save(function() {
    req.flash('success', 'Thanks for signing-up');
    // TODO: log them in ...
    res.redirect('/');
  });
});

app.get('/account/login', function(req, res){
  res.render('account/login.html', {});
});

app.post('/account/login', function(req, res){
  var userid = req.body.username;
  var password = req.body.password;
  dao.Account.get(userid, function(account) {
    if (account && account.checkPassword(password)) {
      req.flash('info', 'Welcome, you are now logged in.');
      res.redirect('/');
    } else {
      req.flash('error', 'Bad username or password');
      res.render('account/login.html', {});
    }
  });
});

app.get('/account/logout', function(req, res){
  res.redirect('/');
});

// ======================================
// API
// ======================================

app.get('/api/v1/:objecttype/:id', function(req, res, next) {
  var objName = req.params.objecttype[0].toUpperCase() + req.params.objecttype.slice(1); 
  var klass = dao[objName];
  klass.get(req.params.id, function(domainObj) {
    if (domainObj===null) {
      // next(new Error('Cannot find ' + req.params.objecttype + ' with id ' + req.params.id));
      var msg = 'Cannot find ' + req.params.objecttype + ' with id ' + req.params.id;
      res.send(msg, 404);
    } else {
      res.send(domainObj.toJSON());
    }
  })
});

var apiUpsert = function(req, res) {
    var objName = req.params.objecttype[0].toUpperCase() + req.params.objecttype.slice(1); 
    var klass = dao[objName];
    var data = req.body;
    if (req.params.id) {
      data.id = req.params.id;
    }
    klass.upsert(data, function(outData) {
      res.send(outData)
    });
};

app.post('/api/v1/:objecttype', apiUpsert);
app.put('/api/v1/:objecttype/:id?', apiUpsert);
    
app.get('/api/v1/:objecttype', function(req,res) {
  var objName = req.params.objecttype[0].toUpperCase() + req.params.objecttype.slice(1); 
  var klass = dao[objName];
  q = req.params.q;
  qryObj = {
  }
  klass.search(qryObj)
    .on('data', function(data) {
      var parsed = JSON.parse(data);
      var out = {
        'status': 'ok'
        , 'q': q
        , 'result': parsed.hits
      };
      res.send(out);
    })
    .exec()
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
