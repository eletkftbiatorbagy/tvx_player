var INFO = { softwareVersion:"2.00", serialNumber: "", firmwareVersion:"", hardwareVersion:"", modelName:"", sdkVersion:"", ip:"", memFree:"", memTotal:"", w:0, h:0 , internet:"NINCS" };

var debug = true;
var DEBUG_SERIAL = ["SKJY1107"];				// a debug módba bevont kijelzők széria száma - emulátor esetén is megy a debug
var DEBUG_RELOAD = null;						// DEBUG ciklikus újraindítás az emulátorban (reset helyett praktikusabb)   [másodperc]   ***** null = kikapcsolva  *****
var INFO_ABLAK = 10;							// az info ablak láthatósági ideje [másodperc]
var STATUSZ_TRIAL;								// a szerver elérés próbálkozásainak számlálója
var STATUSZ_MAXPROBA	= 3;					// ennyiszer próbálkozik első körben (10mp-es intervallummal) elérni a szervert  [alkalom]
var STATUSZ_TRIAL_LONG 	= 5;					// ha nem sikerült a 10mp-es csatlakozási sorozat, akkor második körben átvált ekkora időközre [perc]	
var STATUSZ_TIMER;								// a szerver próbálkozások időzítője
var statusz_callback = function(response) { StatusUpdate(response); };	// a szerver próbálkozás visszatérő funkciója
var SERVER 			= "server.tvx.hu";			// a státuszlekérésre várakozó szerver címe
var CDN         	= "server.tvx.hu/cdn";				// a tartalom tár elérési címe
var STATUSZ_PHP 	= "/code/status.php";		// a státuszlekérő ajax hívás ide menjen
var DISK   		= "http://127.0.0.1:9080/";   // lokális háttértár.
var UPDATE_TIME = 1;                         // a szerver státusz normál, üzemi lekérdezés gyakorisága [perc]
var UPDATE;									 // frissítés függvény-változója
var MUSOR_FUT = false;						 // a műsor állapotjelzője - frissítéskor, ha már fut, és nincs új, akkor megy tovább 
var VIDEO_OBJEKTUM;						     // a képernyőn lévő video tag objektum tároló változója - mivel csak egy lehet egyidőben (LG), ezért cserekor tötölni kell a régit
var DOWNLOAD_IN_PROGRESS = false;			// a letöltés állapotváltozója (ne induljon addig újra, ne frissítsen)
var DOWNLOAD_START_TIME;					// a letöltés kezdetének időpontja - ha túl sokáig tart => újraindítás

//var DATA_ures = { };
var DATA = {};								// ebben az objektum tömbben tárolódik valamennyi lejátszással kapcsolatos adat, beállítás. Összevontan a MUSOR és a PRIVAT tartalmak.
var MUSOR = "{}";								   // json formátumban a musor.json tartalma (tartalmazza a LAYOUT és a PROGRAM tömböket is)
var PRIVAT = "[]";							   // json formátumban a privat.json tartalma (csak MEDIA tömb)
var POS  = { "video":0, "foto":0 };
var StartLayout;
var MOST_Layout = "";						// az aktuálisan képernyőn lévő layout neve
var MOST_Program = 0;						// az aktuálisan játszott program lépés (layout) tömb-sorszáma
var MEDIA_Counter = Array();				// melyik média anyagot, hányszor játszottuk már le
var MEDIA_playing = Array();				// melyik média van épp adásban ( == true )
var MEDIA_error = Array();					// a hibás tartalmak kizárása a lejátszásból
var media = Array();						// letárolt hash adatok gyűjtője
var SCROLL_SPEED = 750;						// a futószöveg sebessége ( pixel / másodperc)

var IMG      = Array();
var TimeOut  = Array();						// képváltás időzítő timer-ek gyűjteménye külön-külön a képernyőkhöz
var Interval = Array();
var Scroller ={  };
var callback;
var musorszunet_timer;						// a műsorszünet logo animációs timer-e
var MUSORSZUNET = false;
var CHANGEIMAGE_TIMER = [];					// képváltás timer tömb (csak az új kép cseréjénél, egyébként lásd: TimeOut[] )
CHANGEIMAGE_RANDOM_plussz = 30;				// képváltás véletlenszerű megváltoztatásának intervalluma : plussz-mínusz  [százalék]
CHANGEIMAGE_RANDOM_minusz = 10;
var VIDEO_ERROR_TIMER;						// videó lejátszáskor a valamilyen hiba miatt le nem játszott videó várakozási időzítője
var VIDEO_ERROR_SEC = 40;					// max. ennyi idő után továbblép a következő videóra [másodperc]    !!! ne legyen rövidebb, mint a leghosszabb videó !!!

var CONSOLE_ID = [ "CONSOLE_LOG","CONSOLE_INFO","CONSOLE_WARNING","CONSOLE_ERROR" ];
var MOST_CONSOLE = -1;

