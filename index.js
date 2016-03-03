var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var cors = require('cors');
var Mailgun = require('mailgun-js');

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

app.post('/saveProfile', function(request, response) {
  var foundRecord = [];

  base('People').select({
    // Selecting the first 3 records in Main View:
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.log('Retrieved ', record.get('id'));
      var fields = record.get('fields');
      //if ((fields["Name (First)"] == request.body.profile.firstname) && 
      //(fields["Name (Last)"] == request.body.profile.lastname)) {
      if ((fields["Username"] == request.body.profile.username) &&
        (fields["Password"] == request.body.profile.password)) {
        foundRecord.push(record));
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log(error);
    } else {
      if (foundRecord.length == 0) {
        createProfile(request);
      } else {
        if (foundRecord.length == 1) {
          updateProfile(request, foundRecord[0]);
        } else {
          //duplicate IDs found
          var listIds = ''
          for (var index in foundRecord) {
            listIds = listIds + foundRecord[index].get('ID');
            if (index != (foundRecord.length - 1)) {
              listIds = listIds + ',';
            }
          }
          console.log('Duplicates found: ' + listIds);
          console.log('Updating all records');
          for (var index in foundRecord) {
            updateProfile(request, foundRecord[index]);
          }
        }
      }
    }
  });

});

function updateProfile(request, profileId, organizatoinId) {
  var fields = record.get('fields');

}

function createProfile(request) {
  var profileRecord = '';

  if (request.body.profile.username == '') {
     profileRecord = getProfile(request.body.profile.email);
  } else {
     profileRecord = getProfile(request.body.profile.username);
  }
  if (typeof profileRecord == 'undefined') {
    profileRecord = addProfile(request);
  }

  var organizationRecord = '';

  organizationRecord = getOrganizationId(request.body.profile.organization);
  if (typeof organizationRecord == 'undefined') {
    organizationRecord = addOrganization(request);
  }

  updateProfile(request, profileRecord, organizationRecord);
  updateOrganization(request, profileRecord, organizationRecord);
}

function getProfile(ID) {
  base('People').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      var fields = record.get('fields');
      if (fields.ID == ID) {
        console.log('Located existing profile ', record.get('ID'));
        return record;
      }
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
        console.log(error);
    }
  });
}

function addProfile(request) {
  // save profile to Airtable
    base('People').create({
      "Name (First)": request.body.profile.firstname,
      "Password": request.body.profile.password,
      "Name (Last)": request.body.profile.lastname,
      "Endorsements (received)": [],
      "Endorsements (given)": [],
      "Deliveries": [],
      "Organization": '',
      "Direct Supervisor (email)": request.body.profile.supervisoremail,
      "Email": request.body.profile.email,
      "Job Changes": [],
      "Username": request.body.profile.username,
      "Training Ratings": "1", // ask Logan about this
      "Deliveries copy": []
    }, function(err, record) {
      if (err) {
        console.log(err);
        return;
      }
      console.log('profile added: ' + record.get('id'));
      return record;
    });
}

function updateProfile(request, profileRecord, organizationRecord) {

  base('People').update(profileRecord.get('id'), {
      "Name (First)": request.body.profile.firstname,
      "Password": request.body.profile.password,
      "Name (Last)": request.body.profile.lastname,
      "Endorsements (received)": profileRecord.get('Endorsements (received)'),
      "Endorsements (given)": profileRecord.get('Endorsements (given)'),
      "Deliveries": profileRecord.get('Deliveries'),
      "Organization": organizationRecord.get('id'),
      "Direct Supervisor (email)": request.body.profile.supervisoremail,
      "Email": request.body.profile.email,
      "Job Changes": profileRecord.get('Job Changes'),
      "Username": request.body.profile.username,
      "Training Ratings": "1", // ask Logan about this
      "Deliveries copy": profileRecord.get('Deliveries copy')
    }, function(err, record) {
      if (err) {
        console.log(err);
        return;
      }
      console.log('profile added: ' + record.get('id'));
      return record;
    });
}

function getOrganizationId(organization) {
  base('Organizations').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      var fields = record.get('fields');
      if (fields['Name'] == organization) {
        organizationId = records.get('ID');
        console.log('Located existing organization ', record.get('Name'));
        return record;
      }

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log(error);
    }
    return;
  });

}

function addOrganization(request) {
      // add organziation to organziation table
  base('Organizations').create({
    "Name": request.body.profile.organization,
    "People": [],
    "Positions": [],
    "Position Changes (from)": [],
    "Position Changes (to)": []
  }, function(err, record) {
    if (err) { 
      console.log(err); 
      return; 
    }
    console.log('organization added: ' + request.body.profile.organization);
    return record;
  });
}

function updateOrganization(request, profileRecord, organizationRecord) {
  var people = organizationRecord.get('People');
  if (people.indexOf(profileRecord.get('id') == -1) {
    people.push(profileRecord.get('id'));
  }

  base('Organizations').update(organizationRecord.get('id'), {
    "Name": request.body.profile.organization,
    "People": people,
    "Positions": organizationRecord.get('Positions'),
    "Position Changes (from)": organizationRecord.get('Position Changes (from)'),
    "Position Changes (to)": organizationRecord.get('Position Changes (to)')
  }, function(err, record) {
    if (err) { console.log(err); return; }
    console.log('updated ' + record.get('id'));
  });
}
