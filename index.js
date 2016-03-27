var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var cors = require('cors');
var Mailgun = require('mailgun-js');
var async = require('async');

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use(cors());

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

//Your domain, from the Mailgun Control Panel
var domain = 'mg.mrrmrr.com';

//Your sending email address
var from_who = 'mail@mg.mrrmrr.com';

app.post('/sendEndorseLink',

  //express.basicAuth('username', 'password'),
  function(request, response) {
    console.log('email received');

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

    var to = request.body.To;
    var cc = request.body.Cc;

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

    console.log('Emails collected: To(' + toEmails.length + '):' + toEmails.toString() + ' Cc(' + ccEmails.length + '):' + ccEmails.toString() + ' Subject: ' + request.body.subject);

    // First we initialize our module

    var mailgun = new Mailgun({
      apiKey: api_key,
      domain: domain
    });

    var fed360params = '?project=' + encodeURIComponent(request.body.subject) + '&emails=' + toEmails.toString();

    if (ccEmails.length > 0) {
      fed360params = fed360params + ',' + ccEmails.toString();
    }

    var params = {
      to: toEmails.toString(),
      from: 'mail@mg.mrrmrr.com',
      subject: request.body.subject,
      html: '<html > <head> <meta charset="UTF-8"> <title>Fed360 Simple HTML Email Invitation</title> <style>@import url(https://fonts.googleapis.com/css?family=Open+Sans:300,400,800);.fed360-email{font-family: "Open Sans", sans-serif; font-weight: 300;}.fed360-email .fed360{display: inline-block; width: 200px; height: 60px; padding-top: 0px; font-size: 50px; vertical-align: top; font-weight: 800; color: LightGrey;}</style> </head> <body> <div class="fed360-email"> <div class="welcome">Hi,</div><br><div class="invitation">One or more of your team members has invited you to give anonymous endorsements for your team\'s skills.</div><br><a class="link" href="http://codepen.io/OurDailyBread/debug/vLNGoG' + fed360params + '">Endorse your team\'s skills</a> <br><br><br><div class="signature">Automated Transaction by the Fed360 Team Endorsement Program</div><div class="fed360">Fed360</div><div class "warning">Please do not reply to this email</div><a href="http://fed360.parseapp.com/" class "website">Visit the Fed360 Homepage</div></div></body></html>'
    };

    if (ccEmails.length > 0) {
      params.cc = ccEmails.toString();
    }

    // Then we create a cloud function
    mailgun.messages().send(params, function(err, body) {
      //If there is an error, render the error page
      if (err) {
        res.render('error', {
          error: err
        });
        console.log("got an error: ", err);
      }
      //Else we can greet    and leave
      else {
        console.log('mail submitted');
        console.log(body);
      }
    });

    // This code section saves the incoming email to the Parse cloud database - TODO

  },
  function(error) {
    console.log('error receiving email');
    console.log(error);
    //response.status(500);
    //response.send('Error');
  }
);

//var base = new Airtable({ apiKey: 'keyWInwqgSshQe7GV' }).base('appYLZr7VvVPKZGvf');
var Airtable = require('airtable');
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: 'keyWInwqgSshQe7GV'
});
var base = Airtable.base('appYLZr7VvVPKZGvf');

