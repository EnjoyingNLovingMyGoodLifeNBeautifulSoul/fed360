var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var cors = require('cors');
var Mailgun = require('mailgun-js');
var async = require('async');
var pg = require('pg');
var bcrypt = require('bcrypt');

const saltRounds = 10;

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use(cors());

/*var corsOptions = {
  origin: '*'
}*/

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

//Your api key, from Mailgun’s Control Panel
var api_key = 'key-2b66aeb552d0359e216a4b0e0a8cad81';

/* This will be used to get a password rest email
app.post('/loginFed360', function(request, response) {
  console.log('/loginFed360 POST received');
  //console.log(JSON.stringify(request.body));
  console.log(request.body.result);
  console.log(JSON.parse(request.body.result));
  var credentials = JSON.parse(request.body.result);

  console.log('data being processed: ' + JSON.stringify(credentials));

  if ((typeof credentials.username == 'undefined') || (credentials.username == '')) {
    console.log('no username or email found');
    response.send('no username or email found');
    return;
  }

  //async.series([
  //function(callback) {
  // read from database
  pg.defaults.ssl = true;
  pg.connect(process.env.DATABASE_URL, function(err, client) {
    if (err) throw err;
    console.log('Connected to postgres! Getting schemas...');

    //client
    //.query('SELECT table_schema,table_name FROM information_schema.tables;')
    //.on('row', function(row) {
    //  console.log(JSON.stringify(row));
    // {"table_schema":"information_schema","table_name":"information_schema_catalog_name"}
    //});
    var query = client.query('SELECT * FROM user_credentials;');
    query.on('row', function(row) {
      console.log(JSON.stringify(row));

      if ((credentials.username == row.username) || (credentials.username == row.email)) {
        console.log(credentials.username + ': username match, checking password');

        console.log('hash length ' + row.salted_hash.length);
        // Load hash from your password DB.
        bcrypt.compare(credentials.password, row.salted_hash, function(err, res) {

          console.log('correctLogin: ' + res);
          if (res == true) {
            console.log(credentials.username + ': verified username and password');
            //response.send('download completed');
            loadProfile(credentials.username, response);
          } else {
            console.log(credentials.username + ': username password does not match');
            response.send('Username or password does not match.');
          }

          client.end.bind(client);
          console.log(credentials.username + ": login database disconnected");

        });
        //{"table_schema":"information_schema","table_name":"information_schema_catalog_name"}

      }

    });
    query.on('end', function() {
      // not used.  triggers after query is over and does wait until bcrypt function is complete

    });
  });
}
*/

//Your domain, from the Mailgun Control Panel
var domain = 'mg.mrrmrr.com';

//Your sending email address
var from_who = 'mail@mg.mrrmrr.com';

app.post('/sendEndorseLink',

  //express.basicAuth('username', 'password'),
  function(request, response) {
    console.log('email received for mailgun emailing');

    // This code section de-circularizes JSON
    // Cases covered are:
    // var a = {b:1}
    // var o = {};
    // o.one = a;
    // o.two = a;
    // one and two point to the same object, but two is discarded:
    // source: http://stackoverflow.com/questions/11616630/json-stringify-avoid-typeerror-converting-circular-structure-to-json
    var JSONString;
    var cache = [];
    JSONString = JSON.stringify(request, function(key, value) {
      if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) {
          // Circular reference found, discard key
          return;
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    });
    cache = null; // Enable garbage collection

    // This code section parses out the To and CC emails
    // as well as the subject line and emails all recipients (except)

    //console.log('JSON string:' + JSONString);
    //console.log(request);
    var from = request.body.from;
    var to = request.body.To;
    var cc = request.body.Cc;

    console.log('from ' + from + ' to ' + to + ' cc ' + cc);

    if (typeof from != 'undefined') {
      var firstPart = from.split('>');
      var fromEmails = [];
      for (var index in firstPart) {
        var secondPart = firstPart[index].split('<');
        if (secondPart[secondPart.length - 1].indexOf('@') != -1) { // Verifies the string has a common email character
          fromEmails.push(secondPart[secondPart.length - 1]);
        }

      }
      if (fromEmails.indexOf('mail@mg.mrrmrr.com') != -1) {
        fromEmails.splice(fromEmails.indexOf('mail@mg.mrrmrr.com'), 1);
      }
	  console.log('fromEmails: ' + fromEmails.toString());
      for (var index in fromEmails) {
        if ((fromEmails[index].indexOf('mailgun') > 0) || 
		    (fromEmails[index].indexOf('sandbox') > 0)) {
          fromEmails.splice(index, 1);
        }
      }
    }

    if (typeof to != 'undefined') {
      var firstPart = to.split('>');
      var toEmails = [];
      for (var index in firstPart) {
        var secondPart = firstPart[index].split('<');
        if (secondPart[secondPart.length - 1].indexOf('@') != -1) { // Verifies the string has a common email character
          toEmails.push(secondPart[secondPart.length - 1]);
        }

      }
      if (toEmails.indexOf('mail@mg.mrrmrr.com') != -1) {
        toEmails.splice(toEmails.indexOf('mail@mg.mrrmrr.com'), 1);
      }
      for (var index in toEmails) {
        if ((toEmails[index].indexOf('mailgun') > 0) || 
		    (toEmails[index].indexOf('sandbox') > 0) ||
            (toEmails[index].indexOf('mrrmrr.com') > 0)) {
          toEmails.splice(index, 1);
        }
      }
    }

    if (typeof cc != 'undefined') {
      firstPart = cc.split('>');
      var ccEmails = [];
      for (var index in firstPart) {
        var secondPart = firstPart[index].split('<');
        if (secondPart[secondPart.length - 1].indexOf('@') != -1) { // Verifies the string has a common email character
          ccEmails.push(secondPart[secondPart.length - 1]);
        }
      }

      if (ccEmails.indexOf('mail@mg.mrrmrr.com') != -1) {
        ccEmails.splice(ccEmails.indexOf('mail@mg.mrrmrr.com'), 1);
      }
    }

    console.log(fromEmails.length + ' From Emails collected:' + fromEmails.toString());
    console.log(toEmails.length + ' To Emails collected:' + toEmails.toString());
    console.log(ccEmails.length + ' Cc Emails collected:' + ccEmails.toString());
    console.log('Subject: ' + request.body.subject);

    // First we initialize our module

    var mailgun = new Mailgun({
      apiKey: api_key,
      domain: domain
    });

    var fed360params = '?project=' + encodeURIComponent(request.body.subject);
    //var fed360params = '?project=' + encodeURIComponent(request.body.subject) +
    //  '&emails=' + toEmails.toString();

    //if (ccEmails.length > 0) {
    //  fed360params = fed360params + ',' + ccEmails.toString();
    //}

    var allDeliveries = {};
    var deliveryRecord = [];
    var deliveryId = '';
    var needsNewDelivery = true;
    var allProfiles = {};
    var fromIds = [];
    var ccIds = [];
    var allEmails = [];

    async.series([
        // load deliveries
        function(callback) {
          getAllDeliveries(allDeliveries, callback);
        },
        // find related delivery id from name
        function(callback) {
          for (var index in allDeliveries) {
            if (allDeliveries[index].name == request.body.subject) {
              needsNewDelivery = false;
              deliveryId = allDeliveries[index].id;
            }
          }
          callback(null, 'success');
        },
        // load ids from emails
        function(callback) {
          if (needsNewDelivery == true) {
            var deliveryName = request.body.subject;
            getEndorsedProfiles(allProfiles, callback);
            //fromId, ccIds, from, to, cc, callback);
          }
        },
        // combine into from and cc sets
        function(callback) {
          if (needsNewDelivery == true) {
            for (var index in allProfiles) {

              for (var index2 in fromEmails) {
                if (allProfiles[index].email == fromEmails[index2]) {
                  fromIds.push(allProfiles[index].id);
                  allEmails.push({
                    'id': allProfiles[index].id,
                    'email': fromEmails[index2]
                  });
                }
              }
              for (var index2 in toEmails) {
                if (allProfiles[index].email == toEmails[index2]) {
                  ccIds.push(allProfiles[index].id);
                  allEmails.push({
                    'id': allProfiles[index].id,
                    'email': toEmails[index2]
                  });
                }
              }
              for (var index2 in ccEmails) {
                if (allProfiles[index].email == ccEmails[index2]) {
                  ccIds.push(allProfiles[index].id);
                  allEmails.push({
                    'id': allProfiles[index].id,
                    'email': ccEmails[index2]
                  });
                }
              }

            }
            //console.log('allEmails ' + allEmails.toString());
            console.log('allEmails length ' + allEmails.length);
          }
          callback(null, 'success');
        },
        // create and assign new delivery if needed
        function(callback) {
          if (needsNewDelivery == true) {
            var deliveryName = request.body.subject;

            createDelivery(deliveryRecord, deliveryName, fromIds, ccIds, callback);
          }
        },
        function(callback) {
          if (needsNewDelivery == true) {
            //console.log('delivery record ' + deliveryRecord);
            deliveryId = deliveryRecord[0].getId();
          }
          callback(null, 'success');
        }

      ],
      //optional callback
      function(err, results) {
        console.log('finishing loading delivery async');
        if (err) {
          console.log('Delivery Async Error: ' + err);
          response.send('Error: ' + err);
        } else {
          // results is now equal to ['one', 'two']
          console.log('delivery id loaded' + deliveryId);

          async.each(allEmails, function(emailItem, callback) {

            // Send email using mailgun
            console.log('Processing email ' + emailItem.email);

            var customFed360params = fed360params +
              '&deliveryId=' + deliveryId +
              '&fromId=' + emailItem.id +
              '&emails=';

            var toEmailList = '';
            for (var index in allEmails) {
              if (allEmails[index].email != emailItem.email) {
                toEmailList = toEmailList + allEmails[index].email + ',';
                //console.log(toEmailList);

              }
            }
            if (toEmailList.charAt(toEmailList.length - 1) == ',') {
              toEmailList = toEmailList.slice(0, toEmailList.length - 1);
            }

            console.log('project param: ' + fed360params);
            console.log('fromId email param: ' + emailItem.id + ', ' + emailItem.email);
            console.log('to emails param: ' + toEmailList);

            //console.log('fed360params: ' + customFed360params + toEmailList);

            var params = {
              to: emailItem.email,
              from: 'mail@mg.mrrmrr.com',
              subject: request.body.subject,
              html: '<html > <head> <meta charset="UTF-8">' +
                ' <title>Fed360 Simple HTML Email Invitation</title>' +
                ' <style>@import url(https://fonts.googleapis.com/css?family=Open+Sans:300,400,800);.fed360-email{font-family: "Open Sans", sans-serif; font-weight: 300;}.fed360-email .fed360{display: inline-block; width: 200px; height: 60px; padding-top: 0px; font-size: 50px; vertical-align: top; font-weight: 800; color: LightGrey;}</style>' +
                ' </head> <body> <div class="fed360-email"> ' +
                '<div class="welcome">Hi,</div><br>' +
                '<div class="invitation">One or more of your team members has invited you to give anonymous endorsements for your team\'s skills.</div><br>' +
                '<a class="link" href="http://codepen.io/OurDailyBread/debug/vLNGoG' +
                customFed360params + toEmailList +
                '">Endorse your team\'s skills</a> <br><br><br><div class="signature">Automated Transaction by the Fed360 Team Endorsement Program</div>' +
                '<div class="fed360">Fed360</div><div class "warning">Please do not reply to this email</div>' +
                '<a href="http://fed360.parseapp.com/" class "website">Visit the Fed360 Homepage</div></div></body></html>'
            };

            // Then we create a mailgun message
            mailgun.messages().send(params, function(err, body) {
              //If there is an error, send error
              if (err) {
                console.log("got an error: ", err);
                callback(err)
              } else {
                console.log('mail ' + request.body.subject + ' submitted');
                console.log(emailItem.email + ',' + toEmailList);
                //console.log(body);

                callback();

              }
            });

          }, function(err) {
            if (err) {
              // One of the iterations produced an error.
              // All processing will now stop.
              console.log(err);
              response.send(err);
            } else {
              console.log('All emails have been processed successfully');
              response.send('all done sending emails');
            }
          });

        }
      });

  },
  function(error) {
    console.log('error receiving email');
    console.log(error);
    response.status(500);
    response.send('Error');
  }
);

