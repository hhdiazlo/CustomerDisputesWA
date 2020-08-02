  /**
 *
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var AssistantV2 = require('ibm-watson/assistant/v2'); // watson sdk
var config = require('./config/config.json');
var BAWCMHelper = require('./helpers/BAWHelper');
const { IamAuthenticator, BearerTokenAuthenticator } = require('ibm-watson/auth');

var app = express();
require('./health/health')(app);

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper

let authenticator;
if (process.env.ASSISTANT_IAM_APIKEY) {
  authenticator = new IamAuthenticator({
    apikey: process.env.ASSISTANT_IAM_APIKEY
  });
} else if (process.env.BEARER_TOKEN) {
  authenticator = new BearerTokenAuthenticator({
    bearerToken: process.env.BEARER_TOKEN
  });
}

var assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: authenticator,
  url: process.env.ASSISTANT_URL,
  disableSslVerification: process.env.DISABLE_SSL_VERIFICATION === 'true' ? true : false
});

// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
  let assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    return res.json({
      output: {
        text:
          'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' +
          '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' +
          'Once a workspace has been defined the intents may be imported from ' +
          '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.',
      },
    });
  }
  var textIn = '';
  if (req.body.input) {
    textIn = req.body.input.text;
  }

  var payload = {
    assistantId: assistantId,
    sessionId: req.body.session_id,
    input: {
      message_type: 'text',
      text: textIn,
      options:{
        return_context:true
      }
    },
  };

  // Send the input to the assistant service
  assistant.message(payload, function(err, data) {
    if (err) {
      const status = err.code !== undefined && err.code > 0 ? err.code : 500;
      return res.status(status).json(err);
    }
    //console.log("app.js / message / payload: " + JSON.stringify(payload));
    //console.log("app.js / message / data: " + JSON.stringify(data));
    if(data != null){
      if(data.result.context != null){
        //console.log("app.js / message / data / external_call: " + data.result.context.skills.tags["main skill"].user_defined.external_call );
        let skillsJSONObject = JSON.parse(JSON.stringify(data.result.context.skills));
        if(skillsJSONObject['main skill'].user_defined != null){
          let chatPayload = JSON.stringify(skillsJSONObject['main skill'].user_defined.external_call);
          if(config.debug){
            console.log("app.js / message / data.result.context.external_call value: " + chatPayload);
          }
          if(chatPayload != null){
            let application = JSON.stringify(skillsJSONObject['main skill'].user_defined.external_call[0].api);
            if(config.debug){
              console.log("  >>> app.js / message / application: " + JSON.stringify(application));
            }
            callExternalService(application, skillsJSONObject['main skill'].user_defined.external_call[0].parameters, function(err, rawBAWCMResult){
              if(config.debug){
                console.log("  >>> app.js / message /  BAWCMResult to be formatted: " + rawBAWCMResult);
              }
              var formattedResult = "";
              formattedResult = BAWCMHelper.formatUWResponse(rawBAWCMResult, config);
              if(config.debug){
                console.log("  >>> app.js / message / formatted result to add to data: " + formattedResult);
              }
              let item = {};
              item.response_type = "text";
              item.text = formattedResult;
              data.result.output.generic.push(item);
              if(config.debug){
                console.log("  >>> app.js / message / output to UI: " + JSON.stringify(data));
              }
              return res.json(data);
            });
          } // application != null
          else{
            console.log(">>>>>>>>>>>>> app.js / message / application is null ");
            return res.json(data);
          }
        }
        else{
          console.log(">>>>>>>>>>>>> app.js / message / data.result.context was null ");
          return res.json(data);
        }
      } // data.result.context != null
      else{
        console.log(">>>>>>>>>>>>> app.js / message / data.result.context was null ");
        return res.json(data);
      }
    }
    else{
      console.log(">>>>>>>>>>>>> app.js / message / data was null");
      return res.json(data);
    }
    //return res.json(data);
  });
});

app.get('/api/session', function(req, res) {
  assistant.createSession(
    {
      assistantId: process.env.ASSISTANT_ID || '{assistant_id}',
    },
    function(error, response) {
      if (error) {
        return res.send(error);
      } else {
        return res.send(response);
      }
    }
  );
});

function callExternalService(application, parameters, callback){
  callback = (typeof callback === 'function') ? callback : function() {};
  if(config.debug){
    console.log("  >>> app.js / callExternalService / application: [" + application + "] parameters: [" + JSON.stringify(parameters) + "]");
  }

  //From:http://prcoldfusion.blogspot.com/2012/03/replace-all-double-quotes-in-string.html
  // replace(/\"/g, "")
  let cleanedApplication = application.replace(/\"/g, "");

  if(config.debug){
    console.log("  >>> app.js / callExternalService / cleaned application: " + cleanedApplication);
  }
  if(cleanedApplication === 'BAW'){
    var BAWCMRequest = BAWCMHelper.buildDisputePayload(parameters, config);

    if(config.debug){
      console.log("  >>> app.js / callExternalService / BAW Build Dispute Payload: " + JSON.stringify(parameters));
    }

    var result = ""
    BAWCMHelper.executeDisputeRequest (BAWCMRequest, config, (err, result)=>{
      if(err){
        console.log("  >>> app.js / callExternalService (BAW) / error received. " + err);
        callback(err, null);
      }
      if(config.debug){
        console.log("  >>> app.js / callExternalService (BAW) / result from BAW service: " + result);
      }
      callback(null, result);
      return;
    });
  }
  if(cleanedApplication === 'BAW_START_TEST_PROCESS'){

  }
  else{
    if(config.debug){
      console.error("  >>> app.js / callExternalService / [else] Unknown received application: [" + application + "]");
    }
  }

}

module.exports = app;