app.get('/loadProfiles', function(request, response) {
  console.log('loading profiles');
  var emails = (JSON.parse(request.body.emails)).emails;
  var profilesJSON = {
    'profiles': []
  };

  async.series([
      function(callback) {
        console.log('loading profile');

        base('People').select({
          view: "Main View"
        }).eachPage(function page(records, fetchNextPage) {

          // This function (`page`) will get called for each page of records.

          records.forEach(function(record) {
            console.log('processing profile ' + record.get('Profile ID'));
            var profile = {
              'id': record.getId(),
              'firstname': record.get('Name (First)'),
              'lastname': record.get('Name (Last)'),
              'organization': record.get('Organization'), //id
              'email': record.get('Email'),
              'supervisoremail': record.get('Direct Supervisor (email)'),
              'title': record.get('Position'), //id
              'endorsements': record.get('Endorsements (Received)'),
              'competencies': record.get('Competencies')
            };
            for (var index in emails) {
              if (emails[index] == profile.email) {
                console.log('found ' + emails[index]);
                profilesJSON.profiles.push(profile);
                console.log(profile);
              }
            }

          });

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();

        }, function done(error) {
          if (error) {
            console.log(error);
            response.send('Error: ' + error);
            return callback(error);
          }
          console.log('successfully loaded base profiles');
          callback(null, 'success');
        });

      },

      function(callback) {
        console.log('loading organization');
        if (profilesJSON.profiles.length == 0) {
          callback(null, 'success');
          return;
        }

        for (var index in profilesJSON.profiles) {
          (function(indexCopy) { // javascript clouse method to pass in a copy of the changing variable
            if ((typeof profilesJSON.profiles[indexCopy].organization == 'undefined') ||
              (profilesJSON.profiles[indexCopy].organization == '') ||
              (profilesJSON.profiles[indexCopy].organization.length == 0)) {
              if (profilesJSON.profiles.length == (indexCopy + 1)) {
                callback(null, 'success');
              }
              return;
            }
            base('Organizations').find(profilesJSON.profiles[indexCopy].organization, function(err, record) {
              if (err) {
                console.log(err);
                return callback(err);
              }
              console.log('loaded organization ' + record.get('Name') + ' for index ' + indexCopy);
              profilesJSON.profiles[indexCopy].organization = record.get('Name');
              if (profilesJSON.profiles.length == (indexCopy + 1)) {
                callback(null, 'success');
              }
            });

          })(index);

        }
      },

      function(callback) {
        console.log('loading position');
        if (profilesJSON.profiles.length == 0) {
          callback(null, 'success');
          return;
        }

        for (var index in profilesJSON.profiles) {
          (function(indexCopy) {
            console.log('position id ' + profilesJSON.profiles[indexCopy].title);

            // skip if undefined
            if ((typeof profilesJSON.profiles[indexCopy].title == 'undefined') ||
              (profilesJSON.profiles[indexCopy].title == '') ||
              (profilesJSON.profiles[indexCopy].title.length == 0)) {
              if (profilesJSON.profiles.length == (indexCopy + 1)) {
                callback(null, 'success');
              }
              return;
            }

            // otherwise retrieve position title
            base('Positions').find(profilesJSON.profiles[indexCopy].title[0], function(err, record) {
              if (err) {
                console.log(err);
                return callback(err);
              }
              console.log('successfully loaded position for profile index ' + indexCopy);
              profilesJSON.profiles[indexCopy].title = record.get('Title');
              if (profilesJSON.profiles.length == (indexCopy + 1)) {
                callback(null, 'success');
              }
            });
          })(index);
        }
      },

      function(callback) {
        console.log('loading competencies');
        // skip if undefined
        if (profilesJSON.profiles.length == 0) {
          callback(null, 'success');
          return;
        }

        for (var index in profilesJSON.profiles) {
          console.log('competencies profile index ' + index);
          console.log(profilesJSON.profiles[index].competencies);

          // skip if undefined
          if ((typeof profilesJSON.profiles[index].competencies == 'undefined') ||
            (profilesJSON.profiles[index].competencies == '') ||
            (profilesJSON.profiles[index].competencies.length == 0)) {
            if (profilesJSON.profiles.length == (parseInt(index) + 1)) {
              callback(null, 'success');
            }
            continue;
          }

          for (var index2 in profilesJSON.profiles[index].competencies) {
            console.log('compentency index ' + index2);
            (function(index1Copy, index2Copy) {
              console.log('loading competency ' + profilesJSON.profiles[index1Copy].competencies[index2Copy]);
              base('Competencies').find(profilesJSON.profiles[index1Copy].competencies[index2Copy], function(err, record) {
                if (err) {
                  console.log(err);
                  return callback(err);
                }
                console.log('successfully loaded position ' + record.get('Name'));
                profilesJSON.profiles[index1Copy].competencies[index2Copy] = {
                  'id': profilesJSON.profiles[index1Copy].competencies[index2Copy],
                  'name': record.get('Name'),
                  'description': record.get('Short Description'),
                  'readMoreURL': record.get('Link'),
                  'checked': false,
                  'compentencyEndorsements': 0, // will be filled in next async
                  'endorsedTraining': [], // will be filled in next async
                  'updateScore': false
                };
                if (((parseInt(index1Copy) + 1) == profilesJSON.profiles.length) &&
                  ((parseInt(index2Copy) + 1) == profilesJSON.profiles[index1Copy].competencies.length)) {
                  callback(null, 'success');
                }
              });

            })(index, index2);
          }
        }
      },

      function(callback) {
        console.log('loading endorsements');
        // skip if undefined
        if (profilesJSON.profiles.length == 0) {
          callback(null, 'success');
          return;
        }

        for (var index in profilesJSON.profiles) {
          console.log('endorsements profile index ' + index);
          console.log(profilesJSON.profiles[index].endorsements);

          // skip if undefined
          if ((typeof profilesJSON.profiles[index].endorsements == 'undefined') ||
            (profilesJSON.profiles[index].endorsements == '') ||
            (profilesJSON.profiles[index].endorsements.length == 0)) {
            if (profilesJSON.profiles.length == (parseInt(index) + 1)) {
              callback(null, 'success');
            }
            continue;
          }

          for (var index2 in profilesJSON.profiles[index].endorsements) {
            console.log('endorsemenrs index ' + index2);
            console.log(profilesJSON.profiles[index].endorsements[index2]);

            (function(index1Copy, index2Copy) {
              console.log('checking endorsements ' + profilesJSON.profiles[index1Copy].endorsements[index2Copy]);
              base('Competencies').find(profilesJSON.profiles[index1Copy].endorsements[index2Copy], function(err, record) {
                if (err) {
                  console.log(err);
                  return callback(err);
                }
                console.log('successfully loaded endorsement');

                var endorsedCompetencyName = record.get('Competency');
                if (typeof profilesJSON.profiles[index1Copy].competencies != 'undefined') {
                  for (var index3 in profilesJSON.profiles[index1Copy].competencies) {
                    if (profilesJSON.profiles[index1Copy].competencies[index3].name == endorsedCompetencyName) {
                      profilesJSON.profiles[index1Copy].competencies[index3].competencyEndorsements++;
                    }
                  }
                }

                if (((parseInt(index1Copy) + 1) == profilesJSON.profiles.length) &&
                  ((parseInt(index2Copy) + 1) == profilesJSON.profiles[index1Copy].endorsements.length)) {
                  callback(null, 'success');
                }
              });

            })(index, index2);
          }
        }
      },

    ],
    //optional callback
    function(err, results) {
      console.log('finishing async');
      if (err) {
        console.log('Error: ' + err);
        response.send('Error: ' + err);
      } else {
        // results is now equal to ['one', 'two']
        //var profileRecord = results[0];
        console.log('all profiles loaded');
        console.log(JSON.stringify(profilesJSON) + '\n');
        response.send(JSON.stringify(profilesJSON));
      }
    });

  /*
  profileData.endorsements = 0;
  profileData.competencies = [
    {
      name: 'User Design Experience',
      description: 'A category of digital design in which user needs are are identified through research methods such as interviews, shadowing and prototyping then translated into design requirements for product teams.',
      readMoreURL: '#',
      checked: true,
      competencyEndorsements: 0,
      endorsedTraining: [],
      updatedScore: true
    }];
  profileData.competencies[0].endorsedTraining[0] = 
    {
       endorsedName: 'Innovation Facilitation 101',
       endorsedDescription, 'Innovation facilitation concerns itself with all the tasks needed to run a productive and impartial problem solving collaboration, serving the needs of any group who are meeting with a common purpose',
       endorsedReadMoreURL: '#'
    }*/
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

  async.series([
      function(callback) {
        console.log('processing profile');
        getProfile(profileId, profileJSON, callback);
      },
      function(callback) {
        console.log('processing organization');
        getOrganization(profileJSON.organization, profileJSON, callback);
      }
    ],
    //optional callback
    function(err, results) {
      console.log('finishing async');
      if (err) {
        console.log('Error: ' + err);
        response.send('Error: ' + err);
      } else {
        // results is now equal to ['one', 'two']
        var profileRecord = results[0];
        console.log('profile record id: ' + profileRecord.getId());
        var organizationRecord = results[1];
        console.log('organization record id: ' + organizationRecord.getId());
        console.log('temporarily done');
        updateProfile(profileJSON, profileRecord, organizationRecord, response);
        updateOrganization(profileJSON, profileRecord, organizationRecord, response);
      }
    });

}

function getProfile(ID, profileJSON, callback) {
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
        console.log('found ID' + ID);
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
        callback(null, foundRecord);
      }

    }
  });

}

