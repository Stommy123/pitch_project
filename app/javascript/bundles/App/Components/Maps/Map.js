import React, { Component } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import Divider from '@material-ui/core/Divider';
import ReactDOMServer from 'react-dom/server'
import Popup from './Popups.js'

export default class Map extends Component {

//Inherits window.map from wherever its called
  constructor(){
    super();
    this.state = { myPlaces: [] };
    window.map = this;
  }

//METHODS AND FUNCTIONS THAT WILL TAKE PLACE AFTER COMPONENT MOUNTS THE DOM
  async componentDidMount() {
    await axios.get('/places.json?filter=mine')
      .then( (response) => { this.setState({ myPlaces: response.data } ) } )
      .catch( (error) => { console.log(error) } )
//API KEY FOR MAPBOX
    mapboxgl.accessToken = 'pk.eyJ1IjoiYW5keXdlaXNzMTk4MiIsImEiOiJIeHpkYVBrIn0.3N03oecxx5TaQz7YLg2HqA'

    let { coordinates, geolocate } = this.props;

    //OPTIONS FOR BUILT IN GEOLOCATOR BUTTON
    const geolocationOptions = {
    //Tells Geocoder to use gps locating over ip locating
      enableHighAccuracy: true,
    //Sets maximum wait time
      maximumAge        : 30000,
      timeout           : 27000
    };

    //OPTIONS FOR MAPBOX COMPONENT
    const mapOptions = {
      //DEFINES CONTAINER
      container: this.mapContainer,
      style: `mapbox://styles/mapbox/streets-v9`,
      zoom: 12,
      center: [-80.2044, 25.8028]
    }

    //IF GEOLOCATION IS ACTIVE THEN CENTER MAP AT CURRENT LOCATION
    if ("geolocation" in navigator && geolocate) {
      navigator.geolocation.getCurrentPosition(
        // success callback
        async (position) => {
          coordinates = [
                          position.coords.longitude,
                          position.coords.latitude
                        ];
          mapOptions.center = coordinates;
          await this.createMap(mapOptions, geolocationOptions);
        },
        // failure callback
        async () => { await this.createMap(mapOptions, geolocationOptions) },
        geolocationOptions
      );
    }else{
      await this.createMap(mapOptions, geolocationOptions);
    }
  }

  //INITIALIZE MAPS
  createMap = async (mapOptions, geolocationOptions) => {
    this.map = new mapboxgl.Map(mapOptions);
    const map = this.map;
    //CENTERS MAP - REFER TO MAP-OPTIONS
    const { lat, lng } = map.getCenter();
    console.log(lat, lng);
    //APPENDS SEARCH BAR NAVIGATOR
    map.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken
      })
    );
    //APPENDS GEOLOCATOR BUTTON
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: geolocationOptions,
        trackUserLocation: true
      })
    );
    //APPEND EASY ZOOM IN / ZOOM OUT CONTROLS
    map.addControl(
      new mapboxgl.NavigationControl({
        positionOptions: geolocationOptions,
        trackUserLocation: true
      })
    );

    //AWAITING JSON DATA FOR EACH MARKERS
    let res = await axios.get(`places.json`)
    console.log(res)
    let newMarkers = res.data
    newMarkers.features.forEach(function (places, i) {
      var elm = document.createElement('div');
      elm.className = 'marker';
      //CALLS POPUP COMPONENT AND DEFINES IT
      let popupId = `popup-${i}`
      let popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(ReactDOMServer.renderToStaticMarkup(
        <Popup styleName={popupId} places={i}></Popup>
      ))
      //ATTACHES MARKERS TO MAP
      let marker = new mapboxgl.Marker(elm)
      .setLngLat(places.geometry.coordinates)
      .setPopup(popup);
      marker.addTo(map);

    })


    //ON MAP LOAD, ADD ALL PLACE MARKERS FROM .JSON DATA
    map.on('load', (event) => {
      map.addSource(
        'places',
        { type: 'geojson', data: `/places.json?lat=${lat}&lng=${lng}` }
      );
      //ADD MARKERS TO MAP
      map.addLayer({ id: 'places', type: 'circle', source: 'places'});
      //AFTER MAP SETTLES, FETCH NEW PLACE
      map.on('moveend', (e) => { this.fetchPlaces() });
      //SHOW POPUP ON CLICK -- STILL NEEDS TO BE STYLED
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['places'] });
        if (!features.length) { return; }
        const feature = features[0];
      });
      //IF MOUSE MOVES ONTOP A POPUP, CHANGE CURSOR TYPE
      map.on('mousemove', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['places'] });
        map.getCanvas().style.cursor = features.length ? 'pointer' : '';
      });
    });
  }

  //METHOD THAT MAKES AXIOS REQUEST FOR PLACES.JSON
  fetchPlaces = () => {
    const map = this.map;
    const { lat, lng } = map.getCenter();
    axios.get(`/places.json?lat=${lat}&lng=${lng}`)
      .then((response) => { map.getSource('places').setData(response.data) })
      .catch((error) => { console.log(error) });
  }

  //ACTION FOR WHEN COMPONENT LEAVES THE DOM -- UNSAFE?
  componentWillUnmount() {
    this.map.remove();
  }

  flyTo = (place) => {
    this.map.flyTo({
      center: [place.longitude, place.latitude],
      bearing: 20,
      zoom: 12,
      pitch: 20
    })
  }

  render() {
    const { myPlaces } = this.state;
    return(
      <div>
        <div className='sidebar pad2' style={{width: '500px', height: '400px', float: 'left'}}>
          {
            myPlaces.map( (place) => {
              return(
                <div
                  key={place.id}
                  onClick={ (e) => { this.flyTo(place) } }
                >
                  {place.name}
                </div>
              );
            })
          }
        </div>
        <div
          style={{width: '500px', height: '400px', backgroundColor: 'azure', float: 'right'}}
          ref={el => this.mapContainer = el}
        >
        </div>
      </div>
    );
  }
}