//var base = new Airtable({ apiKey: 'keyWInwqgSshQe7GV' }).base('appYLZr7VvVPKZGvf');
var Airtable = require('airtable');
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: 'keyWInwqgSshQe7GV'
});
var base = Airtable.base('appYLZr7VvVPKZGvf');

app.post('/loginFed360', function(request, response) {
  console.log('/loginFed360 POST received');
  //console.log(JSON.stringify(request.body));
  console.log(request.body.result);
  console.log(JSON.parse(request.body.result));
  var credentials = JSON.parse(request.body.result);

  console.log('data being processed: ' + JSON.stringify(credentials));

  if ((typeof credentials.username == 'undefined') || (credentials.username == '')) {
    console.log('no username or email found');
    response.send('no username or email found');
    return;
  }

  //async.series([
  //function(callback) {
  // read from database
  pg.defaults.ssl = true;
  pg.connect(process.env.DATABASE_URL, function(err, client) {
    if (err) throw err;
    console.log('Connected to postgres! Getting schemas...');

    //client
    //.query('SELECT table_schema,table_name FROM information_schema.tables;')
    //.on('row', function(row) {
    //  console.log(JSON.stringify(row));
    // {"table_schema":"information_schema","table_name":"information_schema_catalog_name"}
    //});
    var query = client.query('SELECT * FROM user_credentials;');
    query.on('row', function(row) {
      console.log(JSON.stringify(row));

      if ((credentials.username == row.username) || (credentials.username == row.email)) {
        console.log(credentials.username + ': username match, checking password');

        console.log('hash length ' + row.salted_hash.length);
        // Load hash from your password DB.
        bcrypt.compare(credentials.password, row.salted_hash, function(err, res) {

          console.log('correctLogin: ' + res);
          if (res == true) {
            console.log(credentials.username + ': verified username and password');
            //response.send('download completed');
            loadProfile(credentials.username, response);
          } else {
            console.log(credentials.username + ': username password does not match');
            response.send('Username or password does not match.');
          }

          client.end.bind(client);
          console.log(credentials.username + ": login database disconnected");

        });
        //{"table_schema":"information_schema","table_name":"information_schema_catalog_name"}

      }

    });
    query.on('end', function() {
      // not used.  triggers after query is over and does wait until bcrypt function is complete

    });
  });

  //bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
  // Store hash in your password DB.
  //});

  //response.send('done');
});

app.post('/registerFed360', function(request, response) {
  console.log('/registerFed360 POST received');
  //console.log(JSON.stringify(request.body));
  //console.log(request.body.result);
  //console.log(JSON.parse(request.body.result));
  var credentials = JSON.parse(request.body.result);

  //console.log('data being processed: ' + JSON.stringify(credentials));
  console.log(credentials.email + ': processing data');
  if ((typeof credentials.username == 'undefined') || (credentials.username == '')) {
    if (typeof credentials.email == 'undefined') {
      console.log('no username or email found');
      response.send('no username or email found');
      return;
    }
    //console.log('email: ' + credentials.email);
  } else {
    //console.log('username: ' + credentials.username);
  }

  var existingEmail = false;
  var existingUsername = false;

  // read from database
  pg.defaults.ssl = true;
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    //if (err) throw err;

    var handleError = function(err) {
      // no error occurred, continue with the request
      if (!err) return false;

      // An error occurred, remove the client from the connection pool.
      // A truthy value passed to done will remove the connection from the pool
      // instead of simply returning it to be reused.
      // In this case, if we have successfully received a client (truthy)
      // then it will be removed from the pool.
      if (client) {
        done(client);
      }
      res.writeHead(500, {
        'content-type': 'text/plain'
      });
      res.end('An error occurred'); 
      return true;
    };

    if (err) handleError;

    // callback when connection is finished
    client.on('end', function() {
      console.log(credentials.email + 'Client was disconnected.');
      done();
      response.send('client end - registration complete');
    });

    console.log(credentials.email + ': Connected to postgres! Getting schemas...');

    //client
    //.query('SELECT table_schema,table_name FROM information_schema.tables;')
    //.on('row', function(row) {
    //  console.log(JSON.stringify(row));
    // {"table_schema":"information_schema","table_name":"information_schema_catalog_name"}
    //});
    var query = client.query('SELECT * FROM user_credentials;');
    query.on('row', function(row) {
      //console.log(JSON.stringify(row));

      if (row.email == credentials.email) {
        existingEmail = true;
      }
      if (row.username == credentials.username) {
        existingUsername = true;
      }
    });

    query.on('end', function() {
      console.log(credentials.email + ': registration query completed');

      if ((existingEmail == false) && (existingUsername == false)) {
        console.log(credentials.email + ': no previous email registration found for ' + credentials.email);
        bcrypt.hash(credentials.password, saltRounds, function(err, hash) {
          // Store hash in your password DB.
          //console.log('created hash ' + hash);
          console.log(credentials.email + ': created new hash');
          // write to database
          var query2 = client.query('INSERT INTO user_credentials (email,username,salted_hash) ' +
            'VALUES (\'' + credentials.email + '\',\'' +
            credentials.username + '\',\'' + hash + '\');');
          query2.on('end', function() {
            console.log(credentials.email + ': updated Postgresql database with user registration');
            response.send('registration completed');
            client.end.bind(client);
            console.log(credentials.email + ": Database client was disconnected after registration.");
          });

          //disconnect client when all queries are finished. used as callback
          //client.on('drain', client.end.bind(client)); 

          // callback when connection is finished
          //client.on('end', function(){
          //  console.log("Database client was disconnected.")
          //  response.send('regisration complete');
          //}); 

        });
      } else {
        console.log(credentials.email + ': previous registration exists for ' + credentials.email);
        //disconnect client when all queries are finished. used as callback
        //client.on('drain', client.end.bind(client)); 

        done();
        console.log(credentials.email + ": Database client was disconnected without registering.");
        response.send('Email already registered. No registration completed.');
        client.end.bind(client);

        // callback when connection is finished
        //client.on('end', function(){
        //  

        //});
      }

    }); //disconnect client manually. no callback
  });

  //response.send('done');
});

function loadProfile(username, response) {
  console.log(username + ': loading profile');
  var profileData = {
    'id': '',
    'firstname': '',
    'lastname': '',
    'linkedin': '',
    'supervisoremail': '',
    'email': '',
    'organization': [],
    'competencies': [],
    'endorsements': [],
    'position': [],
    'profilepicture': ''
  };
  var allProfiles = {};
  var profileOrganizations = {};
  var profileCompetencies = {};
  var profileEndorsements = {};
  var profilePositions = {};
  var profileTrainings = {};
  var checkMarkedCompetencies = [];

  async.series([
      function(callback) {
        console.log(username + ': loading all profiles');
        getAllProfiles(username, allProfiles, callback);
      },
      function(callback) {
        console.log(username + ': selecting data for profile');
        for (var index in allProfiles) {
          console.log(username + ': comparing username ' + allProfiles[index].username + ' or email ' + allProfiles[index].email);
          if ((allProfiles[index].username == username) ||
            (allProfiles[index].email == username)) {
            console.log(username + ': located profile');
            profileData['id'] = allProfiles[index].id;
            profileData['firstname'] = allProfiles[index].firstname;
            profileData['lastname'] = allProfiles[index].lastname;
            profileData['email'] = allProfiles[index].email;
            profileData['linkedin'] = allProfiles[index].linkedin;
            profileData['supervisoremail'] = allProfiles[index].supervisoremail;
            profileData['organization'] = allProfiles[index].organization; //id
            profileData['competencies'] = allProfiles[index].competencies;
            profileData['endorsementsreceived'] = allProfiles[index].endorsementsreceived;
            profileData['position'] = allProfiles[index].position;
            profileData['profilepicture'] = allProfiles[index].profilepicture;

            checkMarkedCompetencies = allProfiles[index].checkmarked;
          }
        }
        callback(null, 'success');
      },
      function(callback) {
        console.log(username + ': loading profile organizations');
        async.forEachOf(profileData.organization, function(organizationId, key, callback2) {
          getOrganizationData(username, organizationId, profileOrganizations, callback2);
        }, function(err) {
          if (err) {
            console.error(err.message);
            callback(err);
            return;
          };
          callback(null, 'success');
        });
      },
      function(callback) {
        console.log(username + ': assigning profile organizations');
        delete profileOrganizations['people'];
        delete profileOrganizations['positions'];
        delete profileOrganizations['positionfrom'];
        delete profileOrganizations['positionto'];

        profileData.organization = profileOrganizations;
        callback(null, 'success');
      },
      function(callback) {
        console.log(username + ': loading profile competencies');
        async.forEachOf(profileData.competencies, function(competencyId, key, callback2) {
          getCompetencyData(username, competencyId, profileCompetencies, callback2);
        }, function(err) {
          if (err) {
            console.error(err.message);
            callback(err);
            return;
          };
          callback(null, 'success');
        });
      },
      function(callback) {
        console.log(username + ': assigning profile competencies');
        profileData.competencies = profileCompetencies;
        delete profileData.competencies['type'];
        delete profileData.competencies['endorsements'];
        delete profileData.competencies['people'];
        //console.log(profileData.competencies);

        for (var key in profileData.competencies) {
          profileData.competencies[key].checkmarked = false;
          for (var index in checkMarkedCompetencies) {
            if (key == checkMarkedCompetencies[index]) {
              profileData.competencies[key].checkmarked = true;
            }
          }

        }
        callback(null, 'success');
      },
      function(callback) {
        console.log(username + ': loading profile endorsements');
        async.forEachOf(profileData.endorsementsreceived, function(endorsementId, key, callback2) {
          getEndorsementData(username, endorsementId, profileEndorsements, callback2);
        }, function(err) {
          if (err) {
            console.error(err.message);
            callback(err);
            return;
          };
          callback(null, 'success');
        });
      },
      function(callback) {
        console.log(username + ': assigning profile endorsements');
        profileData.endorsements = profileEndorsements;
        delete profileData.endorsements['timestamp'];
        delete profileData.endorsements['of'];
        delete profileData.endorsements['by'];

        callback(null, 'success');
      },
      function(callback) {
        console.log(username + ': loading profile positions');
        async.forEachOf(profileData.position, function(positionId, key, callback2) {
          getPositionData(username, positionId, profilePositions, callback2);
        }, function(err) {
          if (err) {
            console.error(err.message);
            callback(err);
            return;
          };
          callback(null, 'success');
        });
      },
      function(callback) {
        console.log(username + ': assigning profile positions');
        profileData.position = profilePositions;
        delete profileData.position['series'];
        delete profileData.position['grade'];
        delete profileData.position['movesfrom'];
        delete profileData.position['movesto'];
        delete profileData.position['minpay'];
        delete profileData.position['maxpay'];
        delete profileData.position['payperiod'];
        delete profileData.position['people'];

        callback(null, 'success');
      },
      function(callback) {
        console.log(username + ': loading profile trainings');
        var trainingIdList = [];
        for (var index in profileData.endorsements) {
          var recommendedtrainings = profileData.endorsements[index].recommendedtraining;
          for (var index2 in recommendedtrainings) {
            trainingIdList.push(recommendedtrainings[index2]);
          }
        }
        //console.log(trainingIdList);
        async.forEachOf(trainingIdList, function(trainingId, key, callback2) {
          getTrainingData(username, trainingId, profileTrainings, callback2);
        }, function(err) {
          if (err) {
            console.error(err.message);
            callback(err);
            return;
          };
          callback(null, 'success');
        });
      },
      function(callback) {
        console.log(username + ': assigning profile trainings');
        profileData.training = profileTrainings;
        delete profileData.training['associated'];
        delete profileData.training['recommendations'];

        callback(null, 'success');
      }
    ],
    function(err, results) {
      console.log(username + ': finishing series async');
      if (err) {
        console.log(username + ': Async Error: ' + err);
        response.send('Error: ' + err);
      } else {
        console.log(username + ': Profile data loaded');
        profileData['title'] = profileData['position'];
        //console.log(profileData);
        response.send(profileData);
        // End of loadProfile series
      }
    });

}