function Init()							// --------------------------------  kezdés itt
{
	setTimeout( function(){
		var C = document.getElementById("CONSOLE").childNodes;
		var N = ["Console","INFO","WARNING","ERROR"];
		var CC = 0;
		for (var c=0; c<C.length; c++)
		{
			if (C[c].firstChild) { C[c].firstChild.innerHTML = N[CC]; CC++;}
		} 
	},0);
		
	(function(){
			var oldLog = console.log;
			console.log = function (message) {
				oldLog.apply(console, arguments);
				var level = 0;
				while (message.substr(0,1)==="•")
				{
					message = message.substr(1);
					level++;
				}
				var ccolor = "";
				var cpanel = CONSOLE_ID[level];
				var t = new Date();
				var timestamp = "<time>" + t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + (t.getDate() + 1)).slice(-2) + "&nbsp;&nbsp;&nbsp" + ("0"+t.getHours()).slice(-2) + ":" + ("0"+t.getMinutes()).slice(-2) + ":" + ("0"+t.getSeconds()).slice(-2) + "</time>";
				switch (level)
				{
					case 1:		ccolor="lime"; 		break;
					case 2:		ccolor="#ffff00"; 	break;
					case 3:		ccolor="ffa0a0"; 	break;
					default: 	ccolor="ffa0a0"; 	break;
				}
				if (level > 0) { document.getElementById(cpanel).childNodes[1].innerHTML = document.getElementById(cpanel).childNodes[1].innerHTML.substr(-5000) + timestamp + "<span>" + message + "</span><br>"; }
				if (document.getElementById(cpanel).childNodes[1]) { document.getElementById("CONSOLE_LOG").childNodes[1].innerHTML = document.getElementById("CONSOLE_LOG").childNodes[1].innerHTML.substr(-5000) + timestamp + "<span style='color:"+ccolor+";'>"+message + "</span><br>"; }
			};
	})();
	
	document.onkeydown = function(event) {
			var keyCode = event.keyCode;
			
			var console_leptetes = function(irany) {
					if (MOST_CONSOLE>=0) { document.getElementById(CONSOLE_ID[MOST_CONSOLE]).style.display="none"; }
					MOST_CONSOLE += irany;
					if (MOST_CONSOLE == CONSOLE_ID.length) { MOST_CONSOLE = 0; }
					if (MOST_CONSOLE == -1) { MOST_CONSOLE = CONSOLE_ID.length-1; }
					document.getElementById(CONSOLE_ID[MOST_CONSOLE]).style.display="block";
					document.getElementById(CONSOLE_ID[MOST_CONSOLE]).childNodes[1].style.bottom = "0";
			}
			var console_scroll = function(irany) {
					var P = document.getElementById(CONSOLE_ID[MOST_CONSOLE]).childNodes[1];
					var H = document.getElementById(CONSOLE_ID[MOST_CONSOLE]).offsetHeight;
					var B = (H) - (P.offsetTop + P.offsetHeight);		// = offsetBottom
					if (irany<0 && P.offsetTop<0) { B = B - 30; }   // felfelé mozgatjuk a listát
					if (irany>0 && B<0) { B = B + 30; }				// lefelé mozgatjuk a listát
					P.style.bottom = B+"px";
			}
			
			switch(keyCode){
				case 406:	// KÉK
						
					break;
				case 405:	// SÁRGA	
					if (document.getElementById("connect_ok").style.display=="block") // aktiváláskor a sárga gombbal azonnali státuszlekérést kérünk
					{ 	
						STATUSZ(); 
						document.getElementById("connect_ok").style.display="none";
						break;
					}  
					document.getElementById("CONSOLE").style.display=(document.getElementById("CONSOLE").style.display=="block")?"none":"block";
					if (document.getElementById("CONSOLE").style.display=="block")
					{
						console_leptetes(1);
					}
					break;
				case 39:	// JOBBRA NYÍL
					if (document.getElementById("CONSOLE").style.display=="block")	     // ha konzol módban vagyunk
					{
							console_leptetes(1);
					}
					break;
				case 37:	// BALRA NYÍL
					if (document.getElementById("CONSOLE").style.display=="block")	     // ha konzol módban vagyunk
					{
							console_leptetes(-1);	
					}
					break;
				case 38:	// FEL NYÍL
					if (document.getElementById("CONSOLE").style.display=="block")	     // ha konzol módban vagyunk
					{
							console_scroll(-1);	
					}
					break;
				case 40:	// LE NYÍL
					if (document.getElementById("CONSOLE").style.display=="block")	     // ha konzol módban vagyunk
					{
							console_scroll(1);	
					}
					break;				
				default:
					console.log('--- unknown key pressed : '+keyCode);
					// Do something or call the event handler
				}
	}																																						
																	//removeAllFiles();   // háttértár törlés - csak ideiglenesen legyen bekapcsolva,teszteléshez
	
	
	setInterval( function(){ STATUSZ(); }, UPDATE_TIME * 1000 * 60);			//  X perc időzített státusz frissítés a szerverről (műsor, parancsok, stb.)
	
	var deviceInfo = new DeviceInfo();
	var storage = new Storage();
    console.log("--Rendszer információk lekérése--");
    deviceInfo.getPlatformInfo(getPlatformInfo, failure);		// rendszer adatok lekérése
    deviceInfo.getNetworkInfo(NetworkInfo, failure);			// hálózati státusz lekérése
    
    storage.getStorageInfo(StorageInfo, failure);
    
	setTimeout(function(){										// infó kis ablak adatai
		INFO.w = screen.width;
		INFO.h = screen.height;
		if (DEBUG_SERIAL.indexOf(INFO.serialNumber)== -1) { debug=false; }
		if (debug) { DEBUG(); }
		document.getElementById("Info").style.display="block";
		document.getElementById("info").innerHTML+= "<br><span>Software version :</span>"+INFO.softwareVersion;
		document.getElementById("info").innerHTML+= "<br><span>Resolution :</span>"+INFO.w + " x " + INFO.h;
		document.getElementById("info").innerHTML+= "<br><span>Free memory :</span>" + parseInt(INFO.memFree/1024) + " MB ("+ parseInt(100*(INFO.memFree/INFO.memTotal)) + "%)";  
		document.getElementById("info").innerHTML+="<br><span>Serial NR :</span>"+INFO.serialNumber;   console.log("SERIAL NR: "+INFO.serialNumber);
		
		myIP();
		new QRCode(document.getElementById("QR"),{ text: INFO.serialNumber, width:300, height:300, colorDark : "#000000", colorLight : "#dfdfdf", correctLevel : QRCode.CorrectLevel.H });
		BETOLTES();    // csak késleltetéssel hívjuk, mert kell a serial a szerver azonosításhoz!
		if (debug && DEBUG_RELOAD) { RELOAD = setTimeout(function(){location.reload();},1000 * DEBUG_RELOAD ); }  // DEBUG újraindítás az emulátorban (reset helyett kényelmesebb)
		},2000);
	
	setTimeout(function(){document.getElementById("Info").style.display="none";},INFO_ABLAK*1000);   // infó kijeltő kis ablak eltüntetése idővel
	
}

function MEDIA_reset()					//  a médiák lejátszásához tartozó tárolók nullázása
{
	console.log("MEDIA COUNTER RESET ##################################### ");
	for (var n=0; n < DATA.MEDIA.length; n++)
	{	
		MEDIA_Counter[DATA.MEDIA[n].fajl] = 0;	   // a lejátszási számláló kinullázása
		MEDIA_playing[DATA.MEDIA[n].fajl] = false;  // a lejátszási flag törlése
	}
}

function CHANGEIMAGE_TIMER_reset()
{
	for (var n=0; n<TimeOut.length; n++)
	{
		clearTimeout(TimeOut[n]); TimeOut[n]=null;
	}
	TimeOut = [];
	for (var n=0; n<CHANGEIMAGE_TIMER.length; n++)
	{
		clearTimeout(CHANGEIMAGE_TIMER[n]); CHANGEIMAGE_TIMER[n]=null;
	}
	CHANGEIMAGE_TIMER = [];	
}

function Musorszunet()							// ha nincs mit lejátszani, induljon a képernyőmentés (ugráló logó)
{
	console.log("NINCSENEK MŰSOR FÁJLOK...");
	if (musorszunet_timer) { return; }  // ha már fut
	document.getElementsByTagName("kepernyo")[0].style.display="none";
	MUSORSZUNET = true;
	var MSZ = document.getElementById("musorszunet");
	MSZ.style.display="block";
	musorszunet_timer = setInterval(function(){
												MSZ.style.marginLeft = 60*Math.random() + "%";
												MSZ.style.marginTop = 35*Math.random() + "%";
											},3000);
	return;
}

	
function BETOLTES()							// ----------------------------  a háttértárban tárolt beállítások (musor.json privat.json) betöltése - offline indításhoz
{	console.log("LOAD kezdés...");
	if (localStorage.getItem("MUSOR_JSON")) { FajlOlvasas_UTF(localStorage.getItem("MUSOR_JSON"),FoMusor_Betoltve);}
	if (localStorage.getItem("PRIVAT_JSON")) { FajlOlvasas_UTF(localStorage.getItem("PRIVAT_JSON"),PrivatMusor_Betoltve);}
	setTimeout( function(){	 // késleltetéssel (legyen idő betölteni) feldolgozzuk őket és kérdezzük meg újra, van-e újabb műsor (ha nincs, ez indítja a vetítést majd)
					DATA = JSON.parse(MUSOR);
// 					if (DATA.MEDIA && DATA.MEDIA.isArray)
// 					{ 
						var FOMEDIA = DATA.MEDIA;	console.log("PRIVAT = "+PRIVAT);
						DATA.MEDIA = DATA.MEDIA.concat(JSON.parse(PRIVAT));		// összefésüljük a két media tömböt	
// 					}	
					console.log("DATA = "+JSON.stringify(DATA));
					STATUSZ();
				},3000);		
}
var FoMusor_Betoltve = function(fajlnev,adat) {	console.log("Főműsor betöltve.");								// musor.json callback függvény - a betöltés után feldolgozza a fájl tartalmát 
			if (adat == null) { STATUSZ(); return; }	// ha nincs ilyen fájl, akkor kérje le
			MUSOR = adat;
			console.log(fajlnev+"- főműsor adatok feldolgozva -");
			};
var PrivatMusor_Betoltve = function(fajlnev,adat) {	console.log("Privát műsor betöltve.");						// privat.json callback függvény - a betöltés után feldolgozza a fájl tartalmát 
			if (adat == null) { STATUSZ(); return; }	// ha nincs ilyen fájl, akkor kérje le
			PRIVAT = adat;
			var torolni = JSON.parse(PRIVAT);
			var del_count = 0;
			var fajlTorolve = function (){ console.log("•TÖRÖLVE : "+torolni[del_count]); del_count++; if (del_count<torolni.length) { fajlTorles(); } };
			var fajlTorles = function() {
					var storage = new Storage(); 
					options = { file: "file://internal/"+torolni[del_count].fajl+"."+torolni[del_count].tipus };
					storage.removeFile(fajlTorolve, failure, options);
			};
			if (torolni.length>0) { fajlTorles(); }
			console.log(fajlnev+"- privát műsor adatok feldolgozva -");
			};

			

