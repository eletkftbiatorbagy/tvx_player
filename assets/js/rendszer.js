var RELOAD;

function DEBUG()
{
	// ****************************  DEBUG  ***********************************************  ( 9998-as porton elérhető a browser )
	var configuration = new Configuration();
	var options = {};
	options.enabled = true; //enabling debug mode
	configuration.debug( 
		function successCb() { console.log("Succeeded to enable the debug mode");document.getElementById("info").innerHTML = "<span style='color:lime;'>DEBUG OK</span><br>"+document.getElementById("info").innerHTML; document.getElementById("info").style.display="block";},
			function failureCb() { console.log("Failed to enable the debug mode");}, 
				options);
	// ****************************  DEBUG  ***********************************************
}



function failure(cbObject) {
        var errorCode = cbObject.errorCode;
        var errorText = cbObject.errorText;
        document.getElementById("info").innerHTML=cbObject.errorText+"<br>"; 
        console.log ("HIBA: Error Code [" + errorCode + "]: " + errorText);
}
function getPlatformInfo(cbObject) {
        INFO.serialNumber 		= cbObject.serialNumber;
        INFO.firmwareVersion 	= cbObject.firmwareVersion;
        INFO.hardwareVersion	= cbObject.hardwareVersion;
        INFO.modelName			= cbObject.modelName;
        INFO.sdkVersion			= cbObject.sdkVersion;
}
function NetworkInfo(net) {
		console.log("NETWORK:"+JSON.stringify(net));
		var connection = "";
		if (net.wifi && net.wifi.state==="connected") { connection ="wifi"; }
		if (net.wifiDirect && net.wifiDirect.state==="connected") { connection ="wifiDirect"; }
		if (net.wan && net.wan.state==="connected") { connection ="wan"; }
		if (net.wired && net.wired.state==="connected") { connection ="wired"; }
		if (net[connection].onInternet)
		{ 
			if (net[connection].onInternet==="yes") { INFO.internet = "OK"; document.getElementById("info").innerHTML+="<br><span style='color:lime;'>Internet :</span>"+"<span style='color:lime;width:initial;'>"+INFO.internet+"</span>";}
				else { INFO.internet = "NINCS"; document.getElementById("info").innerHTML+="<br><span  style='color:red;'>Internet :</span>"+"<span style='color:red;'>"+INFO.internet+"</span>"; } 
		}
		INFO.IP	= net[connection].ipAddress;
		document.getElementById("info").innerHTML+="<br><span>Belső IP :</span>"+INFO.IP;
		if (net[connection].dns1) { document.getElementById("info").innerHTML+="<br><span>DNS :</span>"+net[connection].dns1;}  
}

function StorageInfo(cbObject) {
    INFO.memFree = 	cbObject.free;
    INFO.memTotal = cbObject.total;
}

function myIP() {
    if (window.XMLHttpRequest) xmlhttp = new XMLHttpRequest();
    else xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");

    xmlhttp.open("GET","http://server.tvx.hu/code/ip.php",true);
    xmlhttp.send();
	
	xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
    		document.getElementById("info").innerHTML += "<br><span>Külső IP :</span>"+xmlhttp.responseText; 
    }};		
}


function removeAllFiles() 
{
    var successCb = function (cbObject){
        console.log( " *************  Removed all files **************** " ); 
    };
    var options = { 
        device: 'internal' // This will remove all files in the internal memory space.
    }; 
 
    var storage = new Storage();
    storage.removeAll(successCb, failure, options);
}




function FajlOlvasas_OLD(fajl,callback)
{	
	console.log("Fájl olvasás: "+fajl);		
	var ottvan = function (cbObject,fajl,callback){
										var exists = cbObject.exists;
										if (exists)
										{
											console.log("Betölthető a fájl : "+fajl); 												 //callback(fajl.null);
											function getFileSize(URL, cb) {
												var successCb = function (cbObject){ cb(cbObject.size); };
												var failureCb = function(cbObject){ console.log("Error"); };    
												var options = { path: URL };
												new Storage().statFile(successCb, failureCb, options);
											}
											
											
											
											var readData = [];
											var totalRead = 0;
											 
											function readFile(URL, totalFileSize, cb) {
												var successCb = function (cbObject){	console.log("beolvasva: "+cbObject.byteLength);
																						if (cbObject.byteLength == 0)
																							 {	cb(readData);  }
																						else {
																								var binary_data = cbObject.data;    // ArrayBuffer
																								var tempUInt8Array = new Uint8Array(binary_data);
																								for(var i=0; i<= totalFileSize; i++) {
																																	cb(readData);
																							 								   }									
																							 }
																					};
												new Storage().readFile(successCb, failure, options);

											};
												 
											var filePath = "file://internal/"+fajl;
											 
											getFileSize(filePath, function(fileSize) {  console.log(fajl + " : "+ fileSize + " bytes")
												readFile(filePath, fileSize, function(data) {
													console.log(data);
												});
											});
										}
										else
										{	console.log("Nincs ilyen fájl : "+fajl);
											callback(fajl,null);
										}
	}; 
	 
	var options = {};
	options.path = "file://internal/"+fajl; 
	 
	var storage = new Storage();
	storage.exists(function(obj) {ottvan(obj,fajl,callback);}, failure, options);
}

function FajlSzinkron (fajlnev,callback)		// teljes fájlrendszer szinkronizáció
{	//console.log("- szinkronizálás : "+ arguments[1] +" / "+ arguments[0] );
	var storage = new Storage();
	var option;
	if (fajlnev) { option = { path:"path://internal/"+fajlnev }; } else { option = {}; }
	var Sync_success = function(){  callback(); }
	storage.fsync(callback,failure,option);			
}