function getAllProfiles(username, allProfiles, callback) {
  base('People').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      //console.log('processing profile');
      //console.log(record.get('Profile ID'));
      console.log(username + ': processing profile ' + record.get('Email'));
      allProfiles[record.getId()] = {
        'id': record.getId(),
        'username': record.get('Username'),
        'email': record.get('Email'),
        'firstname': record.get('Name (First)'),
        'lastname': record.get('Name (Last)'),
        'linkedin': record.get('LinkedIn'),
        'supervisoremail': record.get('Direct Supervisor (email)'),
        'organization': record.get('Organization'), //id
        'competencies': record.get('Competencies'),
        'checkmarked': record.get('Check Marked Competencies'),
        'endorsementsreceived': record.get('Endorsements (received)'),
        'endorsementsgiven': record.get('Endorsements (given)'),
        'roles': record.get('Roles'),
        'memberships': record.get('Deliveries'),
        'jobchanges': record.get('Job Changes'),
        'position': record.get('Position'),
        'positionchanges': record.get('Position Changes'),
        'deliveries': record.get('Deliveries'),
        'comments': record.get('Comments'),
        'links': record.get('Links'),
        'attachments': record.get('Attachments'),
        'trainingratings': record.get('Training Ratings'),
        'deliveriescopy': record.get('Deliveries copy'),
        'profilepicture': record.get('Profile Picture')
      };

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {

    if (error) {
      console.log('error:');
      console.log(error);
      return callback(error);
    }
    console.log(username + ': successfully loaded all base profiles');
    return callback(null, 'success');
  });
}

function getOrganizationData(username, organizationId, profileOrganizations, callback) {
  base('Organizations').find(organizationId, function(err, record) {
    if (err) {
      console.log(err);
      callback(err);
      return;
    }

    console.log(username + ': processing organization ' + record.get('Name'));
    profileOrganizations[record.getId()] = {
      'id': record.getId(),
      'name': record.get('Name'),
      'people': record.get('People'),
      'number': record.get('Number'),
      'positions': record.get('Positions'),
      'positionfrom': record.get('Position Changes (from)'),
      'positionto': record.get('Position Changes (to)')
    };

    callback(null, 'sucess');

  });
}

function getCompetencyData(username, competencyId, profileCompetencies, callback) {
  base('Competencies').find(competencyId, function(err, record) {
    if (err) {
      console.log(err);
      callback(err);
      return;
    }

    console.log(username + ': processing competency ' + record.get('Name'));
    profileCompetencies[record.getId()] = {
      'id': record.getId(),
      'name': record.get('Name'),
      'shortdescription': record.get('Short Description'),
      'type': record.get('Type'),
      'link': record.get('Link'),
      'endorsements': record.get('Endorsements'),
      'relatedtrainings': record.get('Related Trainings'),
      'people': record.get('People')

    };

    callback(null, 'success');

  });
}

function getEndorsementData(username, endorsementId, profileEndorsements, callback) {
  base('Endorsements').find(endorsementId, function(err, record) {
    if (err) {
      console.log(err);
      callback(err);
      return;
    }

    console.log(username + ': processing endorsement ' + record.get('Endorsement ID'));
    profileEndorsements[record.getId()] = {
      'endorsementid': record.get('Endorsement ID'),
      'timestamp': record.get('Timestamp'),
      'relateddelivery': record.get('Related Delivery'),
      'competency': record.get('Competency'),
      'of': record.get('Of'),
      'by': record.get('By'),
      'endorsement': record.get('Endorsement'), // endorsed, blank, skipped
      'recommendedtraining': record.get('Recommended Training'),
      'viewedbyendorsee': record.get('Viewed by Endorsee')

    };

    callback(null, 'success');

  });
}

function getPositionData(username, positionId, profilePositions, callback) {
  base('Positions').find(positionId, function(err, record) {
    if (err) {
      console.log(err);
      callback(err);
      return;
    }

    console.log(username + ': processing position ' + record.get('Title'));
    profilePositions[record.getId()] = {
      'title': record.get('Title'),
      'series': record.get('Series (if applicable)'),
      'grade': record.get('Grade (if applicable)'),
      'officialtitle': record.get('Official Title'),
      'shortdescription': record.get('Short Description'),
      'longdescription': record.get('Long Description'),
      'movesfrom': record.get('Moves from'),
      'movesto': record.get('Moves to'),
      'organizations': record.get('Organizations'),
      'minpay': record.get('Pay (min)'),
      'maxpay': record.get('Pay (max)'),
      'payperiod': record.get('Pay Period'),
      'people': record.get('People')

    };

    callback(null, 'success');

  });
}

function getTrainingData(username, trainingId, profileTrainings, callback) {
  base('Trainings').find(trainingId, function(err, record) {
    if (err) {
      console.log(err);
      callback(err);
      return;
    }

    console.log(username + ': processing training ' + record.get('Title'));
    profileTrainings[record.getId()] = {
      'title': record.get('Title'),
      'subtitle': record.get('Subtitle'),
      'abstract': record.get('Abstract'),
      'description': record.get('Description (markdown compatible?)'),
      'link': record.get('Link'),
      'related': record.get('Related Competencies'),
      'associated': record.get('Associated Endorsements'),
      'recommendations': record.get('Recommendations')

    };

    callback(null, 'success');

  });
}

function getAllDeliveries(allDeliveries, callback) {
  base('Deliveries').select({
    // Selecting the first 3 records in Main View:
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.log('Retrieved ', record.get('Name'));
      allDeliveries[record.getId()] = {
        'id': record.getId(),
        'name': record.get('Name'),
        'title': record.get('Title (Subject Line)'),
        'number': record.get('Number'),
        'date': record.get('Date'),
        'from': record.get('Team (From:)'),
        'team': record.get('Team (Cc:)'),
        'customers': record.get('Customers (To:)'),
        'endorsements': record.get('Endorsements'),
        'comments': record.get('Comments'),
        'links': record.get('Links'),
        'attachments': record.get('Attachments')
      };

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log(error);
    } else {
      console.log('successfully loaded all deliveries');
	  //console.log(allDeliveries);
      callback(null, 'success');
    }
  });
}

function getEndorsedProfiles(allProfiles, callback) {
  base('People').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      //console.log('processing profile');
      //console.log(record.get('Profile ID'));
      console.log('processing profile ' + record.get('Email'));
      allProfiles[record.getId()] = {
        'id': record.getId(),
        'firstname': record.get('Name (First)'),
        'lastname': record.get('Name (Last)'),
        'organization': record.get('Organization'), //id
        'email': record.get('Email'),
        'supervisoremail': record.get('Direct Supervisor (email)'),
        'title': record.get('Position'), //id
        'endorsements': record.get('Endorsements (received)'),
        'competencies': record.get('Competencies'),
        'picture': record.get('Profile Picture')
      };

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {

    if (error) {
      console.log('error:');
      console.log(error);
      return callback(error);
    }
    console.log('successfully loaded base profiles');
    return callback(null, 'success');
  });
}

function createDelivery(createdDeliveryRecord, deliveryName, fromIds, ccIds, callback) {
  base('Deliveries').create({
    // Name column is computed title + autonumber
    "Title (Subject Line)": deliveryName,
    "Customers (To:)": [],
    "Team (From:)": fromIds,
    "Endorsements": [],
    "Comments": [],
    "Team (Cc:)": ccIds
  }, function(err, record) {
    if (err) {
      console.log(err);
      callback(err);
      return;
    }
    createdDeliveryRecord.push(record);
    //console.log('delivery record ' + record);
    console.log('created new delivery record ' + record.getId() + ' for ' + record.get('Name'));
    callback(null, 'success');
  });
}