function FajlOlvasas_UTF(fajlnev,fajlkezelo,param1,param2)					// ----------------------------  a fájl meglétének vizsgálata, majd a betöltött adatokat visszaadja a callback függvénynek (fájlkezelo)
{																	//  a param érték tetszőleges visszatérő (átadott) változó 
	var TotalFajlMeret = 0;
	console.log("Fájl olvasás: "+fajlnev);		
	var ottvan = function (cbObject,fajlnev,fajlkezelo,param1,param2){
										var exists = cbObject.exists;
										if (exists)
										{
											var FajlBeolvasva = function(obj) { fajlkezelo(fajlnev,obj.data,param1,param2); };
											console.log("Betölthető a fájl : "+fajlnev);
											var options = {
															path : "file://internal/"+fajlnev,
															position : 0,
															encoding : "utf8"
														  }
											var storage = new Storage();									
											storage.readFile(FajlBeolvasva, failure, options);
										}
										else
										{	console.log("Nincs ilyen fájl : "+fajlnev);
											fajlkezelo(fajlnev,null,param1,param2);
										}
	}; 
	 
	var options = {};
	options.path = "file://internal/"+fajlnev; 
	 
	var storage = new Storage();
	storage.exists(function(obj) {ottvan(obj,fajlnev,fajlkezelo,param1,param2);}, failure, options);
}

