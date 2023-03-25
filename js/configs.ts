export default {
  appname: "overpass-turbo-dev-mmd",
  // used for localStorage and openstreetmap.org/api/0.6/user/preferences
  settingNamespace: "overpass-ide-dev-mmd",
  defaultServer: "https://overpass-api.de/api/",
  // https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
  suggestedServers: ["https://overpass-api.de/api/"],
  defaultTiles: "//tile.openstreetmap.org/{z}/{x}/{y}.png",
  // https://wiki.osmfoundation.org/wiki/Licence/Attribution_Guidelines
  // > Attribution must be to "OpenStreetMap".
  // > Attribution must also make it clear that the data is available under the Open Database License.
  // > This may be done by making the text "OpenStreetMap" a link to openstreetmap.org/copyright, which has information about OpenStreetMap’s data sources (which OpenStreetMap needs to credit) as well as the ODbL.
  // https://www.openstreetmap.org/copyright
  tileServerAttribution: `<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>`,
  suggestedTiles: [
    "//tile.openstreetmap.org/{z}/{x}/{y}.png"
    //"http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png",
    //"http://{s}.tile2.opencyclemap.org/transport/{z}/{x}/{y}.png",
    //"http://{s}.tile3.opencyclemap.org/landscape/{z}/{x}/{y}.png",
    //"http://otile1.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.jpg",
  ],
  defaultMapView: {
    lat: 41.89,
    lon: 12.492,
    zoom: 16
  },
  maxMapZoom: 20,
  short_url_service: "",
  html2canvas_use_proxy: false,
  // api key for osmnames geocoder, go to http://osmnames.org/api/ to get one if you run your own overpass instance
  osmnamesApiKey: "gtXyh2mBSaN5zWqqqQRh",
  // osmAuth configuration object (used for syncing saved queries). expects an osm-auth config object (min. the oauth_consumer_key and oauth_secret must be given), see https://github.com/osmlab/osm-auth#getting-keys
  osmAuth: {
    client_id: "d1ZcdXUbL1Aon39t6c757NDRVj_QXtOCBysKT4DyTmk",
    client_secret: "",
    redirect_uri: `${
      window.location.origin + window.location.pathname
    }land.html`,
    scope: "read_prefs",
    auto: true // show a login form if the user is not authenticated and you try to do a call
  }
};
