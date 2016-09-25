function ajax_hivas(url,callback,ID)
{
				url = url + "&callback="+callback;
				// create a new script element
				var script = document.createElement('script');
				// set the src attribute to that url
				script.setAttribute("id",ID);
				script.setAttribute('src', url);
				// insert the script in out page
				document.getElementsByTagName('head')[0].appendChild(script);
}

function FreeCallback(ID)
{
	var CALLBACK_item = document.getElementById(ID);
	if (CALLBACK_item) { CALLBACK_item.parentNode.removeChild(CALLBACK_item); }
}