function addProfile(profileJSON, callback) {
  console.log('adding profile: ' + profileJSON.firstname);
  // save profile to Airtable
  base('People').create({
    "Name (First)": profileJSON.firstname //,
      //"Password": profileJSON.password,
      //"Name (Last)": profileJSON.lastname,
      //"Endorsements (received)": [],
      //"Endorsements (given)": [],
      //"Deliveries": [],
      //"Organization": '',
      //"Direct Supervisor (email)": profileJSON.supervisoremail,
      //"Email": profileJSON.email,
      //"Job Changes": [],
      //"Username": profileJSON.username,
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

function updateProfile(profileJSON, profileRecord, organizationRecord, response) {
  console.log('updating profile: ' + profileRecord.get('Profile ID') + ' for ' + organizationRecord.get('Name'));

  base('People').update(profileRecord.getId(), {
    //"Name (First)": profileJSON.firstname,
    //"Password": profileJSON.password,
    //"Name (Last)": profileJSON.lastname,
    //"Endorsements (received)": profileRecord.get('Endorsements (received)'),
    //"Endorsements (given)": profileRecord.get('Endorsements (given)'),
    //"Deliveries": profileRecord.get('Deliveries'),
    //"Organization": organizationRecord.getId(),
    //"Direct Supervisor (email)": profileJSON.supervisoremail,
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

function getOrganization(organization, profileJSON, callback) {
  console.log('getting organization ID: ' + organization);
  var foundRecord;
  base('Organizations').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.log('recieved organization record ' + record.get('Name'));
      if (record.get('Name') == organization) {
        console.log('Located existing organization ' + record.get('Name'));
        foundRecord = record;
      }

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log('getOrganization error: ' + error);
      callback('Error: ' + error, null);
    } else {
      if (typeof foundRecord == 'undefined') {
        console.log('no organization found for ' + organization);
        addOrganization(profileJSON, callback);
      } else {
        console.log('completed organization search');
        callback(null, foundRecord);
      }

    }
  });

}

function addOrganization(profileJSON, callback) {
  console.log('adding organization: ' + profileJSON.organization);
  // add organziation to organziation table
  base('Organizations').create({
    "Name": profileJSON.organization,
    "People": [],
    "Positions": [],
    "Position Changes (from)": [],
    "Position Changes (to)": []
  }, function(err, record) {
    if (err) {
      console.log('addOrganization error: ' + err);
      callback('addOrganization error: ' + err, null);
    } else {
      console.log('organization added: ' + profileJSON.organization);
      callback(null, record);
    }
  });
}

function updateOrganization(profileJSON, profileRecord, organizationRecord, response) {
  console.log('preparing to update organization: ' + organizationRecord.get('Name') + ' for ' + profileRecord.get('Profile ID'));
  var people = organizationRecord.get('People');
  if (people.indexOf(profileRecord.getId() == -1)) {
    people.push(profileRecord.getId());
  }

  base('Organizations').update(organizationRecord.getId(), {
    "Name": profileJSON.organization,
    "People": people,
    "Positions": organizationRecord.get('Positions'),
    //"Position Changes (from)": organizationRecord.get('Position Changes (from)'),
    //"Position Changes (to)": organizationRecord.get('Position Changes (to)')
  }, function(err, record) {
    if (err) {
      console.log('updateOrganization error:' + err);
      response.send('updateOrganization error:' + err + '\n');
    } else {
      console.log('organization updated: ' + record.getId());
      response.send('Successfully added/updated record: ' + record.getId() + '\n');
    }
  });
}