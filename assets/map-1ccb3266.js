import{j as o,b as r,a as l,m as v,p as w}from"./urlParameters-2beebc24.js";o(document).ready(()=>{const p={};window.addEventListener("message",async e=>{const t=typeof e.data=="string"?JSON.parse(e.data):{};if(t.cmd==="update_map")n.code.overpass=t.value[0],a.update_map();else if(t.cmd==="cache"){n.code.overpass=t.value[0];const i=await a.getQuery(),s=a.getQueryLang();r.run_query(i,s,p,!0,void 0,a.mapcss)}},!1),o.fn.dialog=function(){alert(`error :( ${o(this).html()}`)},l.appname="overpass-ide-map";const n={code:{},server:l.defaultServer,tileServer:l.defaultTiles,silent:!1,force_simple_cors_request:!0,disable_poiomatic:!1},a={map:void 0,mapcss:"",async getQuery(){let e=n.code.overpass;const t=new w;e=await t.parse(e,{});let i="";t.hasStatement("style")&&(i=t.getStatement("style")),a.mapcss=i;let s=null;if(t.hasStatement("data")){s=t.getStatement("data"),s=s.split(",");const h=s[0].toLowerCase();s=s.slice(1);const c={};for(const f of s){const u=f.split("=");c[u[0]]=u[1]}s={mode:h,options:c}}return a.data_source=s,e=e.trim(),e},getQueryLang(){return o.trim(n.code.overpass).match(/^</)?"xml":"OverpassQL"},async update_map(){o("#data_stats").remove(),typeof r.osmLayer<"u"&&a.map.removeLayer(r.osmLayer);const e=await a.getQuery(),t=a.getQueryLang();r.run_query(e,t,p,!1,void 0,a.mapcss),o("#map_blank").remove()}};r.init(),o.support.cors!=!0&&o('<div title="Your browser is not supported :("><p>The browser you are currently using, is not capable of running this Application. <small>It has to support <a href="http://en.wikipedia.org/wiki/Cross-origin_resource_sharing">cross origin resource sharing (CORS)</a>.</small></p><p>Please update to a more up-to-date version of your browser or switch to a more capable browser! Recent versions of <a href="http://www.opera.com">Opera</a>, <a href="http://www.google.com/intl/de/chrome/browser/">Chrome</a> and <a href="http://www.mozilla.org/de/firefox/">Firefox</a> have been tested to work.</p></div>').dialog({modal:!0});const d=v();n.code.overpass=d.get("Q"),n.silent=d.has("silent"),a.map=new L.Map("map");const m=n.tileServer,y=l.tileServerAttribution,g=new L.TileLayer(m,{attribution:y});a.map.setView([0,0],1).addLayer(g),new L.Control.Scale({metric:!0,imperial:!1}).addTo(a.map),o(document).on({ajaxStart(){o("#loading-dialog").addClass("is-active")},ajaxStop(){o("#loading-dialog").removeClass("is-active")}}),a.map.on("layeradd",e=>{if(e.layer instanceof L.GeoJSON){a.map.setView([0,0],18,!0);try{a.map.fitBounds(e.layer.getBounds())}catch{}}}),r.handlers.onEmptyMap=e=>{o(`<div id="map_blank" style="z-index:1; display:block; position:absolute; top:42px; width:100%; text-align:center; background-color:#eee; opacity: 0.8;">This map intentionally left blank. <small>(${e})</small></div>`).appendTo("#map")},n.silent?(r.handlers.onAjaxError=e=>{parent.postMessage(JSON.stringify({handler:"onAjaxError",msg:e}),"*")},r.handlers.onQueryError=e=>{parent.postMessage(JSON.stringify({handler:"onQueryError",msg:e}),"*")}):(r.handlers.onAjaxError=e=>{alert(`An error occured during the execution of the overpass query!
${e}`)},r.handlers.onQueryError=e=>{alert(`An error occured during the execution of the overpass query!
This is what overpass API returned:
${e}`)}),r.handlers.onGeoJsonReady=()=>{a.map.addLayer(r.osmLayer)},r.handlers.onPopupReady=e=>{e.openOn(a.map)},r.handlers.onDataReceived=(e,t,i,s)=>{s()},r.handlers.onRawDataPresent=()=>{parent.postMessage(JSON.stringify({query:n.code.overpass,resultType:r.resultType,resultText:r.resultText}),"*")},a.update_map()});