//app.get('/loadProfiles', cors(corsOptions), function(request, response) {
app.get('/loadProfiles', function(request, response) {
  console.log('GET received')
  console.log('loadProfiles called');
  var profilesJSON = {
    'profiles': []
  };
  var loadParameters = JSON.parse(request.query.loadParameters);
  var emails = loadParameters.emails; // Used for messages in URL
  console.log('searching for emails: ');
  console.log(emails);

  //response.setHeader('Access-Control-Allow-Origin','example.com | *');

  var deliveryId = loadParameters.deliveryId;
  console.log('delivery id recieved: ' + deliveryId);

  var submitterId = loadParameters.submitterId;
  console.log('submitter id recevied: ' + submitterId);

  var organizations = {};
  var positions = {};
  var competencies = {};
  var endorsements = {};
  var allDeliveries = {};
  var trainings = {};
  var testCounter = 0;
  var doneCounter = 0;
  async.series([
      function(callback) {
        console.log('loading profile');

        base('People').select({
          view: "Main View"
        }).eachPage(function page(records, fetchNextPage) {

          // This function (`page`) will get called for each page of records.

          records.forEach(function(record) {
            //console.log('processing profile');
            //console.log(record.get('Profile ID'));
            console.log('processing profile ' + record.get('Email'));
            var profile = {
              'id': record.getId(),
              'firstname': record.get('Name (First)'),
              'lastname': record.get('Name (Last)'),
              'organization': record.get('Organization'), //id
              'email': record.get('Email'),
              'supervisoremail': record.get('Direct Supervisor (email)'),
              'title': record.get('Position'), //id
              'endorsements': record.get('Endorsements (received)'),
              'competencies': record.get('Competencies'),
              'picture': record.get('Profile Picture')
            };
            for (var index in emails) {
              if (emails[index] == profile.email) {
                console.log('found ' + emails[index]);
                profilesJSON.profiles.push(profile);

                //console.log(profile);
              }
            }

          });

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();

        }, function done(error) {

          if (error) {
            console.log('error:');
            console.log(error);
            return callback(error);
          }
          console.log('successfully loaded base profiles');
          return callback(null, 'success');
        });

      },

      function(callback2) {
        console.log('loading organization');
        if (profilesJSON.profiles.length == 0) {
          callback2(null, 'success');
          return;
        }
        base('Organizations').select({
          view: "Main View"
        }).eachPage(function page(records, fetchNextPage) {

          // This function (`page`) will get called for each page of records.

          records.forEach(function(record) {
            console.log('processing organization ' + record.get('Name'));
            organizations[record.getId()] = {
              'name': record.get('Name'),
              'people': record.get('People'),
              'number': record.get('Number'),
              'positions': record.get('Positions'),
              'positionfrom': record.get('Position Changes (from)'),
              'positionto': record.get('Position Changes (to)')
            };

          });

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();

        }, function done(error) {
          if (error) {
            console.log('error:');
            console.log(error);
            return callback2(error);
          }
          console.log('successfully loaded organizations');
          //console.log(organizations);
          for (var index in profilesJSON.profiles) {
            if (typeof profilesJSON.profiles[index].organization == 'undefined') {
              continue;
            }
            profilesJSON.profiles[index].organization = organizations[profilesJSON.profiles[index].organization[0]].name;
            console.log('assigned ' + profilesJSON.profiles[index].organization + ' to ' + profilesJSON.profiles[index].firstname + ' profile');
          }
          callback2(null, 'success');
        });

      },

      function(callback3) {
        console.log('loading positions');
        if (profilesJSON.profiles.length == 0) {
          callback3(null, 'success');
          return;
        }
        base('Positions').select({
          view: "Main View"
        }).eachPage(function page(records, fetchNextPage) {

          // This function (`page`) will get called for each page of records.

          records.forEach(function(record) {
            console.log('processing position ' + record.get('Title'));
            positions[record.getId()] = {
              'title': record.get('Title'),
              'series': record.get('Series (if applicable)'),
              'grade': record.get('Grade (if applicable)'),
              'officialtitle': record.get('Official Title'),
              'shortdescription': record.get('Short Description'),
              'longdescription': record.get('Long Description'),
              'movesfrom': record.get('Moves from'),
              'movesto': record.get('Moves to'),
              'organizations': record.get('Organizations'),
              'minpay': record.get('Pay (min)'),
              'maxpay': record.get('Pay (max)'),
              'payperiod': record.get('Pay Period'),
              'people': record.get('People')

            };

          });

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();

        }, function done(error) {
          if (error) {
            console.log('error:');
            console.log(error);
            return callback3(error);
          }
          console.log('successfully loaded positions');

          //console.log(organizations);
          for (var index in profilesJSON.profiles) {
            if ((typeof profilesJSON.profiles[index].title == 'undefined') || (profilesJSON.profiles[index].title.length == 0)) {
              continue;
            }
            var id = profilesJSON.profiles[index].title[0];
            profilesJSON.profiles[index].title = positions[id].title;
            console.log('assigned ' + profilesJSON.profiles[index].title + ' to ' + profilesJSON.profiles[index].firstname + ' profile');
          }
          callback3(null, 'success');
        });

      },

      function(callback4) {
        console.log('loading competencies');
        if (profilesJSON.profiles.length == 0) {
          callback4(null, 'success');
          return;
        }
        base('Competencies').select({
          view: "Main View"
        }).eachPage(function page(records, fetchNextPage) {

          // This function (`page`) will get called for each page of records.

          records.forEach(function(record) {
            console.log('processing competency ' + record.get('Name'));
            competencies[record.getId()] = {
              'name': record.get('Name'),
              'shortdescription': record.get('Short Description'),
              'type': record.get('Type'),
              'link': record.get('Link'),
              'endorsements': record.get('Endorsements'),
              'relatedtrainings': record.get('Related Trainings'),
              'people': record.get('People')

            };

          });

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();

        }, function done(error) {
          if (error) {
            console.log('error:');
            console.log(error);
            return callback4(error);
          }
          console.log('successfully loaded competencies');
          //console.log(competencies);
          for (var index in profilesJSON.profiles) {
            for (var index2 in profilesJSON.profiles[index].competencies) {
              var id = profilesJSON.profiles[index].competencies[index2];
              var competencyJSON = {
                'id': id,
                'name': competencies[id].name,
                'description': competencies[id].shortdescription,
                'readMoreURL': competencies[id].link,
                'checked': true, // enabled (endorsable)
                'competencyEndorsements': 0, // will be filled in next async
                'endorsedTraining': [], // will be filled in following async
                'updateScore': false
              }
              profilesJSON.profiles[index].competencies[index2] = competencyJSON;
              console.log('assigned ' + profilesJSON.profiles[index].competencies[index2].name + ' to ' + profilesJSON.profiles[index].firstname + ' profile');
            }
          }
          callback4(null, 'success');
        });

      },

      function(callback5) {
        console.log('loading endorsements');
        if (profilesJSON.profiles.length == 0) {
          callback5(null, 'success');
          return;
        }
        base('Endorsements').select({
          view: "Main View"
        }).eachPage(function page(records, fetchNextPage) {

          // This function (`page`) will get called for each page of records.

          records.forEach(function(record) {
            console.log('processing endorsement ' + record.get('Endorsement ID'));
            endorsements[record.getId()] = {
              'endorsementid': record.get('Endorsement ID'),
              'timestamp': record.get('Timestamp'),
              'relateddelivery': record.get('Related Delivery'),
              'competency': record.get('Competency'),
              'of': record.get('Of'),
              'by': record.get('By'),
              'endorsement': record.get('Endorsement'),
              'recommendedtraining': record.get('Recommended Training') == 'True' ? true : false

            };

          });

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();

        }, function done(error) {
          if (error) {
            console.log('error:');
            console.log(error);
            return callback5(error);
          }
          console.log('successfully loaded endorsements');
          //console.log(endorsements);
          for (var index in profilesJSON.profiles) {
            var endorsementsFromSubmitter = [];
            for (var index2 in profilesJSON.profiles[index].endorsements) {

              var endorsementId = profilesJSON.profiles[index].endorsements[index2];
              var endorsedCompetencyId = endorsements[endorsementId].competency;

              // skip endorsement if submitter isn't this person
              if (endorsements[endorsementId].by != submitterId) {
                continue;
              }

              // make a copy
              var singleEndorsement = {
                'id': endorsementId,
                'competency': '',
                'training': endorsements[endorsementId].recommendedtraining,
                'delivery': endorsements[endorsementId].relateddelivery,
                'endorsement': endorsements[endorsementId].endorsement
              };

              // update competency trainings from endorsements
              var foundMatchingCompetency = false;
              for (var index3 in profilesJSON.profiles[index].competencies) {
                //console.log('searching if id ' + endorsedCompetencyId + ' = ' + profilesJSON.profiles[index].competencies[index3].id);
                if (endorsedCompetencyId == profilesJSON.profiles[index].competencies[index3].id) {

                  singleEndorsement.competency = profilesJSON.profiles[index].competencies[index3].name;

                  if (endorsements[endorsementId].recommendedtraining != null) {
                    foundMatchingCompetency = true;
                    for (var index4 in endorsements[endorsementId].recommendedtraining) {
                      profilesJSON.profiles[index].competencies[index3].endorsedTraining.push(endorsements[endorsementId].recommendedtraining[index4]);
                      console.log('assigned endorsement training id ' + singleEndorsement.id +
                        ' to ' + profilesJSON.profiles[index].firstname + ' competency ' +
                        profilesJSON.profiles[index].competencies[index3].name);
                    }

                    profilesJSON.profiles[index].competencies[index3].competencyEndorsements++;

                    console.log('incremented ' + profilesJSON.profiles[index].competencies[index3].name +
                      ' for ' + profilesJSON.profiles[index].firstname + ' profile to ' +
                      profilesJSON.profiles[index].competencies[index3].competencyEndorsements);

                  }
                }
              }

              if (foundMatchingCompetency == false) {
                console.log('no matching competency training for ' + endorsementId);
              }

              // add to list of endorsements by this person
              endorsementsFromSubmitter.push(singleEndorsement);

            }

            // only show endorsements from submitter
            profilesJSON.profiles[index].endorsements = endorsementsFromSubmitter;

          }
          callback5(null, 'success');
        });

      },

      function(callback6) {
        console.log('loading trainings');
        if (profilesJSON.profiles.length == 0) {
          callback6(null, 'success');
          return;
        }
        base('Trainings').select({
          view: "Main View"
        }).eachPage(function page(records, fetchNextPage) {

          // This function (`page`) will get called for each page of records.

          records.forEach(function(record) {
            console.log('processing training ' + record.get('Title'));
            trainings[record.getId()] = {
              'title': record.get('Title'),
              'subtitle': record.get('Subtitle'),
              'abstract': record.get('Abstract'),
              'description': record.get('Description (markdown compatible?)'),
              'link': record.get('Link'),
              'related': record.get('Related Competencies'),
              'associated': record.get('Associated Endorsements'),
              'recommendations': record.get('Recommendations')

            };

          });

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();

        }, function done(error) {
          if (error) {
            console.log('error:');
            console.log(error);
            return callback6(error);
          }
          console.log('successfully loaded trainings');
          //console.log(trainings);
          for (var index in profilesJSON.profiles) {

            for (var index2 in profilesJSON.profiles[index].competencies) {

              for (var index3 in profilesJSON.profiles[index].competencies[index2].endorsedTraining) {
                //console.log(profilesJSON.profiles[index].competencies[index2].endorsedTraining[index3]);
                for (var index4 in trainings) {
                  if (profilesJSON.profiles[index].competencies[index2].endorsedTraining[index3] == index4) {
                    var id = index4;
                    profilesJSON.profiles[index].competencies[index2].endorsedTraining[index3] = {
                      'id': index4,
                      'endorsedName': trainings[index4].title,
                      'endorsedDescription': trainings[index4].description,
                      'endorsedReadMoreURL': trainings[index4].link
                    };
                    console.log('assigned training name ' + trainings[index4].title +
                      ' to ' + profilesJSON.profiles[index].competencies[index2].name + ' competency ' +
                      profilesJSON.profiles[index].firstname);
                  } else {
                    if (index4 == (Object.keys(trainings)).length - 1) {
                      console.log('no tranings found for id ' + index4);

                    }
                  }
                }

              }
            }
          }
          callback6(null, 'success');
        });

      },
      function(callback7) {
        getAllDeliveries(allDeliveries, callback7);
      }
    ],
    //optional callback
    function(err, results) {
      console.log('finishing async');
      if (err) {
        console.log('Async Error: ' + err);
        response.send('Error: ' + err);
      } else {
        // results is now equal to ['one', 'two']
        //var profileRecord = results[0];
        console.log('all profiles loaded');
        // include all trainings
        //console.log('trainings:');
        //console.log(trainings);
        profilesJSON.trainings = trainings;
        //console.log('profiles:');
        //console.log(profilesJSON.trainings);
		//console.log('all deliveries');
		//console.log(allDeliveries);
		console.log('delivery id for comparison: ' + deliveryId);
        profilesJSON.delivery = allDeliveries[deliveryId];
        console.log('deliveries:');
        console.log(profilesJSON.deliveries);
        console.log('full string:');
        //console.log(profilesJSON);
        console.log('returning compiled profiles in response');
        response.send(JSON.stringify(profilesJSON));
      }
    });

});