function FajlOlvasas(fajl,callback)				// használaton kívül   - nem működik még, de ez kell majd a nagyobb méretű fájlok betöltéséhez (lásd.: 10 kByte limit )
{	
	var TotalFajlMeret = 0;
	console.log("Fájl olvasás: "+fajl);		
	var ottvan = function (cbObject,fajl,callback){
										var exists = cbObject.exists;
										if (exists)
										{
											console.log("Betölthető a fájl : "+fajl);
											var FajlDarabOlvas = function() {
																						var OlvasoPuffer = TotalFajlMeret - FajlPozicio;
																						if (OlvasoPuffer > 10240) { OlvasoPuffer = 10240; }
																						var options = {
																											path: "file://internal/"+fajl, 
																											position : FajlPozicio,
																											length : OlvasoPuffer,
																											encoding : "binary"
																										}
																						var storage = new Storage();
																						storage.readFile(DarabFeldolgoz,failure,options);
																						var DarabFeldolgoz = function(obj) {
																																ADAT = ADAT.concat(obj.data);
																																FajlPozicio += OlvasoPuffer;
																																FajlDarabol();
																															};
																			};
											var FajlDarabol = function() {	console.log("Olvasas : "+FajlPozicio + " - "+OlvasoPuffer );
																			if (TotalFajlMeret > FajlPozicio)
																			{
																				
																				FajlDarabOlvas();
																			}
																			else
																			{
																				var Ertek = new String(ADAT, Charsets.UTF_8);
																				//callback(Ertek);
																			}
																		};
											var FajlMeretMegvan = function(obj) {  
																					console.log("Fajl méret : "+obj.size + " byte");
																					
																					console.log("Fajl tipus : "+obj.type );
																											
																					FajlDarabol();							
																				};									
											var storage = new Storage();									
											storage.statFile(FajlMeretMegvan, failure, { path: "file://internal/"+fajl });
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


function STATUSZ() 						// --------------------------  a szerver státusz üzenet lekérése
{ 
	STATUSZ_TRIAL = 0;		// nullázzuk a rövid próbálkozás számlálót
	STATUSZ_TRY();			// első próbálkozás
	STATUSZ_TIMER = setInterval(function(){
		STATUSZ_TRY();
	},10000);					// 10mp-es időközzel újra próbálkozik
	 
};

function STATUSZ_TRY(proba)			// ------------------------------------------------- SZERVER STÁTUSZ LEKÉRÉS
{
	STATUSZ_TRIAL++;	
	if (STATUSZ_TRIAL == STATUSZ_MAXPROBA) 	 // ha elérte a max rövid próbálkozás számát, akkor hosszabb időközre vált
	{											// (azért nem '>' reláció, mert a hosszú próbálkozás végtelenszer fut le ) 
		clearInterval(STATUSZ_TIMER); STATUSZ_TIMER = null;	  // régi időzítés törlése
		STATUSZ_TIMER = setInterval(function(){
												STATUSZ_TRY();
												},1000 * 60 * STATUSZ_TRIAL_LONG);
		VetitesIndul();				// ha nincs szerver a max próbálkozás után sem, akkor közben indul a korábbi vetítés 
	}
	console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>> Szerver státusz lekérés");
	var musorID;
	if (DATA && DATA.FEJLEC && DATA.FEJLEC.musorID) { musorID = DATA.FEJLEC.musorID; } else { musorID=0; }	 // ha nincs aktuális id, akkor 0-val megy az ajax hívás
	
	ajax_hivas("http://"+SERVER+STATUSZ_PHP+"?musor="+musorID+"&privat_musor="+localStorage.getItem("privat_musor")+"&info="+JSON.stringify(INFO),"statusz_callback","data");
}

function StatusUpdate(response)			// ------------------------------  szerver státusz üzenet feldolgozása	
{	
	clearInterval(STATUSZ_TIMER); STATUSZ_TIMER = null;		// Sikeres szerver válasz, a próbálkozás időzítést töröljük
	console.log("•Szerver válasz üzenet : "+response);
	var IDO  = response.split("∆")[0];		// szerver idő - hogy nehogy elállítódott belső órával dolgozzon  yyyy-mm-dd
	var MOST = new Date (IDO);
	var RESP = response.split("∆")[1];		
	if (RESP === "OK") { CheckFiles();  return;}
	
	// egyéb parancs értelmezés
	var COMMAND = RESP.split("|");		// a parancsok szétválasztása
	console.log("C0 = "+COMMAND[0]);
	for (var n=0; n<COMMAND.length; n++)
	{
		var C = COMMAND[n].split(":");	// az idő és a parancs szétválasztása	
		var TOL = C[0];
		var PARANCS = C[1];			console.log("PARANCS= "+TOL+" : "+PARANCS+":"+C[2]+":"+C[3]);
		if (TOL==="" || (new Date(TOL) <= MOST))     // ha azonnali vagy már időben érvényes a parancs
		{
			switch (PARANCS)
			{
				case "REG_OK":																							// a regisztráció sikeres volt
									new QRCode(document.getElementById("reg_qr"),{ text: INFO.serialNumber, width:400, height:400, colorDark : "#000000", colorLight : "#dfdfdf", correctLevel : QRCode.CorrectLevel.H });
									document.getElementById("connect_ok").style.display="block";
									document.getElementById("reg_nr").innerHTML = "Kód :&nbsp;&nbsp;&nbsp;" + C[2].substr(0,2)+" "+C[2].substr(2,2)+" "+C[2].substr(4,2)+" "+C[2].substr(6,1) + EAN8_checksum(C[2]);
									Musorszunet();
									break;
				case "SCREENSAVER":
									Musorszunet();
									break;
				case "RESTART":     
									var options = {};
										options.powerCommand = Power.PowerCommand.REBOOT;
									var power = new Power();
									power.executePowerCommand(ParancsVisszaigazolas(COMMAND[n]), failure, options);	
									break;
				case "SHUTDOWN" :     	
									var options = {};
										options.powerCommand = Power.PowerCommand.SHUTDOWN;
									var power = new Power();	
									power.executePowerCommand(ParancsVisszaigazolas(COMMAND[n]), failure, options);	
									break;					
				case "SOFTWARE" :  	var szoftver_frissitve = function() {
										ParancsVisszaigazolas(COMMAND[n]);
										STATUSZ();	
									}
									var options = {};
									options.to = Storage.AppMode.LOCAL;
									options.recovery = true;
									storage = new Storage();
									storage.upgradeApplication(szoftver_frissitve, failure, options);
									break;
				case "FIRMWARE" :   break;
				
				case "MUSOR"  :		
									if (C[2]==="00000000")  // nincs műsor - még csak épp regisztráltuk, mint új kijelző
										{ 
											document.getElementById("connect_ok").style.display="none";	// levesszük az aktiválási felszólítást (QR kód)
											document.getElementById("reg_ok").style.display="block";	// kitesszük egy időre a sikeres regisztráció képernyőjét
											setTimeout(function(){ document.getElementById("reg_ok").style.display="none"; },15000);
											Musorszunet(); 
											break; 
										}
									if (C[2]==="99999999")  // nincs műsor - kikapcsoltuk a lejátszást
										{ 
											Musorszunet(); 
											break; 
										}	   
									if (DOWNLOAD_IN_PROGRESS) { 
											console.log("Letöltés folyamatban --- ");
											break; 
										}
									
									DOWN = [];					// letöltendők ürítése
									DATA = {};		// json tartalmak ürítése
									TOTAL_byte = 0;
									DOWN_byte = 0;
									down_num = 0;	
									var musorok = C[2].split("•");			console.log("musorok= "+C[2]);
									for (var m=0; m<musorok.length; m++)
									{
										if (musorok[m]!=="")	// ha van mit letölteni a helyiértéken  ( MUSOR:musor|privat )
										{ 
											DOWN[DOWN.length] = Array();
											var elotag="";
											if (m==0) { elotag = "musor_"; }
											if (m==1) { elotag = "privat_"+INFO.serialNumber+"_"; }
											DOWN[DOWN.length-1]["fajl"] = elotag + musorok[m]+".json";			console.log("Új műsor letöltése : "+elotag + musorok[m]+".json");
											DOWN[DOWN.length-1]["meret"] = 3000;   // egységes, jelképes méret
											DOWN_byte += 3000;
										}	
									}
									downloadFile();				// json fájl(ok) letöltése
									break;
				// case "PRIVAT_MUSOR" :
// 									if (DOWNLOAD_IN_PROGRESS) { 
// 											console.log("Letöltés folyamatban --- "); 
// 										}
// 									console.log("Új privát műsor letöltése : "+C[2]+".json");
// 									DOWN = [];					// letöltendők ürítése
// 									DATA_PRIVAT = {};		// json tartalmak ürítése
// 									DOWN[0] = Array();
// 									DOWN[0]["fajl"] = INFO.serialNumber+"_"+C[2]+".json";
// 									DOWN[0]["meret"] = C[3];
// 									DOWN_byte  = C[3];    		console.log("----- JSON_DOWN : "+DOWN.length+" files ("+DOWN_byte+" bytes)");
// 									TOTAL_byte = 0;
// 									//document.getElementById("down_OK").innerHTML="A műsor frissítése sikeres";
// 									downloadFile();				// json fájl letöltése
//  									break;					
			}
		}
	}

}

function ParancsVisszaigazolas(PARANCS)
{
	
}


function EAN8_checksum(s)
{
	var result = 0;
    for (counter = s.length-1; counter >=0; counter--){
        result = result + parseInt(s.charAt(counter)) * (1+(2*(counter % 2)) );
    }
    return (10 - (result % 10)) % 10;
}


// GLOBÁLIS változók a letöltéshez
var DOWN = Array();			// a letöltendő fájlok tömbje
var FAST_MEDIA = Array();	// a külön vizsgálandó, szerkeszthető fájlok gyűjtője
var DOWN_byte = 0;			// a letöltendő byte-ok száma
var TOTAL_byte = 0;			// a letöltendő + már letöltött byte-ok száma (tár ellenőrzéshez)
var DOWN_progress = 0;		// a menetközben letöltésre kerülő byte-ok számlálója (letöltési csíkhoz)
var DOWN_DOTS = 0;			// a letöltés után pöttyök aktuális száma
var DOWN_DOTS_TIMER;		// a letöltési pöttyök időzítő változója




function CheckFiles()			// ----------------------------  a műsorban lévő fájlok letöltés előtti keresése a memóriában : ha nincs ott -> letöltési listába rak
{
	DOWN = Array();			// letöltés inicializálása		
	FAST_MEDIA = Array();
	DOWN_byte = 0;
	TOTAL_byte = 0;
	DOWN_progress = 0;	document.getElementById("download_progressbar").style.width=0+"%"; document.getElementById("download_percent").innerHTML="0";   // letöltési csík inicializálása
	down_num = 0;	
	
	var FAJL = Array();
	for (var n=0; n < Object.keys(DATA.MEDIA).length; n++)					// egy adott programon belül
	{	
				FAJL[FAJL.length] = Array();	//console.log("X = "+DATA.MEDIA[DATA.PROGRAM[n].musor[m][0]].fajl);
				FAJL[FAJL.length-1]["fajl"] 		= DATA.MEDIA[n].fajl+"."+DATA.MEDIA[n].tipus;
				FAJL[FAJL.length-1]["meret"] 	= DATA.MEDIA[n].meret;		
	}
	if (FAJL.length==0)			// ha nincs lejátszani való fájl egyáltalán (nem jött a szervertől műsor)
	{
		Musorszunet();
	}
	else
	{
		clearInterval(musorszunet_timer); musorszunet_timer = 0;
		document.getElementById("musorszunet").style.display="none";
	}
	
	var storage = new Storage();
	var OTTn = 0;
	var ottVanOption = {};
	var ottVan = function(obj,fajlnev,meret) {  									//  a fájl létezésének az ellenőrzése 	
					if (!obj.exists) 		// ha nincs a tárhelyen ilyen fájl
					{ 
						DOWN[DOWN.length] = Array();
						DOWN[DOWN.length-1]["fajl"]=fajlnev;
						DOWN[DOWN.length-1]["meret"]=meret;
						DOWN_byte = parseInt(parseInt(DOWN_byte) + parseInt(meret));    console.log("----- TO_DOWN : "+DOWN.length+" files ("+parseInt(DOWN_byte/1024/1024)+" MB) : " +meret);
						TOTAL_byte += meret;
					}
					else
					{
						TOTAL_byte += meret;
					}
					OTTn++ ;
					if (OTTn < FAJL.length)		// ha van még további fájl (ciklus)
					{
						var fajlnev = FAJL[OTTn]["fajl"];
						var meret 	= FAJL[OTTn]["meret"];
						ottVanOption.path = "file://internal/"+fajlnev;	
						storage.exists(function(obj){ottVan(obj,fajlnev,meret)}, failure, ottVanOption);
					}
					
				};
	var fajlnev = FAJL[OTTn]["fajl"];
	var meret 	= FAJL[OTTn]["meret"];
	ottVanOption.path = "file://internal/"+fajlnev;		
	storage.exists(function(obj){ottVan(obj,fajlnev,meret)}, failure, ottVanOption);
	
	
	
	setTimeout(function() {		// kap egy kis időt a rendszer, hogy leellenőrizze
		var fast_media_lista="";
		for (var f=0; f < FAST_MEDIA.length; f++)
		{
			fast_media += FAST_MEDIA[f]+"|";
		}
		if (fast_media_lista !== "")
		{	ajax_hivas("http://"+SERVER+MEDIACHECK_PHP+"?fajl="+fast_media_lista.substring(0,fast_media_lista.length-1),"mediacheck_callback","mdata");  }
		else
		{ 	MediaCheck(""); }		// ha nincs szerkeszthető média, akkor mehet rögtön tovább
	},1000);
	
}


function MediaCheck(response)				// ------------------------------------- a szerkeszthető tartalmak (scroll, html) MD5 hash szintű ellenőrzésének ajax visszatérő függvénye
{
	
	console.log("DOWNLOAD: "+DOWN.length+" files");
		if (DOWN.length > 0)				// letöltés indul
		{			
			document.getElementById("down_OK").innerHTML="A médiafájlok letöltése sikeresen megtörtént";
			downloadFile();				
		}
		else								// ha nincs mit letölteni, indulhat a banzáj
		{	
			if (!MUSOR_FUT) { VetitesIndul(); }    // ha már megy a műsor, semmit nem csinál
		}
}


var down_num=0;
function downloadFile() {			// -------------------------------------  a kijelölt fájlok letöltése a szerverről
   	document.getElementsByTagName("kepernyo")[0].style.display="none";
   	MUSOR_FUT = false;
   	if (VIDEO_OBJEKTUM && VIDEO_OBJEKTUM.parentNode) { VIDEO_OBJEKTUM.parentNode.removeChild(VIDEO_OBJEKTUM); }    // egyszerre csak egy video tag lehet (LG)
   	CHANGEIMAGE_TIMER_reset();
   	for (var t=0; t < TimeOut.length; t++)
   	{
   		clearTimeout(TimeOut[t]); TimeOut[t]=null;
   	}
   	TimeOut = Array();
   	for (var t=0; t < Scroller.length; t++)
   	{
   		clearTimeout(Scroller[t]); Scroller[t]=null;
   	}
   	Scroller = Array();
   	
   	var DPB = document.getElementById("download_progressbar");
	var DPE = document.getElementById("download_percent");
   	
   	document.getElementById("download").style.display="block";
    
			var letoltve = function() {										// a fájl letöltése megtörtént
				console.log("Letöltve :"+DOWN[down_num].fajl+"  ("+parseInt(down_num+1)+"/"+DOWN.length+")");
				DOWN_progress += parseInt(DOWN[down_num].meret);
				down_num++;
				var percent = parseInt(100 * (DOWN_progress / DOWN_byte)) || 100;
				DPB.style.width = percent + "%";
				console.log ("LETÖLTVE : "+parseInt(DOWN_progress/1024/1024)+" MB  /  "+parseInt(DOWN_byte/1024/1024) + " MB"); 
				DPE.innerHTML = percent;
				if (down_num >= DOWN.length)	// ha nincs több letölteni való fájl, akkor
					{  Fajl_Ellenorzes(); }		// ennyi volt mára, jöhet az ellenörzés
				else
					{  downloadFile();	} 		// jöhet a következő 
			}
			var failure = function(err) { console.error("•••LETÖLTÉSI HIBA: " + DOWN[down_num]["fajl"] )};
    
    		// var fajl_info = function(fajl) {
//     			console.log("INFO ............................................. fajl.path : fajl.size   "+ fajl.path + " : "+ fajl.size);
//     			var percent2 = parseInt(100 * ((DOWN_progress+fajl.size) / DOWN_byte));
//     			DPB.style.width = percent2 + "%";
//     			DPE.innerHTML = percent2;
//     		}
    
    var PATH ="";
    console.log("down_num= "+down_num);
    console.log("DOWN: "+DOWN[down_num].fajl+" / "+DOWN[down_num]["meret"]);
    var tipus = DOWN[down_num].fajl.substring(DOWN[down_num].fajl.lastIndexOf(".")+1);
    PATH = "/media/";
    if (tipus==="json") { PATH = "/musor/"; }	
    var download_options = {source:"http://"+CDN+PATH+DOWN[down_num].fajl, destination:"file://internal/"+DOWN[down_num].fajl};
    console.log("•Letöltés indul : "+"http://"+CDN+PATH+DOWN[down_num].fajl+ " >>> "+"file://internal/"+DOWN[down_num].fajl);
    var KB = parseFloat(DOWN[down_num]["meret"]/1024);
    var MB = 0;
    if (KB > 1024 ) { MB = parseInt(KB/1024); } else { MB = parseInt(100 * KB/1024)/100; }
    document.getElementById("download_file").innerHTML = DOWN[down_num].fajl.substring(0,DOWN[down_num].fajl.lastIndexOf(".")) + " ("+MB+" MB)";
    var Fnev = DOWN[down_num].fajl;
    if (!DOWN_DOTS_TIMER || DOWN_DOTS_TIMER==0) 
    { 
    			DOWN_DOTS_TIMER = setInterval(function(){
    								DOWN_DOTS++;
    								if (DOWN_DOTS == 6) { DOWN_DOTS = 0; }
    								var dots = ". . . . . . . . . . ";
    								document.getElementById("download_dots").innerHTML = "&nbsp;&nbsp;Letöltés&nbsp;"+dots.substring(0,DOWN_DOTS*2);
    								// var options = { 
// 												 path: "file://internal/"+Fnev
// 											 };
//     								storage.statFile(fajl_info, failure, options);
    						},600);  
    }
    var storage = new Storage();
    storage.copyFile(letoltve, failure, download_options);						
}
 
function Fajl_Ellenorzes() 		// ----------------------------------- miután az összes fájl letöltődött, összeveti a háttértár fájljainak méretét a letöltött + megmaradó fájlmérettel 
{
	clearInterval(DOWN_DOTS_TIMER); DOWN_DOTS_TIMER = 0;
	document.getElementById("download_dots").innerHTML = "";
	document.getElementById("download_file").innerHTML = "";
	console.log("•Ellenőrzés indul."); 
    var ListSuccess = function(cbObject) { 			// a könyvtár tartalmának listázása sikeres
        var files = cbObject.files;
		var bytes = 0;
		for(var i = 0 ; i < files.length; i++)
		{
			var fileInfo = files[i];
			bytes += fileInfo.size;
		}
		
		var siker = function() {									// sikerült az ellenörzés
									document.getElementById("down_OK").style.display="block";	console.log("- A letöltés ellenőrzése sikeres volt. -");
									setTimeout( function() { document.getElementById("download").style.display="none"; LetoltesSikeresLett(); document.getElementById("down_OK").style.display = "none"; }, 4000);
								};
		var nemsikerült = function() 	{							// nem sikerült az ellenörzés
											document.getElementById("down_OK").innerHTML="•••Nem sikerült a letöltés, a rendszer újraindul.";
											document.getElementById("down_OK").style.display="block";
																//removeAllFiles();
											//setTimeout( function() { location.reload();  }, 12* 1000);
										};						
		if (bytes == TOTAL_byte)		// ha egyezik a tárhelyben lévő fájlok mérete a letöltendőkével
		{
			siker();
		}
		else							// akkor nézzük azért meg egyesével is...
		{	
			var OK=true;
			for (var d=0; d < DOWN.length; d++)
			{
				var ottvan = false;
				for (var f=0; f < files.length; f++)
				{
					if (files[f].name===DOWN[d]["fajl"]) { ottvan=true; console.log("FILE"+f+": "+files[f].name+" ("+files[f].size+") = "+DOWN[d]["fajl"]+" ("+DOWN[d]["meret"]+")"); }
				}
				if (!ottvan) { OK = false; console.log("NEM TALÁLTAM A HÁTTÉRTÁRBAN : "+DOWN[d]["fajl"]); }
			}
			if (OK) { siker(); } else { nemsikerült(); }
		}
    }
     
    var options = {path:"file://internal"};
    new Storage().listFiles(ListSuccess, failure, options);
}
 
function LetoltesSikeresLett()	    // -------------------------------------------- sikeresen letöltött és ellenőrzött fájl után indul : letörli a régit és átnevezi a letöltöttet
{	
	if (DOWN[0].fajl.substr(DOWN[0].fajl.lastIndexOf(".")+1).toUpperCase()==="JSON")		// még csak JSON letöltés volt, majd a fájlokat még be kell tölteni 
	{	
				
																												
		// var json_atnevezheto = function() {	console.log("Na akkor...");			// átnevezés
// 														
// 														console.log("Átnevezés: "+regi_nev+" -> "+uj_nev);
// 														var json_atnevezve = function() { console.log(uj_nev+" ... átnevezve."); BETOLTES(uj_nev); }   // átnevezés után betöltjük feldolgozásra a HDD-ból a memóriába a json-t
// 														var optionsM = { 
// 															 oldPath: "file://internal/"+regi_nev,
// 															 newPath : "file://internal/"+uj_nev
// 														 };
// 														
// 														var storageM = new Storage();
// 														storageM.moveFile(json_atnevezve, failure, optionsM);   // átnevezés cache ürítéssel
// 												  };
// 		var json_regi_van = function(fileobj) {								// ha van régi fájl, akkor előbb töröljük
// 														console.log("EXISTS ? = "+fileobj.exists);
// 														if (fileobj.exists)
// 														{
// 															console.log("Régi fájl törlése... "+uj_nev);
// 															var options = { 
// 																file: 'file://internal/'+uj_nev
// 															}; 	
// 															var storage = new Storage();
// 															storage.removeFile(json_atnevezheto, failure, options);	// régi törlése, majd cache ürítés után átnevezés
// 														}
// 														else												  // ha nincs régi fájl
// 														{	
// 															console.log("Nincs régi fájl, mehet az átnevezés.");
// 															json_atnevezheto(regi_nev,uj_nev);
// 														}
// 												};
		var TorlesOK = function(){}; 
		var TorlesERR = function(){}; 
		
		for (var d=0; d<DOWN.length; d++)
		{
			var fajl_nev = DOWN[d].fajl;
			var regi_fajl = "";	
			if (fajl_nev.substr(0,5).toUpperCase()==="MUSOR")	{ regi_fajl = localStorage.getItem("MUSOR_JSON");  localStorage.setItem("MUSOR_JSON",fajl_nev);}           // musor_xxxxxxxx.json
			if (fajl_nev.substr(0,6).toUpperCase()==="PRIVAT")	{ regi_fajl = localStorage.getItem("PRIVAT_JSON"); localStorage.setItem("PRIVAT_JSON",fajl_nev); localStorage.setItem("privat_musor",fajl_nev.substr(fajl_nev.lastIndexOf("_")+1,8));}		   // privat_yyyyyyyyyy_xxxxxxxx.json 	
			var options = { 
								path: 'file://internal/'+regi_fajl
							}; 	
			var storage = new Storage();
			storage.removeFile(
							TorlesOK,
							TorlesERR,
							options);			// töröljük a régi fájlt, ha van
		}
		BETOLTES();
	}
	else					// már letöltötte a média fájlokat is, nincs több teendő ezekkel, mehet a vetítés
	{
		VetitesIndul();
	}
}
 
function VetitesIndul()				// --------------------------------------------  Vetítés indítása
{	console.log("•Vetítés indul.");
	MUSORSZUNET = false;
	document.getElementById("download").style.display="none";
	document.getElementsByTagName("kepernyo")[0].style.display="block";
	//ShowLayout("layout_jobb");			
	document.getElementsByTagName("kepernyo")[0].style.display="block";
	setTimeout(function(){StartMedia(0);},0);
	MUSOR_FUT = true;
}


function ShowLayout (layout_name)		// --------------------------------- adott layout objektumainak megjelenítése
{		console.log("LAYOUT="+layout_name);
	//var LAYOUT = DATA.LAYOUT; 
	var SCR = document.getElementsByTagName("kepernyo")[0];
	SCR.innerHTML = "";
	for (var n=0; n<=Object.keys(DATA.LAYOUT[layout_name]).length; n++)
	{	
		if (DATA.LAYOUT[layout_name][n])     // ha a 0-ás mezőt (logók) kihagyjuk, ne dobjon hibát
		{	
			var S = document.createElement("screen");
				S.setAttribute("id","SCR"+n);   
				S.setAttribute("tipus",DATA.LAYOUT[layout_name][n].tipus);
				//if (parseInt(DATA.LAYOUT[layout_name][n].tipus) & 8 === 8) { S.style.zIndex = -1; }
				S.style.zIndex = "1";
				S.style.cssText = DATA.LAYOUT[layout_name][n].style;
				S.style.left 	= DATA.LAYOUT[layout_name][n].x+"px";
				S.style.top  	= DATA.LAYOUT[layout_name][n].y+"px";
				S.style.width	= DATA.LAYOUT[layout_name][n].w+"px";
				S.style.height	= DATA.LAYOUT[layout_name][n].h+"px";
			if (DATA.LAYOUT[layout_name][n].tipus=="0") { S.innerHTML = "<img class='logo' src='assets/img/diginstore-feher.png'/><img class='logo' style='margin-left:200px;' src='assets/img/lg_logo.jpg'/>"; }	
			SCR.appendChild(S);
		}	
	}
	MOST_Layout = layout_name;
}

function StartMedia(Pn)			// -------------------------------------- adott vetítési program indítása
{
	CHANGEIMAGE_TIMER_reset();															// képváltás időzítők törlése
	setTimeout( function() {	// kivárjuk, míg minden más lefut
		if (Pn > DATA.PROGRAM.length-1) { Pn = 0; }  // ha nincs több program-szegmens(layout-szegmens), akkor kezdi előröl
		MOST_Program = Pn;
		MEDIA_reset();  															// a számlálók nullázása
		console.log("StartMedia : "+Pn + " / " + DATA.PROGRAM.length);
		ShowLayout(DATA.PROGRAM[Pn].layout);
		for (var n=1; n<=Object.keys(DATA.LAYOUT[MOST_Layout]).length; n++)
		{ console.log("•++++++++++++++++++++++++++++++ PlayMedia : screen "+n+" +++++++++++++++++++++++++++++++");
			if (DATA.LAYOUT[MOST_Layout][n]) { PlayMedia(n); }  
		}
	},0);	
}

// function NextMedia(ablak,utoljara_vetitett)
// {
// 	var m = utoljara_vetitett;
// 	var pointer_ide= function(media_nr) {	var p_ide = false;
// 											for (p=0; p < MEDIA_pointer.length; p++)
// 											{
// 												if (MEDIA_pointer[p]==media_nr) { p_ide=true; }
// 											}
// 											return p_ide;
// 										}
// 	do {
// 			m++;
// 			if (m > DATA.PROGRAM[MOST_Program].musor.length) { m=0; }
// 	} while ( pointer_ide(m) || (DATA.MEDIA[DATA.PROGRAM[MOST_Program].musor[m]].tipus && ablak)== 0 );										
// 	MEDIA_pointer[DATA.MEDIA[DATA.PROGRAM[MOST_Program].musor[m]].tipus] = m;
// 	return m;
// }

function NextMedia(ablak_tipus)
{
	var Media = Array();
	for (var n=0; n < DATA.MEDIA.length; n++)
	{	
		if (((ablak_tipus & DATA.MEDIA[n].ablak)!= 0)  && !MEDIA_playing[DATA.MEDIA[n].fajl] ) 	// ha a műsorban lévő média típusa megfelelő, és nincs épp kint
			{ Media[Media.length] = DATA.MEDIA[n]; }												// akkor hozzáadjuk a találati tömbhöz
	}
	if (Media.length == 0) { return null; }				// ha nem talált megfelelő lejátszandó médiát
	var min = 999999;
	var media_next = null;
	for (m=0; m < Media.length; m++)		// kikeressük a legkisebb ismétlési számmal rendelkező médiát
	{	
		if (!MEDIA_Counter[Media[m].fajl]) { MEDIA_Counter[Media[m].fajl]=0; }
		if ((MEDIA_error.indexOf(Media[m].fajl)==-1) && (MEDIA_Counter[Media[m].fajl] < min || media_next==null)) { media_next = Media[m]; min=MEDIA_Counter[media_next.fajl];}   // a legelső legkevesebbet játszott keresése
	}   console.log("   RETURN Media : "+media_next.fajl);
	if (ablak_tipus==DATA.PROGRAM[MOST_Program].ism_tipus &&  min >= DATA.PROGRAM[MOST_Program].ismetles && DATA.PROGRAM[MOST_Program].ismetles != 0)     // ha elértük a programban az adott layout-hoz tartozó videó ismétlés számot 
	{								
		media_next = null;															 
		StartMedia(MOST_Program+1);			// akkor lépjünk a következőre		
	}   
	return media_next;	
}

function PlayMedia(screenNR)		// ----------------------------------------  a megadott ablakba a neki megfelelő média típus következő elemének megjelenítése 
{
		var ablak_tipus = DATA.LAYOUT[MOST_Layout][screenNR]["tipus"];
		var media_next = NextMedia(ablak_tipus);				
		if (media_next!==null)	// ha van mit lejátszani
		{	console.log("Ablak típus="+ablak_tipus+" media_nextMedia = "+(media_next.fajl || "null" ));
			MEDIA_Counter[media_next.fajl] = parseInt(parseInt(MEDIA_Counter[media_next.fajl]) + 1);		//lejátszási számláló növelése
			console.log("Counter ['"+media_next.fajl+"'] : "+MEDIA_Counter[media_next.fajl]);
			MEDIA_playing[media_next.fajl] = true;							//lejátszási flag beállítása
			switch (media_next.tipus)
			{
				case "jpg":
				case "png":
								PlayImage(screenNR,media_next);
								break;
				case "mp4":
								PlayVideo(screenNR,media_next);
								break;
				case "scroll":
								PlayScroll_HW(screenNR,media_next);
								break;
				case "html":
								PlayHtml(screenNR,media_next);
								break;												
			}	
		}
		else if (ablak_tipus == DATA.PROGRAM[MOST_Program].ism_tipus) { StartMedia(MOST_Program+1); }    // ez csak akkor van, ha hibás az összes videó, amit az adott programban le kellene játszani - ekkor lépjen tovább (elakadna különben)
}

function PlayVideo(screenNR,media_next)		 // ------------------------------------------  videó anyagok lejátszása (egyszerre csak egy mehet!)
{
	//if (MUSORSZUNET) { return; }
	if (CHANGEIMAGE_TIMER[screenNR]) { clearTimeout(CHANGEIMAGE_TIMER[screenNR]); CHANGEIMAGE_TIMER[screenNR]=0;}
	if (TimeOut[screenNR]) { clearTimeout(TimeOut[screenNR]); TimeOut[screenNR]=0;}
	if (VIDEO_ERROR_TIMER) { clearTimeout(VIDEO_ERROR_TIMER); VIDEO_ERROR_TIMER=0; }
	console.log("PlayVideo : "+media_next.fajl);
	var screen = document.getElementById("SCR"+screenNR);
	VIDEO_OBJEKTUM = document.createElement("video");		console.log("VIDEO_OBJEKTUM lejátszás : "+media_next.fajl+"."+media_next.tipus);
		VIDEO_OBJEKTUM.src = DISK+media_next.fajl+"."+media_next.tipus;
		VIDEO_OBJEKTUM.setAttribute("type","video/mp4");
		VIDEO_OBJEKTUM.setAttribute("autoplay","true");
		VIDEO_OBJEKTUM.setAttribute("onended","PlayMedia("+screenNR+"); MEDIA_playing['"+media_next.fajl+"']=false;");
		VIDEO_OBJEKTUM.setAttribute("left",0);
		VIDEO_OBJEKTUM.setAttribute("top",0);
	screen.innerHTML = "";	
	screen.appendChild(VIDEO_OBJEKTUM);
	VIDEO_ERROR_TIMER = setTimeout( "PlayMedia("+screenNR+"); console.log('•••HIBA : NEM LEJÁTSZHATÓ VIDEO ! : "+media_next.fajl+"');MEDIA_error['"+media_next.fajl+"']=true;", VIDEO_ERROR_SEC * 1000);    // MEDIA_playing -ot nem állítjuk true-ra ! = kizárjuk a lejátszásból a hibás videót
}

function PlayImage(screenNR,media_next)		// ------------------------------------ a megadott layout képernyőbe a következő kép kihelyezése
{
	console.log("PlayImage : "+media_next.fajl);
	if (MUSORSZUNET) { return; }
	if (TimeOut[screenNR]) { clearTimeout(TimeOut[screenNR]); TimeOut[screenNR]=0;}
	var screen = document.getElementById("SCR"+screenNR);
	IMG[screenNR] = document.createElement("img");
		IMG[screenNR].src = DISK+media_next.fajl+"."+media_next.tipus;
		var nagyitas = parseFloat(screen.clientWidth / media_next.w);  if (nagyitas>1 ) { nagyitas =1; };     // ha nem akarjuk, hogy a felbontásánál nagyobb legyen
		IMG[screenNR].style.marginTop 	= "-"+parseInt(media_next.h/2*nagyitas)+"px";
		IMG[screenNR].style.marginLeft 	= "-"+parseInt(media_next.w/2*nagyitas)+"px";
	screen.className = "ki";	
	CHANGEIMAGE_TIMER[screenNR] = setTimeout( "ChangeImage("+screenNR+",'"+media_next.hossz+"'); MEDIA_playing['"+media_next.fajl+"']=false;",500);
	console.log("Kép csere : NR"+screenNR+" -> "+ media_next.fajl+"."+media_next.tipus);
}


function ChangeImage(screenNR,media_hossz)	  // ---------------------------------------- kép cseréje a megadott layout képernyőbe
{
	if (MUSORSZUNET) { return; }
	var screen = document.getElementById("SCR"+screenNR);
	screen.innerHTML = "&nbsp;";
	var clone = IMG[screenNR].cloneNode(true);
	screen.className = "be";
	screen.appendChild(clone);
	var RND = parseInt(parseInt(media_hossz*1000)+parseInt(Math.random()*1000*media_hossz*(CHANGEIMAGE_RANDOM_plussz+CHANGEIMAGE_RANDOM_minusz)/100-(1000*media_hossz*CHANGEIMAGE_RANDOM_minusz/100)));
	TimeOut[screenNR] = setTimeout("PlayMedia("+screenNR+")",RND);
	console.log("RANDOM : " + RND + "ms");
}



function PlayScroll_HW(screenNR,media_next)		// ----------------------------------- futószöveg megjelenítése a layout képernyőben, hardveres gyorsítással (CSS anim)
{
	FajlOlvasas_UTF (media_next.fajl+"."+media_next.tipus, Scroll_Betoltve, screenNR);		// töltsük be és indítsuk el utána
}
var Scroll_Betoltve = function(fajlnev,adat,screenNR) {							// scroll callback függvény - betöltés után a param (screenNR) id-jű layout mezőbe teszi a futószöveget
	var W   = DATA.LAYOUT[MOST_Layout][screenNR].w;
	var SCR = document.getElementById("SCR"+screenNR);
		SCR.innerHTML = "&nbsp;";						// a mező tartalmának törlése
	var T = document.createElement("article");
		T.left = W + "px";							// jobbszélre állítjuk
		T.innerHTML = adat;
		SCR.appendChild(T);	
	
		var TW = parseInt(parseInt(T.offsetWidth) + parseInt(SCR.offsetWidth));	
		//var W = adat.length*30;
		var anim_time = TW / SCROLL_SPEED;	console.log("SCROLL SPEED = "+parseInt(anim_time)+"s");
		T.style.animationDuration = parseInt(anim_time) + "s"; 
		
		//CHANGEIMAGE_TIMER[screenNR] = setTimeout( "PlayScroll_HW("+screenNR+",'"+fajlnev+"'); MEDIA_playing['"+fajlnev+"']=false;",anim_time*1000);
		T.addEventListener("webkitAnimationEnd", function(){ PlayMedia(screenNR);  MEDIA_playing[fajlnev]=false;}, false);
		T.addEventListener("animationend", function(){ PlayMedia(screenNR);  MEDIA_playing[fajlnev]=false;}, false);
}

function PlayHtml(screenNR,media_next)
{
	FajlOlvasas_UTF (media_next.fajl+"."+media_next.tipus, Html_Betoltve, screenNR, media_next);		// töltsük be és indítsuk el utána
}
var Html_Betoltve = function(fajlnev,adat,screenNR,media_next) {							// html callback függvény - betöltés után a param (screenNR) id-jű layout mezőbe teszi a futószöveget
	console.log("ADAT = "+adat);
	if (MUSORSZUNET) { return; }
	if (TimeOut[screenNR]) { clearTimeout(TimeOut[screenNR]); TimeOut[screenNR]=0;}
	var SCR = document.getElementById("SCR"+screenNR);
	IMG[screenNR] = document.createElement("section");	
		IMG[screenNR].innerHTML = adat;
	screen.className = "ki";
	CHANGEIMAGE_TIMER[screenNR] = setTimeout( "ChangeImage("+screenNR+",'"+media_next.hossz+"'); MEDIA_playing['"+media_next.fajl+"']=false;",500);
	console.log("Kép csere : NR"+screenNR+" -> "+ media_next.fajl+".html");
}

// function PlayScroll(screenNR)	  // ------------------------------------ a megadott képernyőbe futószöveg kihelyezése
// {
// 	if (MUSORSZUNET) { return; }
// 	if (MOST_Scroll !== "") 
// 	{  
// 		MOST_Scroll = parseInt(parseInt(MOST_Scroll) + 1);  
// 		if (!DATA.PROGRAM.scroll[MOST_Scroll]) { MOST_Scroll = 1; }
// 	}
// 	else
// 	{
// 		MOST_Scroll = Object.keys(DATA.PROGRAM.scroll)[parseInt(Math.random()*Object.keys(DATA.PROGRAM.scroll).length)];
// 	}
// 	var scr = document.getElementById("SCR"+screenNR);
// 	var W   = DATA.LAYOUT[MOST_Layout][screenNR].w;
// 	var T = document.createElement("article");
// 		T.innerHTML = DATA.PROGRAM.scroll[MOST_Scroll].text;
// 		T.id = "scroll"+screenNR;
// 		T.style.left = W + "px";
// 	scr.innerHTML = "&nbsp;";	
// 	scr.appendChild(T);
// 	Scroller[screenNR] = {};
// 	Scroller[screenNR].obj = T;
// 	Scroller[screenNR].pos = W;
// 	Scroller[screenNR].end = -1*T.clientWidth;
// 	Scroller[screenNR].timer = setInterval("ScrollText("+screenNR+")",10); // a scroll sebessége itt (is) állítható
// }
// 
// function ScrollText(screenNR)  // ----------------------------------------- a timer által meghívott szöveg léptető funkció
// {
// 	if (MUSORSZUNET) { return; }
// 	Scroller[screenNR].pos -= 5;		// a scroll sebessége itt (is) állítható 
// 	if (Scroller[screenNR].pos <= Scroller[screenNR].end) 
// 	{
// 		clearInterval(Scroller[screenNR].timer);
// 		Scroller[screenNR].timer = "";
// 		PlayScroll(screenNR);
// 		return;
// 	}
// 	Scroller[screenNR].obj.style.left = parseInt(Scroller[screenNR].pos) + "px";  
// }
// 
// 
// function PlayScroll_trans(screenNR,media_id)	  // ------------------------------------ a megadott képernyőbe futószöveg kihelyezése
// {	return;
// 	if (MUSORSZUNET) { return; }	
// 	var scr = document.getElementById("SCR"+screenNR);
// 	var W   = DATA.LAYOUT[MOST_Layout][screenNR].w;
// 	var T = document.createElement("article");
// 		T.innerHTML = DATA.MEDIA[DATA.PROGRAM[MOST_Program].musor[n]].text;
// 		T.id = "scroll"+screenNR;
// 		T.style.left = W + "px";
// 	scr.innerHTML = "&nbsp;";	
// 	scr.appendChild(T);
// 	Scroller[screenNR] = {};
// 	Scroller[screenNR].obj = T;
// 	Scroller[screenNR].pos = W;
// 	Scroller[screenNR].end = -1*T.clientWidth;
// 	Scroller[screenNR].timer = setInterval("ScrollText("+screenNR+")",10); // a scroll sebessége itt (is) állítható
// }
// 
// function ScrollText_trans(screenNR)  // ----------------------------------------- a timer által meghívott szöveg léptető funkció
// {
// 	if (MUSORSZUNET) { return; }
// 	Scroller[screenNR].pos -= 5;		// a scroll sebessége itt (is) állítható 
// 	if (Scroller[screenNR].pos <= Scroller[screenNR].end) 
// 	{
// 		clearInterval(Scroller[screenNR].timer);
// 		Scroller[screenNR].timer = "";
// 		PlayScroll(screenNR);
// 		return;
// 	}
// 	Scroller[screenNR].obj.style.webkitTransform = "translateX("+parseInt(Scroller[screenNR].pos) + "px)";  
// }
// 
// 
// 
// function PlayScroll2(screenNR)   //  -------------------------------  marquee animációs scroll
// {
// 	if (MUSORSZUNET) { return; }
// 	if (MOST_Scroll !== "") 
// 	{  
// 		MOST_Scroll = parseInt(parseInt(MOST_Scroll) + 1);  
// 		if (!DATA.PROGRAM.scroll[MOST_Scroll]) { MOST_Scroll = 1; }
// 	}
// 	else
// 	{
// 		MOST_Scroll = Object.keys(DATA.PROGRAM.scroll)[parseInt(Math.random()*Object.keys(DATA.PROGRAM.scroll).length)];
// 	}
// 	var TXT = "";
// 	for (var s=1; s <= Object.keys(DATA.PROGRAM.scroll).length; s++)
// 	{
// 		TXT += DATA.PROGRAM.scroll[s].text+"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
// 	}
// 	var scr = document.getElementById("SCR"+screenNR);
// 		scr.style.overflow = "hidden";
// 	var W   = DATA.LAYOUT[MOST_Layout][screenNR].w;
// 	var T = document.createElement("marquee");
// 		T.setAttribute("behavior","scroll");
// 		T.setAttribute("scrollamount","10");
// 		T.setAttribute("marquee-direction","left");
// 		T.setAttribute("marquee-play-count",99999);
// 		//T.setAttribute("marquee-speed","50");
// 		T.innerHTML = TXT;
// 		T.id = "scroll"+screenNR;
// 		
// 		//T.className="scroll_article";
// 		
// 	scr.appendChild(T);
// 		// T.style.webkitAnimationDuration = "80s";    console.log("Animáció sebesség : "+parseInt(T.clientWidth/100)+"s");
// // 		T.style.animationDuration = "80s";
// // 	//T.style.animationDuration = "40s";
// // 	 
// // 		T.style.display="block"; 
// // 		T.WebkitAnimationName = "scroll-left";
// // 		T.animationName = "scroll-left";
// // 		
// 	
// }
// 
// 
// function PlayScroll3(screenNR)   //  -------------------------------  CSS animációs scroll
// {
// 	if (MUSORSZUNET) { return; }
// 	if (MOST_Scroll !== "") 
// 	{  
// 		MOST_Scroll = parseInt(parseInt(MOST_Scroll) + 1);  
// 		if (!DATA.PROGRAM.scroll[MOST_Scroll]) { MOST_Scroll = 1; }
// 	}
// 	else
// 	{
// 		MOST_Scroll = Object.keys(DATA.PROGRAM.scroll)[parseInt(Math.random()*Object.keys(DATA.PROGRAM.scroll).length)];
// 	}
// 	var scr = document.getElementById("SCR"+screenNR);
// 		scr.style.overflow = "hidden";
// 	var W   = DATA.LAYOUT[MOST_Layout][screenNR].w;
// 	var T = document.createElement("article");
// 		T.className = "scroll_article";
// 		//T.style.display="none";
// 		T.innerHTML = DATA.PROGRAM.scroll[MOST_Scroll].text;
// 		T.id = "scroll"+screenNR;
// 		
// 		T.className="scroll_article";
// 		
// 	scr.appendChild(T);
// 		
// 	setTimeout(function() {	 
//  		T.style.display="block"; 
//  		T.style.webkitAnimationDuration = "80s";    
// 		T.style.animationDuration = "80s";
// 		
//  		console.log("Animáció sebesség : "+parseInt(T.clientWidth/100)+"s");
//  		T.WebkitAnimationName = "scroll-left";
//  		T.animationName = "scroll-left";
// 		},100);
// 	
// }
// 
// 
// 
// 
// 
// 
// 
// 
// function PlayScroll_canvas(screenNR)  // -------------------  canvas típusú scroll (NEM AKTÍV)
// {
// 	if (MUSORSZUNET) { return; }
// 	if (MOST_Scroll !== "") 
// 	{  
// 		MOST_Scroll = parseInt(parseInt(MOST_Scroll) + 1);  
// 		if (!DATA.PROGRAM.scroll[MOST_Scroll]) { MOST_Scroll = 1; }
// 	}
// 	else
// 	{
// 		MOST_Scroll = Object.keys(DATA.PROGRAM.scroll)[parseInt(Math.random()*Object.keys(DATA.PROGRAM.scroll).length)];
// 	}
// 	var scr = document.getElementById("SCR"+screenNR);
// 	var W   = DATA.LAYOUT[MOST_Layout][screenNR].w;
// 	var CANVAS = document.getElementById("CANVAS");
// 	var ctx=CANVAS.getContext("2d");
// 	var txt = DATA.PROGRAM.scroll[MOST_Scroll].text;
// 	var CW = ctx.measureText(txt).width;
// 	CANVAS.width = CW;
// 	//CANVAS.height = 60;
// 	ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
// 	scr.innerHTML = "";
// 	ctx.font="60px Verdana";
// 	ctx.fillStyle="#32CD32";
// 	ctx.fillText(txt,0,60);
// 	var Timg = CANVAS.toDataURL("image/png");
// 	var T = document.createElement("img");
// 		T.src = Timg;
// 		T.className = "canvas_img";
// 		T.id = "scroll"+screenNR;
// 		T.style.left = CW + "px";
// 	//scr.innerHTML = "&nbsp;";
// 	scr.appendChild(T);
// 	Scroller[screenNR] = {};
// 	Scroller[screenNR].obj = T;
// 	Scroller[screenNR].pos = W;
// 	Scroller[screenNR].end = -1*T.clientWidth;
// 	Scroller[screenNR].timer = setInterval("ScrollText_canvas("+screenNR+")",10);
// }
// 
// function ScrollText_canvas(screenNR)   // -------------------  canvas típusú scroll (NEM AKTÍV)
// {
// 	if (MUSORSZUNET) { return; }
// 	Scroller[screenNR].pos -= 5;
// 	if (Scroller[screenNR].pos <= Scroller[screenNR].end) 
// 	{
// 		clearInterval(Scroller[screenNR].timer);
// 		Scroller[screenNR].timer = "";
// 		PlayScroll_canvas(screenNR);
// 		return;
// 	}
// 	Scroller[screenNR].obj.style.left = parseInt(Scroller[screenNR].pos) + "px";  
// }
