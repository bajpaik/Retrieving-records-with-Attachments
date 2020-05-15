//NEED TO BE MODIFIED A BIT AS PER YOUR REQUIREMENT

var IntegrationUtils = Class.create();
IntegrationUtils.prototype = {
    initialize: function(endpointurl, midserver) {
        this.tach_consumer = gs.getProperty('x_357476_1e_kush.request_header');
        this.instruction_api = gs.getProperty('x_357476_1e_kush.scope_extention');
        this.mid_server = gs.getProperty("x_357476_1e_kush.mid_url");
        this.tachyon_server_url = (endpointurl != "") ? endpointurl : gs.getProperty('x_357476_1e_kush.default_url');
        this.single_tachyon = gs.getProperty('x_357476_1e_kush.default_tachyon');
        this.responseBody = new Array();
        this.integration_table = "x_357476_1e_kush_1e_integration_table";

    },
/****************************************
     * @ Function Name :testConnection.
     * @ Functionality : Validate credentials whether usable for API Call
     * @ Parameter(s) :	null.
     * @ Return : true / false .
     *****************************************/
    testConnectionDomain: function(username, password) {
        if ((username != '') && (password != '')) {
            try {
                var instructionrest = new sn_ws.RESTMessageV2();
                instructionrest.setRequestHeader("Accept", "application/json");
                instructionrest.setRequestHeader("Content-Type", "application/json");
                instructionrest.setBasicAuth(username, password);
                instructionrest.setHttpMethod("get");
                instructionrest.setEndpoint(this.tachyon_server_url + this.instruction_api);

                /*	if (this.mid_server != "") {
                		if (this.validateMidServer()){
                			instructionrest.setMIDServer(this.mid_server);
                			instructionrest.setEccParameter('skip_sensor', true);		
                		}
                		else
                			return false;
                	} */
                var response = instructionrest.execute();
                var responseBody = response.getBody();
                var httpStatus = response.getStatusCode();
                gs.info("APIUtils:Function:testConnection HTTP" + httpStatus);
                if (httpStatus == "200") { // validate http status if credetentials are usable for tachyon connection .
                    return true;
                }

                return false;
            } catch (ex) {
                gs.info("APIUtils:TestConnection API exception for application : " + ex.message);
                return false;

            }
        }
    },
    /****************************************
     * @ Function Name :fetchInstructionsDomain.
     * @ Functionality : Pull Instructions and respsective parameters from Tachyon Server to Service-Now tables.
     * @ Parameter(s) :	application (String):Application Name,UserName(String):username for connecting to Tachyon,Password(String):password for connecting to tachyon.
     * @ Return : null.
     *****************************************/
    fetchInstructionsDomain: function(application, username, password) {
        var requestBody;
        if ((this.tachyon_server_url != '') && (username != '') && (password != '')) {
            try {
                var instructionrest = new sn_ws.RESTMessageV2();
                instructionrest.setRequestHeader("Accept", this.tach_consumer);
                instructionrest.setRequestHeader("Content-Type", this.tach_consumer);
                instructionrest.setBasicAuth(username, password);
                instructionrest.setHttpMethod("get");
                instructionrest.setEndpoint(this.tachyon_server_url + this.instruction_api);

                /*	if (this.mid_server != "") {
                	if (this.validateMidServer()){
                		instructionrest.setMIDServer(this.mid_server);
                		instructionrest.setEccParameter('skip_sensor', true);		
                	}
                	else
                		return false;
                } */
                var response = instructionrest.execute();
                var responseBody = response.haveError() ? response.getErrorMessage() : response.getBody();
                var httpStatus = response.getStatusCode();
                gs.info("APIUtils:Function:getInstruction status " + httpStatus);


                var obj = JSON.parse(responseBody);
                for (var i = 0; i < obj.result.length; i++) {
                    var integrationTable = new GlideRecord(this.integration_table);
                    integrationTable.addQuery('correlation_id', obj.result[i].sys_id);
                    integrationTable.query();
                    if (!integrationTable.next()) {

                        integrationTable.initialize();
                        integrationTable.third_party_incident = obj.result[i].number;
                        //integrationTable.attachment_data = sa_responseBody;

                        integrationTable.third_party_instance_url = this.tachyon_server_url;

                        integrationTable.short_description = obj.result[i].short_description;
                        integrationTable.description = obj.result[i].description;
                        integrationTable.correlation_id = obj.result[i].sys_id;
                 //       integrationTable.attachment_data = this.getAttachment(integrationTable.correlation_id, username, password);
                        integrationTable.insert();
				this.getAttachment(integrationTable.correlation_id, integrationTable.sys_id, username, password);
                    }
					gs.info(integrationTable)

                }

                return true;
            } catch (e) {

                gs.info("API_1E Error : " + e.message);
                return false;
			}
      
        }
    },


    getAttachment: function(thirdPartyRecord,recordSysID, username, password) {
        try {
            var sa = new sn_ws.RESTMessageV2();
            sa.setEndpoint('${base_instance_url}' + '/api/now/attachment?sysparm_query=table_sys_id=' + '${id}');
            sa.setHttpMethod("GET");
            sa.setStringParameter("base_instance_url",this.tachyon_server_url);
            sa.setStringParameter("id",thirdPartyRecord);
            sa.setBasicAuth(username, password);
            var res = sa.execute();
            var att_obj = JSON.parse(res.getBody());
			for(var i=0; i<att_obj.result.length; i++){
			gs.info(att_obj.result[i].sys_id);
 return this.getAttachmentBinary(att_obj.result[i].sys_id,recordSysID, att_obj.result[i].file_name, username,password);
}
		} catch (ex) {

            gs.info("API_1E Attachment Error: " + ex.message);

        }
    },

// uploads a binary file specified in the request body as an attachment
   getAttachmentBinary: function(attachment_sys_id, recordSysId, filename, username, password) {

        try {
            var request = new sn_ws.RESTMessageV2();
            request.setHttpMethod('get');

            var response,
                tablename = this.integration_table,
                httpResponseStatus;

            //endpoint - ServiceNow REST Attachment API        
            request.setEndpoint('${base_instance_url}' + '/api/now/attachment/' + attachment_sys_id + '/file');
			request.setStringParameter("base_instance_url",this.tachyon_server_url);
            request.setBasicAuth(username, password);
			request.setRequestHeader("Content-Type","*/*");
            //RESTMessageV2 - saveResponseBodyAsAttachment(String tableName, String recordSysId, String fileName)        
            request.saveResponseBodyAsAttachment(tablename, recordSysId, filename);
            response = request.execute();
			
            httpResponseStatus = response.getStatusCode();
            
            gs.info("Result http response status_code:  " + httpResponseStatus);
			gs.info("Result : "+response.haveError() + " " + response.getErrorMessage());
		
        } catch (ex) {
            var message = ex.message;
            gs.info("API_1E Attachment Binary " +message);
        }

    },
      validateMidServer: function() {

        var midServer = new GlideRecord("ecc_agent");
        midServer.addQuery("name", this.mid_server);
        midServer.query();
        if (midServer.next()) {
            if (midServer.status == "Up" && midServer.validated == "true")
                return true;
        }
        gs.info("API_1E:Mid server is down");
        return false;
    },
    
      type: 'IntegrationUtils'
};