app.post('/saveProfile', function(request, response) {
  console.log('POST received');
  saveProfile(request, response);
  //response.send('done');
});

function saveProfile(request, response) {
  console.log('starting save Profile');
  //console.log(JSON.stringify(request.body));
  console.log(request.body.profile);
  console.log(JSON.parse(request.body.profile));
  var profileJSON = JSON.parse(request.body.profile);
  var profileId = '';
  console.log('data being processed: ' + JSON.stringify(profileJSON));

  if ((typeof profileJSON.username == 'undefined') || (profileJSON.username == '')) {
    if (typeof profileJSON.email == 'undefined') {
      console.log('no username or email found');
      response.send('no username or email found');
      return;
    }
    console.log('email: ' + profileJSON.email);
    profileId = profileJSON.email;
    //getProfileJSON = getProfile(profileId, getProfileJSON);
  } else {
    console.log('username: ' + profileJSON.username);
    profileId = profileJSON.username;
    //getProfileJSON = getProfile(profileId, getProfileJSON);
  }

  var profileRecord = [];
  var organizationRecords = []; // list of updated organizations including newly created ones
  var allOrganizationRecords = [];
  var positionRecord = [];
  var allPositionRecords = [];

  console.log('initial organizationRecord size: ' + organizationRecords.length);

  async.series([
      function(callback) {
        console.log('processing profile');
        getProfile(profileId, profileJSON, profileRecord, callback);
      },
      function(callback) {
        console.log('profile record id: ' + (profileRecord.length > 0 ? profileRecord[0].getId() : 'no record found'));
        getAllOrganizations(profileJSON, callback, allOrganizationRecords);
      },
      function(callback) {
        console.log('processing organization');
        var listOfUploadedOrganizations = [];
        /*for (var key in profileJSON.organization) {
          listOfUploadedOrganizations.push(profileJSON.organization[key].name);
        }
        console.log('organizations: ' + listOfUploadedOrganizations.toString());
        var organizationNames = profileJSON.organizationNames.split(',');*/
        var organizationNames = profileJSON.organizationNames.split(',');
        async.each(organizationNames, function(organizationName, callback2) {
          console.log('async organizationRecord size: ' + organizationRecords.length);
          getOrganization(organizationName, profileJSON, callback2, organizationRecords, allOrganizationRecords);
        }, function(error) {
          console.log('organizationRecords: ' + organizationRecords);
          if (error) {
            console.log('Error: ' + error);
            callback(error);
            return;
          } else {
            console.log('done getting or creating all new organization records.');
            console.log('number of organizations being updated: ' + organizationRecords.length);

            var idsOfNewOrganizations = '';
            for (var key in organizationRecords) {
              idsOfNewOrganizations += organizationRecords[key].getId() + ',';
            }
            idsOfNewOrganizations = idsOfNewOrganizations.substring(0, idsOfNewOrganizations.length - 1);
            console.log('list of new organizations: ' + idsOfNewOrganizations);
            callback(null, organizationRecords);
          }
        });

        // getOrganization(profileJSON.organization, profileJSON, callback);
      },
      function(callback) {
        updateOrganization(profileJSON, profileRecord[0], organizationRecords, allOrganizationRecords, callback);
      },
      function(callback) {
        removeNameFromOrganization(profileJSON, callback, organizationRecords, allOrganizationRecords);
      },
      function(callback) {
        // refresh list
        allOrganizationRecords = [];
        getAllOrganizations(profileJSON, callback, allOrganizationRecords);
      },
      function(callback) {
        deleteUnusedOrganizations(profileJSON, callback, organizationRecords, allOrganizationRecords);
      },
      function(callback) {
        getAllPositions(profileJSON, callback, allPositionRecords);
      },
      function(callback) {
        updatePositions(profileJSON, profileRecord[0], organizationRecords, allPositionRecords, positionRecord, callback);
      },
	  function(callback) {
		deleteUnusedPositions(profileJSON, allPositionRecords, positionRecord, callback);
	  },
      function(callback) {
        updateProfile(profileJSON, profileRecord[0], organizationRecords, positionRecord, callback);
      }

    ],
    //optional callback
    function(err, results) {
      console.log('finishing async');
      if (err) {
        console.log('Error: ' + err);
        response.send('Error: ' + err);
      } else {
        console.log('Successfully added/updated record: ' + profileJSON.username + ' name: ' + profileJSON.firstname + ' ' + profileJSON.lastname + '\n');
        response.send('Successfully added/updated record: ' + profileJSON.username + ' name: ' + profileJSON.firstname + ' ' + profileJSON.lastname + '\n');
      }
    });

}

function getProfile(ID, profileJSON, profileRecord, callback) {
  console.log('getting profile for ' + ID);
  var foundRecord;
  base('People').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.log('received profile record: ' + record.get('Profile ID'));
      //console.log(JSON.stringify(record));
      if (record.get('Profile ID') == ID) {
        console.log('found ID: ' + ID);
        console.log('Located existing profile ' + record.getId());
        foundRecord = record;

      }
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log('getProfile error: ' + error);
      callback('getProfile error: ' + error, null);
    } else {
      if (typeof foundRecord == 'undefined') {
        console.log('no profile found for ' + ID);
        addProfile(profileJSON, callback);
      } else {
        console.log('completed profile search: ' + foundRecord.get('Profile ID'));
        profileRecord.push(foundRecord);
        callback(null, foundRecord);
      }

    }
  });

}

function addProfile(profileJSON, callback) {
  console.log('adding profile: ' + profileJSON.firstname);
  // save profile to Airtable
  base('People').create({
    "Username": profileJSON.username,
    "Name (First)": profileJSON.firstname,
    //"Password": profileJSON.password,
    "Name (Last)": profileJSON.lastname,
    //"Endorsements (received)": [],
    //"Endorsements (given)": [],
    //"Deliveries": [],
    //"Organization": '',
    "Direct Supervisor (email)": profileJSON.supervisoremail,
    "Email": profileJSON.email,
    //"Job Changes": [],

    //"Training Ratings": "1", // ask Logan about this
    //"Deliveries copy": []
  }, function(err, record) {
    if (err) {
      console.log('addProfile error: ' + err);
      callback('addProfile error: ' + err, null);
    } else {
      console.log('profile added: ' + record.getId());
      console.log(record);
      callback(null, record);
    }

  });

}

function updateProfile(profileJSON, profileRecord, organizationRecords, positionRecord, response) {
  console.log('updating profile: ' + profileRecord.get('Profile ID') + ' for ' + profileRecord.organization);

  var organizationIds = [];
  for (var key in organizationRecords) {
    organizationIds.push(organizationRecords[key].getId());
  }

  base('People').update(profileRecord.getId(), {
    "Name (First)": profileJSON.firstname,
    //"Password": profileJSON.password,
    "Name (Last)": profileJSON.lastname,
    //"Endorsements (received)": profileRecord.get('Endorsements (received)'),
    //"Endorsements (given)": profileRecord.get('Endorsements (given)'),
    //"Deliveries": profileRecord.get('Deliveries'),
    "Position": positionRecord,
    "Organization": organizationIds,
    "Direct Supervisor (email)": profileJSON.supervisoremail,
    "Email": profileJSON.email,
    //"Job Changes": profileRecord.get('Job Changes'),
    "Username": profileJSON.username //,
      //"Training Ratings": "1", // ask Logan about this
      //"Deliveries copy": profileRecord.get('Deliveries copy')
  }, function(err, record) {
    if (err) {
      console.log('updateProfile error: ' + err);
      response.send('Error: ' + err + '\n');
    } else {
      console.log('profile updated: ' + record.getId());
      //response.send('Sucessfully added/updated record: ' + record.getId());
    }
  });

}

function getAllOrganizations(profileJSON, callback, allOrganizationRecords) {

  console.log('getting all organizations');

  base('Organizations').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.log('recieved organization record ' + record.get('Name'));
      allOrganizationRecords.push(record);

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log('getAllOrganizations error: ' + error);
      callback('Error: ' + error, null);
    } else {
      console.log('total organization records length: ' + allOrganizationRecords.length);
      callback(null, 'success');
    }
  });
}

function getOrganization(organizationName, profileJSON, callback, organizationRecords, allOrganizationRecords) {
  console.log('getting organization ID: ' + organizationName);

  var foundOrganization = false;
  for (var key in allOrganizationRecords) {
    if (allOrganizationRecords[key].get('Name') == organizationName) {
      console.log('Located existing organization ' + allOrganizationRecords[key].get('Name'));
      organizationRecords.push(allOrganizationRecords[key]);
      console.log('organization records length: ' + organizationRecords.length);
      callback(null, allOrganizationRecords[key]);
      foundOrganization = true;
    }
  }
  if (foundOrganization == false) {
    addOrganization(profileJSON, callback, organizationRecords, organizationName);
  }

}

function addOrganization(profileJSON, callback, organizationRecords, organizationName) {
  console.log('adding organization: ' + organizationName);
  // add organziation to organziation table
  base('Organizations').create({
    "Name": organizationName,
    "People": [],
    "Positions": [],
    "Position Changes (from)": [],
    "Position Changes (to)": [],
	"Predefined": 'False'
  }, function(err, record) {
    if (err) {
      console.log('addOrganization error: ' + err);
      callback('addOrganization error: ' + err, null);
    } else {
      console.log('organization added: ' + organizationName);
      organizationRecords.push(record);
      callback(null, record);
    }
  });
}

