'use strict';
var request = require('request');
/** This helper is used by the Assistant client to BAW - Case API **/

function buildSymptomsPayload (symptomsString, config){
  //Build a list of  symptoms in the following formatted
  /*{
    "name": "SHORTNESSOFBREATH"
  }
  */
  if(config){
    console.log("  ==== BAWHelper.js / buildSymptomsPayload / symptoms received: " + symptomsString);
  }
  var cleanedSystemsArray = symptomsString.replace("[", "");
  cleanedSystemsArray = cleanedSystemsArray.replace("]", "");

  if(config){
    console.log("  ==== BAWHelper.js / buildSymptomsPayload / symptoms received - cleaned: " + cleanedSystemsArray);
  }

  var symptomsJSONFormat = "";
  var counter =0;
  //Loop for every sysmptoms
  var symptomsArr = cleanedSystemsArray.split(",");
  var jsonResult = {};
  var jsonArraySymptoms = new Array();

  for (const symptom of symptomsArr) {
      if(config){
        console.log("  ===== BAWHelper.js / buildSymptomsPayload extracted: " + symptom);
      }
      let item = {};
      //removed double quotes and blank spaces
      //https://stackoverflow.com/questions/6623231/remove-all-white-spaces-from-text
      let cleanedSymptoms = symptom.replace(/\"/g, "");
      cleanedSymptoms = cleanedSymptoms.replace(/ /g,'');
      item.name = cleanedSymptoms;
      jsonArraySymptoms.push(item);
      //symptomsJSONFormat += "{ name : " + symptom + "}";
      if(counter++ < symptomsArr.length-1){
          symptomsJSONFormat += ",";
      }
  }
  //jsonResult.Received_Symptoms = jsonArraySymptoms;

  if(config){
    console.log("  ==== BAWHelper.js / buildSymptomsPayload / JSON result: " + JSON.stringify(jsonArraySymptoms));
  }

  return jsonArraySymptoms;
}

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
    propertyTransactionItem.Value = parameters[1].transaction;

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
          body: JSON.stringify(payload)
      }

    if (config.debug) {
      console.log("  == BAWHelper.js / executeDisputeRequest / options.url: " + options.url);
      console.log("  == BAWHelper.js / executeDisputeRequest / options.protocol: " + options.protocol);
      console.log("  == BAWHelper.js / executeDisputeRequest / options.authorization: " + options.authtoken);
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

module.exports.formatUWResponse = function(BAWCMResponse, config){
  var result = "";
  if(config.debug){
    console.log("  == BAWHelper.js / formatUWResponse / received: " + BAWCMResponse);
  }
  var JSONData = JSON.parse(BAWCMResponse);
  if(BAWCMResponse != null){
    if(JSONData.Identify_Diagnosis != null){
      result += "<br>From your syptoms, my diagnosis is: <br>[ <b>" + JSONData.Identify_Diagnosis.disease + " </b>] <br>";
      result += "Additional comments: <br>"
      var index;
      for(index in JSONData.Identify_Diagnosis.recommendations){
        result += "<br>-" + JSONData.Identify_Diagnosis.recommendations[index] + " ";
        index++;
      }

      if(config.debug){
        result += "<br>Decision ID: [" + JSONData.__DecisionID__ + "]";
      }
    }
    else{
      result += "<br>Unfortunately I was unable to determine a diagnosis with symptoms you shared. <br>";
    }
  }
  if(config.debug){
    console.log("  == BAWHelper.js / formatUWResponse / formatted response: " + result);
  }
  return result;
}

//}//helpers
