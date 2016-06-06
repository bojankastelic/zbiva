define([
    'jquery',
    'backbone',
    'underscore',
    'openlayers',
    'arches',
    'map/base-layers',
    'papaparse',
    'bootstrap'
], function($, Backbone, _, ol, arches, baseLayers, papaParse) {
    return Backbone.View.extend({
        events: {
            'mousemove': 'handleMouseMove',
            'mouseout': 'handleMouseOut'
        },

        overlays: [],
        initialize: function(options) {
            var self = this;
            var projection = ol.proj.get('EPSG:3857');
            var layers = [];
            var dragAndDropInteraction = new ol.interaction.DragAndDrop({
                formatConstructors: [
                    ol.format.GPX,
                    ol.format.GeoJSON,
                    ol.format.IGC,
                    ol.format.KML,
                    ol.format.TopoJSON
                ]
            });
            //var scaleLineControl = new ol.control.ScaleLine({className: 'ol-scale-line', target: document.getElementById('scale-line')});
            var scaleLineControl = new ol.control.ScaleLine();
            _.extend(this, _.pick(options, 'overlays', 'enableSelection'));

            this.baseLayers = baseLayers;
            
            /**
             * Define a namespace for the application.
             */
            window.app = {};
            var app = window.app;
            var footerPadding = true;

            //
            // Define resize (up and down) buttons
            //
            app.ResizeDownControl = function(opt_options) {

                var options = opt_options || {};

                var button1 = document.createElement('button');
                button1.innerHTML = '<i class="fa fa-angle-down"></i>';
                button1.title = arches.translations['Increase map height'];
                button1.id = 'resize-map-button-down';

                var handleResizeDown = function(e) {

                    // Map
                    var mapSize = self.map.getSize();
                    var width = mapSize[0];
                    var height = mapSize[1];
                    //console.log(width);
                    console.log(height);
                    console.log(mapHeight);
                    if (mapHeight == -2) {
                        mapHeight = 398;
                        footerPadding = false;
                    }
                    console.log(mapHeight);
                    height = height + 100;
                    padt = height - mapHeight + 20;
                    $('#map').css({'height': height+'px'});
                    $('#map-panel').css({'height': height+'px'});
                    $('#map-space').css({'height': height+'px'});
                    if (footerPadding) {
                        $('.footer').css({'padding-top': padt + 'px'});
                    }
                    if (height >= mapHeight) {
                        console.log('Show');
                        $('#resize-map-button-up').show(); 
                    }
                    self.map.updateSize();
                };

                button1.addEventListener('click', handleResizeDown, false);
                button1.addEventListener('touchstart', handleResizeDown, false);

                var element1 = document.createElement('div');
                element1.className = 'resize-down ol-unselectable ol-control';
                element1.appendChild(button1);

                ol.control.Control.call(this, {
                    element: element1,
                    target: options.target
                });

            };
            app.ResizeUpControl = function(opt_options) {

                var options = opt_options || {};

                var button1 = document.createElement('button');
                button1.innerHTML = '<i class="fa fa-angle-up"></i>';
                button1.title = arches.translations['Decrease map height'];
                button1.style = "display: none;";
                button1.id = 'resize-map-button-up';

                var handleResizeUp = function(e) {

                    // Map
                    var mapSize = self.map.getSize();
                    var width = mapSize[0];
                    var height = mapSize[1];
                    //console.log(width);
                    console.log(height);
                    console.log(mapHeight);
                    if (mapHeight == -2) {
                        mapHeight = 398;
                        footerPadding = false;
                    }
                    height = height - 100;
                    if (height < mapHeight) {
                        console.log('Hide');   
                        $('#resize-map-button-up').hide();  
                        height = mapHeight +2;
                    }
                    padt = height - mapHeight + 20;
                    $('#map').css({'height': height+'px'});
                    $('#map-panel').css({'height': height+'px'});
                    $('#map-space').css({'height': height+'px'});
                    if (footerPadding) {
                        $('.footer').css({'padding-top': padt + 'px'});
                    }

                    self.map.updateSize();
                };

                button1.addEventListener('click', handleResizeUp, false);
                button1.addEventListener('touchstart', handleResizeUp, false);

                var element1 = document.createElement('div');
                element1.className = 'resize-up ol-unselectable ol-control';
                element1.appendChild(button1);

                ol.control.Control.call(this, {
                    element: element1,
                    target: options.target
                });

            };
            ol.inherits(app.ResizeDownControl, ol.control.Control);
            ol.inherits(app.ResizeUpControl, ol.control.Control);

            _.each(this.baseLayers, function(baseLayer) {
                layers.push(baseLayer.layer);
            });
            _.each(this.overlays, function(overlay) {
                layers.push(overlay);
            });

            dragAndDropInteraction.on('addfeatures', function(event) {
                var vectorSource = new ol.source.Vector({
                    features: event.features,
                    projection: event.projection
                });
                var vectorLayer = new ol.layer.Vector({
                    source: vectorSource,
                    style: new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(92, 184, 92, 0.5)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#0ff',
                            width: 1
                        })
                    })
                });
                self.map.addLayer(vectorLayer);
                var view = self.map.getView();
                view.fitExtent(vectorSource.getExtent(), (self.map.getSize()));
                self.trigger('layerDropped', vectorLayer, event.file.name, event.features);
            });

            this.map = new ol.Map({
                layers: layers,
                interactions: ol.interaction.defaults({
                    altShiftDragRotate: false,
                    dragPan: false,
                    rotate: false,
                    mouseWheelZoom:false
                }).extend([new ol.interaction.DragPan({kinetic: null})]).extend([dragAndDropInteraction]).extend([scaleLineControl]).extend([new app.ResizeUpControl(),new app.ResizeDownControl()]),
                target: this.el,
                view: new ol.View({
                    extent: arches.mapDefaults.extent ? arches.mapDefaults.extent.split(',') : undefined,
                    center: [arches.mapDefaults.x, arches.mapDefaults.y],
                    zoom: arches.mapDefaults.zoom,
                    minZoom: arches.mapDefaults.minZoom,
                    maxZoom: arches.mapDefaults.maxZoom
                })
            });
            
            var mapHeight = self.map.getSize()[1];
            console.log('Višina mape:');
            console.log(mapHeight);
            
            if (this.enableSelection) {
                this.select = new ol.interaction.Select({
                    condition: ol.events.condition.click,
                    style: function(feature, resolution) {
                        var isSelectFeature = _.contains(feature.getKeys(), 'select_feature');
                        var fillOpacity = isSelectFeature ? 0.3 : 0;
                        var strokeOpacity = isSelectFeature ? 0.9 : 0;
                        return [new ol.style.Style({
                            fill: new ol.style.Fill({
                                color: 'rgba(0, 255, 255, ' + fillOpacity + ')'
                            }),
                            stroke: new ol.style.Stroke({
                                color: 'rgba(0, 255, 255, ' + strokeOpacity + ')',
                                width: 3
                            }),
                            image: new ol.style.Circle({
                                radius: 10,
                                fill: new ol.style.Fill({
                                    color: 'rgba(0, 255, 255, ' + fillOpacity + ')'
                                }),
                                stroke: new ol.style.Stroke({
                                    color: 'rgba(0, 255, 255, ' + strokeOpacity + ')',
                                    width: 3
                                })
                            })
                        })];
                    }
                });

                this.map.addInteraction(this.select);
            }

            this.map.on('moveend', function () {
                var view = self.map.getView();
                var extent = view.calculateExtent(self.map.getSize());
                self.trigger('viewChanged', view.getZoom(), extent);
            });

            this.map.on('click', function(e) {
                var pixels = [e.originalEvent.layerX,e.originalEvent.layerY];
                var clickFeature = self.map.forEachFeatureAtPixel(pixels, function (feature, layer) {
                    return feature;
                });
                self.trigger('mapClicked', e, clickFeature);
            });
        },
        handleMouseMove: function(e) {
            var self = this;
            if(e.offsetX === undefined) {
                // this works in Firefox
                var xpos = e.pageX-$('#map').offset().left;
                var ypos = e.pageY-$('#map').offset().top;
            } else { 
                // works in Chrome, IE and Safari
                var xpos = e.offsetX;
                var ypos = e.offsetY;
            }
            var pixels = [xpos, ypos];
            var coords = this.map.getCoordinateFromPixel(pixels);
            var point = new ol.geom.Point(coords);
            var format = ol.coordinate.createStringXY(7);
            var overFeature = this.map.forEachFeatureAtPixel(pixels, function (feature, layer) {
                if (layer) {
                    return feature;
                }
            });
            
            coords = point.transform("EPSG:3857", "EPSG:4326").getCoordinates();
            if (coords.length > 0) {
                this.trigger('mousePositionChanged', format(coords), pixels, overFeature);
            } else {
                this.trigger('mousePositionChanged', '');
            }
        },

        handleMouseOut: function () {
            this.trigger('mousePositionChanged', '');
        }
    });
});