function updateOrganization(profileJSON, profileRecord, organizationRecords, allOrganizationRecords, callback) {
  console.log('preparing to update organizations: ' + organizationRecords.length);

  async.each(organizationRecords, function(organization, callback2) {
    console.log('preparing to update organization/profile: ' + organization.get('Name') + ' for ' + profileRecord.get('Profile ID') + ' with id ' + profileRecord.getId());
    // add profile id to the list of people in the organization if it has not been added before
    var people = typeof organization.get('People') == 'undefined' ? [] : organization.get('People');
    console.log('People array(' + people.length + '): ' + people);
    if (people.indexOf(profileRecord.getId()) == -1) {
      people.push(profileRecord.getId());
    }
    var newOrganizationName = '';
    // old organization needs name updated
    for (var key in profileJSON.organization) {
      if (profileJSON.organization[key].id == organization.getId()) {
        console.log('updating organization id ' + profileJSON.organization[key].id + ' to ' + profileJSON.organization[key].name);
        newOrganizationName = profileJSON.organization[key].name;
      }
    }
    // new organization needs people column updated
    if (newOrganizationName == '') {
      newOrganizationName = organization.get('Name');
    }

    base('Organizations').update(organization.getId(), {
      "Name": newOrganizationName,
      "People": people,
      "Positions": organization.get('Positions'),
      //"Position Changes (from)": organizationRecord.get('Position Changes (from)'),
      //"Position Changes (to)": organizationRecord.get('Position Changes (to)')
    }, function(err, record) {
      if (err) {
        console.log('updateOrganization error:' + err);
        callback2(error);
      } else {
        console.log('organization updated: ' + record.getId() + ' ' + record.get('Name'));
        callback2(null, 'success');
      }
    });

  }, function(error) {
    if (error) {
      console.log('Error: ' + error);
      callback(error);
      return;
    } else {
      console.log('done adding or updating organizations, positions, and Position Changes.');
      callback(null, 'success');
    }
  });

}

function removeNameFromOrganization(profileJSON, callback, organizationRecords, allOrganizationRecords) {
  // add profile id to the list of people in the organization if it has not been added before

  console.log('calling removeNameFromOrganization');

  var listOfOrganizationsToUpdate = [];

  // remove person from organization
  var removePersonFromOrganization = true;
  for (var key in allOrganizationRecords) {
    for (var key2 in organizationRecords) {
      console.log('comparing organization id ' + allOrganizationRecords[key].getId() + ' to ' + organizationRecords[key2].getId());
      if (allOrganizationRecords[key].getId() == organizationRecords[key2].getId()) {
        console.log('matching ids found');
        removePersonFromOrganization = false;
      }
    }
    if (removePersonFromOrganization == true) {

      var updatedOrganization = {
        'reducedPeopleList': [],
        'organization': ''
      };

      var reducedPeopleList = [];
      var people = typeof allOrganizationRecords[key].get("People") == 'undefined' ? [] : allOrganizationRecords[key].get("People");
      console.log('updating profile ' + profileJSON.firstname + ' ' + profileJSON.lastname + ' People array: ' + people.toString());

      for (var index in people) {
        if (people[index] != profileJSON.id) {
          reducedPeopleList.push(people[index]);
        }
      }
      updatedOrganization.reducedPeopleList = reducedPeopleList;
      updatedOrganization.organization = allOrganizationRecords[key];
      listOfOrganizationsToUpdate.push(updatedOrganization);
    } else {
      removePersonFromOrganization = true;
    }

  }

  console.log('number of organizations to clear name: ' + listOfOrganizationsToUpdate.length);

  async.each(listOfOrganizationsToUpdate, function(organizationJSON, callback2) {
    console.log('preparing to clear name in organization: ' + profileJSON.firstname + ' ' + profileJSON.lastname + ' for ' + organizationJSON.organization.get('Name'));

    base('Organizations').update(organizationJSON.organization.getId(), {
      "People": organizationJSON.reducedPeopleList
    }, function(err, record) {
      if (err) {
        console.log('remove name from organization error:' + err);
        callback2(error);
      } else {
        console.log('removed name from organization: ' + record.getId() + ' ' + record.get('Name'));
        callback2(null, 'success');
      }
    });

  }, function(error) {
    if (error) {
      console.log('Error: ' + error);
      callback(error);
      return;
    } else {
      console.log('done removing names from organizations.');
      callback(null, 'success');
    }
  });
}

// removes name from removed organizations and deletes the organization if there is no name left
function deleteUnusedOrganizations(profileJSON, callback, organizationRecords, allOrganizationRecords) {
  console.log('deleting unused organizations');

  var listOfOrganizationIdsToDelete = [];
  for (var index in allOrganizationRecords) {
    var numberOfPeople = typeof allOrganizationRecords[index].get('People') == 'undefined' ? 0 : allOrganizationRecords[index].get('People').length;
    console.log('checking organzation ' + allOrganizationRecords[index].get('Name') + '. it has ' + numberOfPeople + ' name/names left');
    if (numberOfPeople == 0) {
      console.log('found organzation ' + allOrganizationRecords[index].get('Name') + ' has 0 names left');
      var updatedOrganization = false;
      // get id of organization that has zero names left
      for (var index3 in organizationRecords) {
        if (organizationRecords[index3].getId() == allOrganizationRecords[index].getId()) {
          updatedOrganization = true;
        }
      }
      // update said organization
      if (updatedOrganization == false) {
		if (allOrganizationRecords[index].get('Predefined') == 'True') {
			console.log('organization ' + allOrganizationRecords[index].get('Name') + 'is predefined and cannot be deleted');
		} else {
			console.log('adding unused organzation ' + allOrganizationRecords[index].get('Name') + ' to list to delete');
			listOfOrganizationIdsToDelete.push(allOrganizationRecords[index]);
		}
        
      }

    }
  }

  async.each(listOfOrganizationIdsToDelete, function(organization, callback2) {
    console.log('preparing to delete organization: ' + organization.get('Name') + ' for ' + profileJSON.firstname + ' ' + profileJSON.lastname);

    // delete organziation from organziation table
    base('Organizations').destroy(organization.getId(), function(err) {
      if (err) {
        console.log('deleteUnusedOrganization error: ' + err);
        callback2('deleteUnusedOrganization error: ' + err, null);
      } else {
        console.log('organization ' + organization.get('Name') + ' deleted: ');
        callback2(null, 'success');
      }
    });

  }, function(error) {
    if (error) {
      console.log('Error: ' + error);
      callback(error);
      return;
    } else {
      console.log('done deleting ' + listOfOrganizationIdsToDelete.length + ' unused organizations');
      callback(null, 'success');
    }
  });
}

function getAllPositions(profileJSON, callback, allPositionRecords) {

  console.log('getting all positions');

  base('Positions').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.log('recieved position record ' + record.get('Title'));
      allPositionRecords.push(record);

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log('getAllPosition error: ' + error);
      callback('Error: ' + error, null);
    } else {
      console.log('total position records length: ' + allPositionRecords.length);
      callback(null, 'success');
    }
  });
}

function updatePositions(profileJSON, profileRecord, organizationRecords, allPositionRecords, positionRecord, callback) {
  console.log('calling updatePositions for profile id: ' + profileJSON.id + ' name: ' + profileJSON.firstname + ' ' + profileJSON.lastname);
  var positionKey = Object.keys(profileJSON.position)[0];
  console.log('position key of profileRecord: ' + positionKey);
  console.log('preparing to update 1st position: ' +
    (typeof profileJSON.position[positionKey] == 'undefined' ? 'undefined' : profileJSON.position[positionKey].officialtitle) +
    ' to ' + profileJSON.newtitle);

  // assign if existing record with title is present
  var titleExists = false;
  for (var index in allPositionRecords) {
    if (allPositionRecords[index].get('Official Title') == profileJSON.newtitle) {
      console.log('Title/position exists of ' + profileJSON.newtitle);
      titleExists = true;
    }
  }
  if (titleExists == false) {
    if (typeof profileJSON.newtitle != 'undefined') {
      // add title to position table

      var organizationIds = [];
      for (var key in organizationRecords) {
        organizationIds.push(organizationRecords[key].getId());
      }
      console.log('creating position record: ' + profileJSON.newtitle + ' with ' + organizationIds + ' and people ' + profileJSON.id);
      base('Positions').create({
        //"Series (if application)": [],
        //"Grade (if application)": [],
        "Official Title": profileJSON.newtitle,
        "Organizations": organizationIds,
        //"People": ['rec2G23lF9nnxdbXL']
        "People": [profileJSON.id]
      }, function(err, record) {
        if (err) {
          console.log('addPosition error: ' + err);
          callback('addPosition error: ' + err, null);
        } else {
          console.log('position added: ' + profileJSON.title);
          positionRecord.push(record.getId());
          callback(null, record);
        }
      });

    } else {
      console.log('No new title/position or previous title/position found');
    }
    return;
  }
  console.log('updating positions');
  async.forEachOf(allPositionRecords, function(position, recordId, callback2) {
		var updateRecord = 'retain names';
		
		var people = typeof position.get('People') == 'undefined' ? [] : position.get('People');
		if (people.indexOf(profileJSON.id) == true) {
			// person has that position
			if (position.get('Official Title') != positionRecord.get('Official Title')) {
				// person's new position is not the same as the old one.  use the reduced people list
				updateRecord = 'remove name';
			} else {
				updateRecord = 'add name';
			}
		}
		
		var reducedPeopleSet = typeof position.get('People') == 'undefined' ? [] : position.get('People');
		reducedPeopleSet.splice(reducedPeopleSet.indexOf(profileJSON.id), 1);
		
		if (updateRecord != 'retain names') {
			if (updateRecord == 'add name' ) {
				console.log('official title: ' + position.get('Official Title'));
				console.log('add position record: ' + position.get('Official Title') + ' for ' + profileJSON.firstname + ' ' + profileJSON.lastname);
			} else if (updateRecord == 'remove name') {
				console.log('update position record: ' + position.get('Official Title') + ' for ' + profileJSON.firstname + ' ' + profileJSON.lastname);
			}
			
			// Airtable automatically updates cross referenced linked columns, however, in case this changes or is slow or asynchronous, its good to update it manually
			var newOrganizationIds = [];
			for (var index in organizationRecords) {
			  newOrganizationIds.push(organizationRecords[index].getId());
			}
			console.log('new organizations: ' + newOrganizationIds.toString());
			
			base('Positions').update(recordId, {
			  "Official Title": profileJSON.newtitle,
			  "People": updateRecord == 'add name' ? people : reducedPeopleSet,
			  "Organizations": newOrganizationIds
			}, function(err, record) {
			  if (err) {
				console.log('updatePosition error:' + err);
				callback2(err);
			  } else {
				console.log('position updated: ' + record.getId());
				callback2(null, 'success');
			  }
			});
			
		}
		
	  
  }, function(error) {
    if (error) {
      console.log('Error: ' + error);
      callback(error);
      return;
    } else {
      console.log('done adding or updating organizations, positions, and Position Changes.');
      callback(null, 'success');
    }
  });
  /* This updates all new positions. a new process should check to which positions have been updated including those positions that no longer include that person and update those
  console.log('number of positions to update: ' + Object.keys(profileJSON.position).length);
  async.forEachOf(profileJSON.position, function(position, recordId, callback2) {

    console.log('updating position/profile: ' + position.officialtitle + ' for ' + profileRecord.get('Profile ID') + ' with record id ' + recordId + ' to ' + profileJSON.newtitle);
    // add profile id to the list of people in the organization if it has not been added before
    var people = typeof position.people == 'undefined' ? [] : position.people;
    console.log('People array: ' + people.toString());
    console.log('Profile Id: ' + profileRecord.getId());
    if (people.indexOf(profileRecord.getId()) == -1) {
      console.log('adding ' + profileRecord.getId() + ' to people ');
      people.push(profileRecord.getId());
      console.log('people: ' + people.toString());
    }
    console.log('Updated people array: ' + people.toString());

    var newOrganizationIds = [];
    for (var index in organizationRecords) {
      newOrganizationIds.push(organizationRecords[index].getId());
    }
    console.log('new organizations: ' + newOrganizationIds.toString());

    console.log('recordId : ' + recordId);
    base('Positions').update(recordId, {
      "Official Title": profileJSON.newtitle,
      "People": people,
      "Organizations": newOrganizationIds
    }, function(err, record) {
      if (err) {
        console.log('updatePosition error:' + err);
        callback2(err);
      } else {
        console.log('position updated: ' + record.getId());
        positionRecord.push(record.getId());
        callback2(null, 'success');
      }
    });

  }, function(error) {
    if (error) {
      console.log('Error: ' + error);
      callback(error);
      return;
    } else {
      console.log('done adding or updating organizations, positions, and Position Changes.');
      callback(null, 'success');
    }
  });*/

}

