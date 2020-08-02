'use strict';
var request = require('request');
/** This helper is used by the Assistant client to BAW - Case API **/


module.exports.buildDisputePayload = function (parameters, config){
    if(config){
      console.log("  == BAWHelper.js / buildDisputePayload / parameters received: " + parameters);
    }
    var submitDate = new Date();
    //ar result = "";

    //var formattedJSONSymptoms = buildSymptomsPayload(symptomsList, config);

    var jsonDiagnosePayload = {};
    jsonDiagnosePayload.CaseType = "CI_SelfServiceDispute";
    jsonDiagnosePayload.TargetObjectStore = "tos";
    jsonDiagnosePayload.ReturnUpdaCIs = false;

    //Building properties from this format:
    //[{"account":"act-121"},{"transaction":234234324234},{"email":"algo@email.com"},{"amount":2323}]
    var jsonPropertiesArray = new Array();


    //Account
    var propertyAccountItem = {};
    propertyAccountItem.SymbolicName = "CI_accountId";
    propertyAccountItem.Value = parameters[0].account;

    jsonPropertiesArray.push(propertyAccountItem);

    //Transaction
    var propertyTransactionItem = {};
    propertyTransactionItem.SymbolicName = "CI_transactionId";
    propertyTransactionItem.Value = parameters[1].transaction + "";

    jsonPropertiesArray.push(propertyTransactionItem);

    //Email
    var propertyEmailItem = {};
    propertyEmailItem.SymbolicName = "CI_email";
    propertyEmailItem.Value = parameters[2].email;

    jsonPropertiesArray.push(propertyEmailItem);

    //Amount
    var propertyAmountItem = {};
    propertyAmountItem.SymbolicName = "CI_amount";
    propertyAmountItem.Value = parameters[3].amount;

    jsonPropertiesArray.push(propertyAmountItem);

    //Date
    var propertyDateItem = {};
    propertyDateItem.SymbolicName = "CI_date";
    //2010-07-16T21:50:36Z
    propertyDateItem.Value = submitDate.getFullYear() + "-" +
                              submitDate.getMonth() + "-" +
                              submitDate.getDay() + "T" +
                              submitDate.getHours() + ":" +
                              submitDate.getMinutes() + ":" +
                              submitDate.getSeconds() + "Z";

    jsonPropertiesArray.push(propertyDateItem);

    jsonDiagnosePayload.Properties = jsonPropertiesArray;

    if(config){
        console.log("  == BAWHelper.js / buildDisputePayload / diagnosis payload result: " + JSON.stringify(jsonDiagnosePayload));
    }
    return jsonDiagnosePayload;
    };//buildDisputePayload

module.exports.executeDisputeRequest = function(payload, config, callback){
  callback = (typeof callback === 'function') ? callback : function() {};
  try{
    var breResult = "";
    if (config.debug) {
      console.log("  == BAWHelper.js / executeDisputeRequest / payload for service invocation: " + JSON.stringify(payload));
    }
    var options;

	//rejectUnauthorized = false documented here: https://github.com/nodejs/help/issues/692
    options = {
          protocol: config.baw.protocol,
          url: config.baw.url,
          method: 'POST',
          headers: {
             "Accept": "application/json",
             "Content-Type": "application/json",
             "Authorization" : config.baw.authtoken,
             "Content-Length" : payload.length
          },
          body: JSON.stringify(payload),
		  rejectUnauthorized: false
      }

    if (config.debug) {
      console.log("  == BAWHelper.js / executeDisputeRequest / options.url: " + options.url);
      console.log("  == BAWHelper.js / executeDisputeRequest / options.protocol: " + options.protocol);
      console.log("  == BAWHelper.js / executeDisputeRequest / options.authorization: " + options.headers.Authorization);
      console.log("  == BAWHelper.js / executeDisputeRequest / options.body: " + options.body);
    }
    var BAWCaseResult = "";
    request(options, function (error, response, BAWCaseResult) {
      if(error){
        console.log("  == BAWHelper.js / executeDisputeRequest / Request error on request: " + options.url + " \n " + JSON.stringify(error));
      }
      if (config.debug) {
        console.log("  == BAWHelper.js / executeDisputeRequest / Response received from service call:" + BAWCaseResult);
      }
      callback(null, BAWCaseResult);
  	 });
   } catch(err){
     callback(err, null);
     return;
   }
}; //executeDisputeRequest

module.exports.formatDisputeResponse = function(BAWCMResponse, config){
	/* Expected result sample:
	{
    "CaseIdentifier": "CI_SelfServiceDispute_000000100001",
    "CaseTitle": "CI_SelfServiceDispute_000000100001",
    "CaseFolderId": "{D010AD73-0000-C91E-B2E5-891A424B812D}"
	}
	*/
	  var result = "";
	  if(config.debug){
		console.log("  == BAWHelper.js / formatDisputeResponse / received: " + BAWCMResponse);
	  }
	  
	  if(BAWCMResponse != null){
		var JSONData = JSON.parse(BAWCMResponse);
		if(JSONData.CaseIdentifier != null){
		  result += "<br>A case has been created for your dispute: <br> Case Identifier: [ <b>" + JSONData.CaseIdentifier + " </b>] <br>";

		  if(config.debug){
			result += "<br>----------------------------------------------------------------";
			result += "<br>CaseIdentifier: [" + JSONData.CaseIdentifier + "]";
			result += "<br>CaseTitle: [" + JSONData.CaseTitle + "]";
			result += "<br>CaseFolderId: [" + JSONData.CaseFolderId + "]";
		  }
		}
		else{
		  result += "<br>Unfortunately I was not able to make your request.  Please try again in a few minutes. <br>";
		  console.log("  =========== <ERROR>>>>> " + JSON.stringify(JSONData));
		}
	  }
	  if(config.debug){
		console.log("  == BAWHelper.js / formatDisputeResponse / formatted response: " + result);
	  }
	return result;
}

//}//helpers
