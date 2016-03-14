var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var cors = require('cors');
var Mailgun = require('mailgun-js');
var $ = require('jQuery');

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
  console.log('POST received');
  saveProfile(request, response);
});


function saveProfile(request, response) {
	
  //console.log(JSON.stringify(request.body));
  var profileJSON = JSON.parse(request.body.profile);
  var profileId = '';
  console.log('data being processed: ' + JSON.stringify(profileJSON));
  
  var getProfileJSON = {
	  record: {},
	  deferred: $.Deferred()
  };

  if ((typeof profileJSON.username == 'undefined') || (profileJSON.username == '')) {
	 if (typeof profileJSON.email == 'undefined') {
		 console.log('no username or email found');
		 response.send('no username or email found');
	 }
	 profileId = profileJSON.email;
     getProfileJSON = getProfile(profileId, getProfileJSON);
  } else {
	  profileId = profileJSON.username;
     getProfileJSON = getProfile(profileId, getProfileJSON);
  }
  
  var addProfileJSON = {
		record: {},
		deferred: $.Deferred()
  };
  
  $.when(getProfileJSON.deferred).done(function(){
	  console.log('gotten profile data');
	  addProfileJSON.record = getProfileJSON.record;
	  addProfileJSON.deferred.resolve();
  });
  $.when(getProfileJSON.deferred).fail(function(){
	  console.log('error getting profile data');
	  addProfileJSON = addProfile(getProfileJSON.record, addProfileJSON);
  });
  
  console.log('processing organization');

  var getOrganizationJSON = {
		record: {},
		deferred: $.Deferred()
  };

  getOrganizationJSON = getOrganization(profileJSON.organization, getOrganizationJSON);
  
  var addOrganizationJSON = {
		record: {},
		deferred: $.Deferred()
  };
  $.when(getOrganizationJSON.deferred).done(function() {
	  console.log('gotten organization data');
	  addOrganizationJSON.record = getOrganization.record;
	  addOrganizationJSON.resolve();
  });
  $.when(getOrganizationIdJSON.deferred).fail(function() {
	  console.log('error getting organization data');
	  addOrganizationJSON = addOrganization(profileJSON, addOrganizationJSON);
  });

  $.when(addProfileJSON.deferred, addOrganizationJSON.deferred).done(function() {
	 var profileRecord = addProfile.record;
	 var organizationRecord = addOrganizatin.record;
	 var updateDeferred1 = updateProfile(profileJSON, profileRecord, organizationRecord, $.Deferred());
     var updateDeferred2 = updateOrganization(profileJSON, profileRecord, organizationRecord, $.Deferred());
	 
	 $.when(updateDeferred1, updateDeferred2).done(function() {
		 console.log('save profile success: ' + profileId);
		 response.send('success');
	 });
	 $.when(updateDeferred1, updateDeferred2).fail(function() {
		 console.log('save profile error:' + profileId);
		 response.send('error');
	 });
 });
 $.when(addProfileJSON.deferred).fail(function() {
		console.log('add profile error: ' + profileId);
		response.send('error')
 });
 $.when(addOrganizationJSON.deferred).fail(function() {
	 console.log('add organization error: ' + profileJSON.organization);
	 response.send('error')
 });
}

function getProfile(ID, returnJSON) {
  console.log('getting profile for ' + ID);
  
  base('People').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
	  console.log('received record: ' + record.get('Profile ID'));
	  //console.log(JSON.stringify(record));
      if (record.get('Profile ID') == ID) {
		console.log('found ID' + ID);
        console.log('Located existing profile ' + record.get('id'));
        returnJSON.record = record;
		returnJSON.deferred.resolve();
      }
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
        console.log('getProfile error: ' + error);
		returnJSON.deferred.reject();
    }
	console.log('no profile found for ' + ID);
  });
  
  return returnJSON;
}

function addProfile(profileJSON, returnJSON) {
	console.log('adding profile: ' + profileJSON.firstname);
  // save profile to Airtable
    base('People').create({
      "Name (First)": profileJSON.firstname//,
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
        returnJSON.reject();
      } else {
		  
        console.log('profile added: ' + record.get('id'));
        returnJSON.record = record;
		returnJSON.resolve();
	  }
	  
    });
	return returnJSON;
}

function updateProfile(profileJSON, profileRecord, organizationRecord, returnedDeferred) {
  console.log('updating organization: ' + profileRecord.get('Profile ID') + ' for ' + organizationRecord.get('Name'));
  base('People').update(profileRecord.get('id'), {
      "Name (First)": profileJSON.firstname,
      "Password": profileJSON.password,
      "Name (Last)": profileJSON.lastname,
      "Endorsements (received)": profileRecord.get('Endorsements (received)'),
      "Endorsements (given)": profileRecord.get('Endorsements (given)'),
      "Deliveries": profileRecord.get('Deliveries'),
      "Organization": organizationRecord.get('id'),
      "Direct Supervisor (email)": profileJSON.supervisoremail,
      "Email": profileJSON.email,
      "Job Changes": profileRecord.get('Job Changes'),
      "Username": profileJSON.username,
      "Training Ratings": "1", // ask Logan about this
      "Deliveries copy": profileRecord.get('Deliveries copy')
    }, function(err, record) {
      if (err) {
        console.log('updateProfile error: ' + err);
        returnedDeferred.reject();
      } else {
		console.log('profile updated: ' + record.get('id'));
		returnedDeferred.resolve();
      }
    });
	return returnedDeferred;
}

function getOrganization(organization, returnJSON) {
  console.log('getting organization ID: ' + organization);
  base('Organizations').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.log('recieved organization record ' + record.get('Name'));
      if (record.get('Name') == organization) {
        organizationId = records.get('ID');
        console.log('Located existing organization ' + record.get('Name'));
        return record;
      }

    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
    if (error) {
      console.log('getOrganizationId error: ' + error);
    }
	console.log('no organization found for ' + organization);
    return;
  });

}

function addOrganization(profileJSON) {
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
      return; 
    }
    console.log('organization added: ' + profileJSON.organization);
    return record;
  });
}

function updateOrganization(profileJSON, profileRecord, organizationRecord) {
  console.log('preparing to update organization: ' + organizationRecord.get('Name') + ' for ' + profileRecord.get('Profile ID'));
  var people = organizationRecord.get('People');
  if (people.indexOf(profileRecord.get('id') == -1)) {
    people.push(profileRecord.get('id'));
  }

  base('Organizations').update(organizationRecord.get('id'), {
    "Name": profileJSON.organization,
    "People": people,
    "Positions": organizationRecord.get('Positions'),
    "Position Changes (from)": organizationRecord.get('Position Changes (from)'),
    "Position Changes (to)": organizationRecord.get('Position Changes (to)')
  }, function(err, record) {
    if (err) { console.log('updateOrganization error:' + err); return false; }
    console.log('updated ' + record.get('id'));
    return true;
  });
}