function getPosition(position, profileJSON, callback) {
  console.log('getting position ID: ' + position);
  var foundRecord;
  base('Positions').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.log('recieved position record ' + record.get('Title'));
      if (record.get('Title') == position) {
        console.log('Located existing position ' + record.get('Title'));
        foundRecord = record;
      }

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log('getPosition error: ' + error);
      callback('Error: ' + error);
    } else {
      if (typeof foundRecord == 'undefined') {
        console.log('no position found for ' + position);
        addOrganization(profileJSON, callback);
      } else {
        console.log('completed position search');
        callback(null, foundRecord);
      }

    }
  });

}

function addPosition(profileJSON, callback) {
  console.log('adding position: ' + profileJSON.title);
  // add title to position table
  base('Positions').create({
    //"Series (if application)": [],
    //"Grade (if application)": [],
    "Official Title": profileJSON.title,
    //"Short Description": [],
    //"Long Description": [],
    //"Moves from": [], // linked from Position Changes table
    //"Moves to": [], // linked from Position Changes table
    "Organizations": profileJSON.organization.split(','),
    //"Pay (min)": 0, // obtained from Position Changes table
    //"Pay (max)": 0, // obtained from Position Changes table
    //"Pay Period": "Annual", // obtained from Position Changes table
    "People": [profileJSON.id]

  }, function(err, record) {
    if (err) {
      console.log('addPosition error: ' + err);
      callback('addPosition error: ' + err, null);
    } else {
      console.log('position added: ' + profileJSON.title);
      callback(null, record);
    }
  });
}

app.post('/updateProfilePicture', function(request, response) {
  console.log('POST received');
  updateProfilePicture(request, response);
  //response.send('done');
});

// removes name from removed positions and deletes the organization if there is no name left
function deleteUnusedPositions(profileJSON, allPositionRecords, positionRecord, callback) {
  console.log('deleting unused positions');

  var listOfPositionsToDelete = [];
  for (var index in allPositionRecords) {
    var numberOfPeople = typeof allPositionRecords[index].get('People') == 'undefined' ? 0 : allPositionRecords[index].get('People').length;
    console.log('checking position ' + allPositionRecords[index].get('Official Title') + '. it has ' + numberOfPeople + ' people left');
    if (numberOfPeople == 0) {
		console.log('found position ' + allPositionRecords[index].get('Official Title') + ' has 0 names left');
		if (allPositionRecords[index].get('Predefined') == 'True') {
			console.log('position ' + allPositionRecords[index].get('Official Title') + ' is predefined and cannot be deleted');
		} else {
			console.log('adding unused position ' + allPositionRecords[index].get('Official Title') + ' to list to delete');
			listOfPositionsToDelete.push(allPositionRecords[index]);
		}
    }
  }
  
  console.log('number of positions to delete: ' + listOfPositionsToDelete.length);

  async.each(listOfPositionsToDelete, function(position, callback2) {
    console.log('preparing to delete position: ' + position.get('Official Title') + ' for ' + profileJSON.firstname + ' ' + profileJSON.lastname);

    // delete organziation from organziation table
    base('Positions').destroy(position.getId(), function(err) {
      if (err) {
        console.log('deleteUnusedPosition error: ' + err);
        callback2('deleteUnusedPosition error: ' + err, null);
      } else {
        console.log('position ' + position.get('Position') + ' deleted: ');
        callback2(null, 'success');
      }
    });

  }, function(error) {
    if (error) {
      console.log('Error: ' + error);
      callback(error);
      return;
    } else {
      console.log('done deleting ' + listOfPositionsToDelete.length + ' unused position');
      callback(null, 'success');
    }
  });
}

function updateProfilePicture(request, response) {
  var profileJSON = JSON.parse(request.body.profile);

  console.log('updating profile picture for: ' + profileJSON.firstname + ' ' + profileJSON.lastname);

  base('People').update(profileJSON.id, {
    "Profile Picture": profileJSON.profilepicture
  }, function(err, record) {
    if (err) {
      console.log('updateProfilePicture error: ' + err);
      response.send('Error: ' + err + '\n');
    } else {
      console.log('updateProfilePicture successful for ' + profileJSON.firstname + ' ' + profileJSON.lastname + ': ' + profileJSON.profilepicture);
      response.send('Sucessfully updated profilepicture for People table ID: ' + record.getId());
    }
  });

}
/*
function updatePosition(profileJSON, profileRecord, organizationRecords, positionRecord, response) {
  if (profileRecord
  
  console.log('preparing to update position: ' + positionRecord.get('Title') + ' for ' + profileRecord.get('Profile ID'));
  var people = typeof positionRecord.get('People') == 'undefined' ? [] : positionRecord.get('People');
  console.log('People array: ' + people.toString());
  if (people.indexOf(profileRecord.getId()) == -1) {
    people.push(profileRecord.getId());
  }
  
  var newOrganizations = [];
  for (var key in organizationRecords) {
    newOrganizations.push(key);
  }

  base('Position').update(positionRecord.getId(), {
    "Official Title": profileRecord.officialtitle,
  "People": profileRecord.people,
  "Organizations": newOrganizations
  }, function(err, record) {
    if (err) {
      console.log('updatePosition error:' + err);
      response.send('updatePosition error:' + err + '\n');
    } else {
      console.log('position updated: ' + record.getId());
      response.send('Successfully added/updated record: ' + record.getId() + '\n');
    }
  });
}*/

app.post('/saveEndorsements', function(request, response) {
  console.log('POST received');
  console.log('starting save Endorsements');
  if (typeof request.body == 'undefined') {
    console.log('request body is undefined');
    response.send('undefined body');
  }

  //console.log(request.body.results);
  //console.log(JSON.parse(request.body.results));
  var profilesJSON = JSON.parse(request.body.results);
  var profileId = '';
  console.log('profiles received: ' + profilesJSON.profiles.length);
  //console.log('data being processed: ' + JSON.stringify(profilesJSON));

  // For testing
  //profilesJSON.delivery = {
  //  'id': 'recXyBASMPAOe7vBX'
  //};

  //profilesJSON.submitter = {
  //  'id': 'recu52h0rS87Ze2Pa'
  //};
  console.log('submitter: ' + profilesJSON.submitter.id);
  console.log('delivery id: ' + profilesJSON.delivery.id);

  var allEndorsements = {};
  var removeEndorsements = [];

  async.series([
      function(callback) {
        loadEndorsements(allEndorsements, callback);
      },

      function(callback) {
        console.log('saving endorsement');

        var date = new Date();
        // Timestamp format: 2016-01-25T17:10:00.000Z
        var twoDigitMonth = ("0" + date.getMonth().toString()).slice(-2);
        var twoDigitDay = ("0" + date.getDate().toString()).slice(-2);
        var twoDigitHour = ("0" + date.getHours().toString()).slice(-2);
        var twoDigitMinute = ("0" + date.getMinutes().toString()).slice(-2);
        var twoDigitSecond = ("0" + date.getSeconds().toString()).slice(-2);
        var threeDigitMillisecond = ("00" + date.getMilliseconds().toString()).slice(-3);

        var dateString = date.getFullYear() + '-' + twoDigitMonth + '-' + twoDigitDay + 'T' +
          twoDigitHour + ':' + twoDigitMinute + ':' + twoDigitSecond + '.' + threeDigitMillisecond + 'Z';

        // compile list of all endorsements(including skipped and blank ones)
        var endorsements = [];
        for (var index in profilesJSON.profiles) {

          if (profilesJSON.profiles[index].endorsement != 'endorsed') {
            var blankEndorsement = {

              'Of': profilesJSON.profiles[index].id,
              'Related Delivery': profilesJSON.delivery.id,
              'By': profilesJSON.submitter.id,
              'Competency': [],
              'Timestamp': dateString,
              'Endorsement': profilesJSON.profiles[index].endorsement,
              'Recommended Training': []
            };
            endorsements.push(blankEndorsement);

          } else {
            var endorsementCount = 0;
            for (var index2 in profilesJSON.profiles[index].competencies) {
              if (profilesJSON.profiles[index].competencies[index2].endorsedCompetency == false) {
                continue;
              }

              endorsementCount++;

              var trainingArray = [];
              for (var index3 in profilesJSON.profiles[index].competencies[index2].endorsedTraining) {
                trainingArray.push(profilesJSON.profiles[index].competencies[index2].endorsedTraining[index3].id);
              }
              //if (profilesJSON.profiles[index].competencies[index2].endorsedTraining[index3].newTraining == true) {
              var endorsement = {

                'Of': profilesJSON.profiles[index].id,
                'Related Delivery': profilesJSON.delivery.id,
                'By': profilesJSON.submitter.id,
                'Competency': [profilesJSON.profiles[index].competencies[index2].id],
                'Timestamp': dateString,
                'Endorsement': profilesJSON.profiles[index].endorsement,
                'Recommended Training': trainingArray
              };
              endorsements.push(endorsement);
              console.log('adding endorsement for ' + profilesJSON.profiles[index].email + ' by ' + endorsement['By'] + ' of ' + profilesJSON.profiles[index].competencies[index2].name);
              //}

            }

            if (endorsementCount == 0) {
              var endorsement = {

                'Of': profilesJSON.profiles[index].id,
                'Related Delivery': profilesJSON.delivery.id,
                'By': profilesJSON.submitter.id,
                'Competency': [],
                'Timestamp': dateString,
                'Endorsement': profilesJSON.profiles[index].endorsement,
                'Recommended Training': []
              };
              endorsements.push(endorsement);
              console.log('adding endorsement for ' + profilesJSON.profiles[index].email + ' by ' + endorsement['By']);

            }

          }
        }

        // assign ids from previous endorsements
        //var removeEndorsements = [];
        for (var recordId in allEndorsements) {
          var endorsementInProject = false;
          var endorsementUpdated = false;
          for (var index in endorsements) {
            console.log('comparing by ' + endorsements[index]['By'] + ' with ' + allEndorsements[recordId].by);
            if (endorsements[index]['By'] == allEndorsements[recordId].by) {
              console.log('comparing of ' + endorsements[index]['Of'] + ' with ' + allEndorsements[recordId].of);
              if (endorsements[index]['Of'] == allEndorsements[recordId].of) {
                console.log('comparing delivery ' + endorsements[index]['Related Delivery'] + ' with ' + allEndorsements[recordId].relateddelivery);
                if (endorsements[index]['Related Delivery'] == allEndorsements[recordId].relateddelivery) {

                  console.log('comparing competency ' + endorsements[index]['Competency'] + ' with ' + allEndorsements[recordId].competency);
                  if (((endorsements[index]['Competency'].length == 0) && (allEndorsements[recordId].competency == '')) ||
                    (endorsements[index]['Competency'][0] == allEndorsements[recordId].competency)) {

                    endorsements[index]['id'] = recordId;

                    console.log('assigned record id ' + recordId + ' for index ' + index);

                    endorsementUpdated = true;
                  }

                  endorsementInProject = true;

                }
              }
            }

          }

          // later we remove all assigned ids from this list to see which records are extras and need to be deleted
          if ((endorsementInProject == true) && (endorsementUpdated == false)) {
            removeEndorsements.push(recordId);
          }
        }

        console.log('list of endorsements to remove:');
        console.log(removeEndorsements);

        //if (endorsements[index]['Competency'].length == 0) {
        //  endorsements[index]['Competency'] = '';
        //}
        //if (endorsements[index]['Recommended Training'].length == 0) {
        //  endorsements[index]['Recommended Training'] = '';
        //}

        console.log('endorsement array created : ' + endorsements.length);
        //console.log(endorsements);

        // Used for testing without affecting the database
        //callback(null, 'success');
        //return;

        async.each(endorsements, function(endorsement, callback2) {

          // blank values [''] are not allowed.  Either user [] or have a value like ['a']
          var endorsementJSON = {
            "Of": [
              endorsement['Of']
            ],
            "Related Delivery": [
              endorsement['Related Delivery']
            ],
            "By": [
              endorsement['By']
            ],
            "Competency": endorsement['Competency'],
            "Timestamp": endorsement['Timestamp'],
            "Endorsement": endorsement['Endorsement'],
            "Recommended Training": endorsement['Recommended Training'],
			"Viewed by Endorsee": 'False'
          };

          console.log(endorsementJSON);

          if (typeof endorsement['id'] == 'undefined') {
            console.log('calling Airtable save for table Endorsements');
            base('Endorsements').create(endorsementJSON,
              function(err, record) {
                if (err) {
                  console.log(err);
                  callback2(err);
                  return;
                }
                console.log('saved created endorsement of ' + endorsement['Of'] + ' by ' + endorsement['By']);
                callback2(null, 'success');

              });
          } else {
            console.log('calling Airtable update for table Endorsements');
            base('Endorsements').update(endorsement['id'], endorsementJSON,
              function(err, record) {
                if (err) {
                  console.log(err);
                  callback2(err);
                  return;
                }
                console.log('saved updated endorsement of ' + endorsement['Of'] + ' by ' + endorsement['By']);
                callback2(null, 'success');

              });
          }

        }, function(error) {
          if (error) {
            console.log('Error: ' + error);
            callback(error);
            return;
          } else {
            console.log('done replacing all entries');
            callback(null, 'success');
          }
        });

      },

      function(callback) {
        console.log('deleting extra previous endorsements');

        async.each(removeEndorsements, function(endorsementId, callback2) {
          base('Endorsements').destroy(endorsementId, function(err, deletedRecord) {
            if (err) {
              console.log(err);
              callback2(err);
              return;
            }
            console.log('Deleted record ' + deletedRecord.id);
            callback2(null, 'success');
          });
        }, function(error) {
          if (error) {
            console.log('Error: ' + error);
            callback(error);
            return;
          } else {
            console.log('done replacing all entries');
            callback(null, 'success');
          }
        });
      }

    ],
    // series callback
    function(err, results) {
      console.log('finishing async');
      if (err) {
        console.log('Error: ' + err);
        response.send('Error: ' + err);
      } else {
        response.send('Done');
      }
    });

});

function loadEndorsements(endorsementsReference, callback) {
  console.log('loading endorsements');
  console.log(endorsementsReference);

  base('Endorsements').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.log('processing endorsement ' + record.get('Endorsement ID'));
      endorsementsReference[record.getId()] = {
        'endorsementid': record.get('Endorsement ID'),
        'timestamp': record.get('Timestamp'),
        'relateddelivery': record.get('Related Delivery') ? record.get('Related Delivery') : '',
        'competency': record.get('Competency') ? record.get('Competency') : '',
        'of': record.get('Of') ? record.get('Of') : '',
        'by': record.get('By') ? record.get('By') : '',
        'endorsement': record.get('Endorsement'),
        'recommendedtraining': record.get('Recommended Training')

      };

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log('error:');
      console.log(error);
      callback(error);
      return;
    }
    console.log('successfully loaded endorsements');
    //console.log(endorsements);
    callback(null, 'success');
  });
}

app.post('/updateViewedByEndorsee', function(request, response) {
	// updates all endorsements for a competency by setting updateViewedByEndorsee to True
	console.log('');
	console.log('POST received: starting updateViewedByEndorsee');
	if (typeof request.body == 'undefined') {
		console.log('request body is undefined');
		response.send('undefined body');
	}
	
	var endorsements = JSON.parse(request.body.result);
	
	var totalUpdates = 0;
	
	async.each(endorsements.ids, function(endorsementId, callback) {
		base('Endorsements').update(endorsementId, {
			'Viewed by Endorsee': 'True'
			},
			function(err, updatedRecord) {
				if (err) {
					console.log('Error: ' + err);
					callback(err);
				} else {
					console.log('Viewed by Endorsee column updated in Endorsements table for ' + updatedRecord.get('Of') + ' by ' + updatedRecord.get('By') + ' record id ' + updatedRecord.getId());
					totalUpdates++;
					callback(null, 'success');
				}
			});
	}, function(err) {
		console.log('finishing async');
		if (err) {
			console.log('Error: ' + err);
			response.send('Error: ' + err);
		} else {
			console.log('All ' + totalUpdates + ' viewedByEndorsee records updated');
			response.send('Done');
		}
    });
	
	async.series([
		function(callback) {
			base('Endorsements').update(profileJSON.endorsementId, {
			'Viewed by Endorsee': 'True'
			},
			function(err, updatedRecord) {
				if (err) {
					console.log('Error: ' + err);
					callback(err);
				} else {
					console.log('Viewed by Endorsee column updated in Endorsements table for ' + updatedRecord.get('Of') + ' by ' + updatedRecord.get('By') + ' record id ' + updatedRecord.getId());
					callback(null, 'success');
				}
			});
		}
	],
    // series callback
    function(err, results) {
		console.log('finishing async');
		if (err) {
			console.log('Error: ' + err);
			response.send('Error: ' + err);
		} else {
			console.log('Viewed by Endorsee column updated in Endorsements table for ' + updatedRecord.get('Of') + ' by ' + updatedRecord.get('By') + ' record id ' + updatedRecord.getId());
			response.send('Done');
		}
    });
	
	
});

app.post('/updateCompetencies', function(request, response) {
  console.log('');
  console.log('POST received: starting updateCompetencies');
  if (typeof request.body == 'undefined') {
    console.log('request body is undefined');
    response.send('undefined body');
  }

  //console.log(request.body.results);
  //console.log(JSON.parse(request.body.results));
  var profileJSON = JSON.parse(request.body.result);
  var profileCompetencies = [];
  var checkMarkedCompetencies = [];

  console.log('profile received: ' + profileJSON);
  async.series([
      function(callback) {
        console.log('creating new competencies');

        async.each(profileJSON.newCompetencies, function(newCompetency, callback2) {

          // blank values [''] are not allowed.  Either user [] or have a value like ['a']
          var competencyJSON = {
            'Name': newCompetency.name,
            'Short Description': newCompetency.description,
            'Link': newCompetency.readMoreURL,
            'Type': 'Team',
            'People': [profileJSON.id],
			'Predefined': newCompetency.checkmarked == true ? 'True' : 'False'
          };

          console.log(competencyJSON);

          console.log('calling Airtable save for table Competencies');
          base('Competencies').create(competencyJSON,
            function(err, record) {
              if (err) {
                console.log(err);
                callback2(err);
                return;
              }
              console.log('saved created competency of ' + competencyJSON.Name);
              profileCompetencies.push(record.getId());
              if (newCompetency.checkmarked == true) {
                checkMarkedCompetencies.push(record.getId());
              }

              callback2(null, 'success');

            });

        }, function(error) {
          if (error) {
            console.log('Error: ' + error);
            callback(error);
            return;
          } else {
            console.log('done adding all new competencies');
            callback(null, 'success');
          }
        });

      },

      function(callback) {
        console.log('deleting extra previous competencies');

        async.each(profileJSON.deletedCompetencies, function(deletedCompetency, callback2) {
	      base('Competencies').find(deletedCompetency.id, function(err, retrievedRecord) {
			if (err) {
              console.log(err);
              callback2(error);
              return;
            }
            console.log('Competency record ' + deletedCompetency.name + ' predefined: ' + retrievedRecord.get('Predefined'));
			if (retrievedRecord.get('Predefined') == 'True') {
				console.log('Predfined competencies are not deleted');
				callback2(null, 'success');
			} else  {
				console.log('deleting competency: ' + deletedCompetency.name);
				base('Competencies').destroy(deletedCompetency.id, function(err, deletedRecord) {
					if (err) {
					  console.log(err);
					  callback2(error);
					  return;
					}
					console.log('Deleted record ' + deletedCompetency.name);
					callback2(null, 'success');
				});
				
			}

		  });
          
        }, function(error) {
          if (error) {
            console.log('Error: ' + error);
            callback(error);
            return;
          } else {
            console.log('done deleting all new competencies');
            callback(null, 'success');
          }
        });

      },
      function(callback) {
        console.log('saving the updated competencies list and check marked competency list in the profile');

        console.log('check marked before:' + checkMarkedCompetencies.toString());
        // complete list of all profile competencies
        for (var key in profileJSON.competencies) {
          profileCompetencies.push(key);
          // complete list of competency ids that reflect the check marked competencies
          if (profileJSON.competencies[key].checkmarked == true) {
            checkMarkedCompetencies.push(key);
          }
        }
        console.log('profile competency ids: ' + profileCompetencies.toString());
        console.log('check marked after' + checkMarkedCompetencies.length +  ' :' + checkMarkedCompetencies.toString());

        base('People').update(profileJSON.id, {
            "Competencies": profileCompetencies,
            "Check Marked Competencies": checkMarkedCompetencies
          },
          function(err, record) {
            if (err) {
              console.log(err);
              callback(err);
              return;
            }
            console.log('updated People profile competencies for ' + profileJSON.firstname + ' ' + profileJSON.lastname);
            callback(null, 'success');

          });
      }

    ],
    // series callback
    function(err, results) {
      console.log('finishing async');
      if (err) {
        console.log('Error: ' + err);
        response.send('Error: ' + err);
      } else {
        response.send('Done');
      }
    });
});