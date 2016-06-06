define(['jquery', 
    'jquery-ui',
    'underscore',
    'backbone',
    'bootstrap',
    'arches', 
    'views/map',
    'openlayers', 
    'knockout',
    'map/resource-layer-model',
    'utils',
    'resource-types',
    'papaparse',], 
    function($, jqui, _, Backbone, bootstrap, arches, MapView, ol, ko, ResourceLayerModel, utils, resourceTypes, papaParse) {
        var geoJSON = new ol.format.GeoJSON();
        return Backbone.View.extend({
            previousEntityIdArray: [],

            events: {
                'click .layer-zoom': 'layerZoom',
                'click .cluster-item-link': 'clusterItemClick'
            },

            initialize: function(options) { 
                var maxZoomAreas =[
                                      [14.3552,46.2380,14.3561,46.2392], // Kranj
                                      [15.0654,46.5084,15.0663,46.5089]  // Puščava
                                  ];
                var self = this;
                var currentMaxZoom = arches.mapDefaults.maxZoom;
                var layer2Visible = [false,false];
                var stevecBarv = 0;

                //  Handle show/hide toggle ourselves
                $('#map-tools-btn').on('click', function(evt) {
                    self.toggleMapTools();
                    return false;
                });
                $('#map-tools-dropdown').on('click', function(evt) {
                    if($(evt.target).attr('name') === 'map-tools'){
                        self.togglefilter(evt);
                    }
                    return false;
                });

                //  suppress default bahavior of the bootstrap menu to auto close
                $('#map-tools-btn').on('hide.bs.dropdown', false);            
                $('#map-tools-btn').on('show.bs.dropdown', false);


                this.expanded = ko.observable(false);
                this.expanded.subscribe(function(status){
                    this.toggleFilterSection($('#map-filter'), status);
                }, this);

                this.query = {
                    filter: {
                        geometry:{
                            type: ko.observable(''),
                            coordinates: ko.observable([])
                        },
                        buffer: {
                            width: ko.observable('0'),
                            unit: ko.observable('m')
                        },
                        inverted: ko.observable(false)
                    },
                    changed: ko.pureComputed(function(){
                        return (ko.toJSON(this.query.filter.geometry.coordinates()) + 
                            ko.toJSON(this.query.filter.buffer.width()) + 
                            ko.toJSON(this.query.filter.inverted()));
                    }, this).extend({ rateLimit: 200 })
                }

                ko.applyBindings(this.query.filter, $('#map-tools-dropdown')[0]); 

                this.query.filter.buffer.width.subscribe(function(){
                    self.applyBuffer();
                });

                this.query.filter.geometry.type.subscribe(function(type){
                    var enabled = type !== '';
                    this.trigger('enabled', enabled, this.query.filter.inverted());
                    return enabled;
                }, this);


                this.vectorLayer = new ResourceLayerModel({}, function(features){
                    self.resourceFeatures = features;
                    if (self.highlightOnLoad) {
                        _.defer(function () { self.highlightFeatures(self.highlightOnLoad.resultsarray, self.highlightOnLoad.entityIdArray) });
                    }
                    self.trigger('vectorlayerloaded', features);
                    if (!self.cancelFitBaseLayer){
                        setTimeout(function() {
                              self.zoomToExtent(self.vectorLayer.getSource().getExtent());
                        }, 500);                        
                    }
                }).layer();
                this.map = new MapView({
                    el: $('#map'),
                    overlays: [this.vectorLayer]
                });


                this.bufferFeatureOverlay = new ol.FeatureOverlay({
                    style: new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(123, 123, 255, 0.5)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#ff6633',
                            width: 2,
                            lineDash: [4,4]
                        })
                    })
                }); 
                this.bufferFeatureOverlay.setMap(this.map.map);                   
                
                this.drawingFeatureOverlay = new ol.FeatureOverlay({
                    style: new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 255, 255, 0.0)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#ffcc33',
                            width: 2
                        })
                    })
                });
                this.drawingFeatureOverlay.setMap(this.map.map);
                
                ko.applyBindings(this.map, $('#basemaps-panel')[0]);

                var hideAllPanels = function(){
                    $("#overlay-panel").addClass("hidden");
                    $("#basemaps-panel").addClass("hidden");

                    //Update state of remaining buttons
                    $("#inventory-basemaps")
                        .removeClass("arches-map-tools-pressed")
                        .addClass("arches-map-tools")
                        .css("border-bottom-left-radius", "1px");
                    $("#inventory-overlays")
                        .removeClass("arches-map-tools-pressed")
                        .addClass("arches-map-tools")
                        .css("border-bottom-right-radius", "1px");
                };

                //Inventory-basemaps button opens basemap panel
                $("#inventory-basemaps").click(function (){
                    if ($(this).hasClass('arches-map-tools-pressed')) {
                        hideAllPanels();
                    } else {
                        $("#basemaps-panel").removeClass("hidden");
                        $("#overlay-panel").addClass("hidden");

                        //Update state of current button and adjust position
                        $("#inventory-basemaps")
                            .addClass("arches-map-tools-pressed")
                            .removeClass("arches-map-tools")
                            .css("border-bottom-left-radius", "5px");
                            
                        //Update state of remaining buttons
                        $("#inventory-overlays")
                            .removeClass("arches-map-tools-pressed")
                            .addClass("arches-map-tools")
                            .css("border-bottom-right-radius", "3px");                            
                    }
                });
                //Inventory-overlayss button opens overlay panel
                $("#inventory-overlays").click(function (){
                    if ($(this).hasClass('arches-map-tools-pressed')) {
                        hideAllPanels();
                    } else {
                        $("#overlay-panel").removeClass("hidden");
                        $("#basemaps-panel").addClass("hidden");

                        //Update state of remaining buttons
                        $("#inventory-basemaps").removeClass("arches-map-tools-pressed");
                        $("#inventory-basemaps").addClass("arches-map-tools");

                        //Update state of current button and adjust position
                        $("#inventory-overlays").addClass("arches-map-tools-pressed");
                        $("#inventory-overlays").removeClass("arches-map-tools");
                    }
                });
                

                $(".basemap").click(function (){ 
                    var basemap = $(this).attr('id');
                    _.each(self.map.baseLayers, function(baseLayer){ 
                        baseLayer.layer.setVisible(baseLayer.id == basemap);
                    });
                    hideAllPanels();
                });

                //Close Button
                $(".close").click(function (){ 
                    hideAllPanels();
                });

                
                var mouseoverFeatureTooltip = $('#feature_tooltip');
                var currentMousePx = null;
                var archesFeaturesCache = {};

                var showMouseoverFeatureTooltip = function(feature) {
                    var mapheight = self.map.$el.height();
                    var mapwidth = self.map.$el.width();
                    if (currentMousePx) {
                        //if (currentZoom === currentMaxZoom) {
                            // Name for max zoom
                            if (feature.get('title')!=undefined) {
                                mouseoverFeatureTooltip.find('#tooltip-text').html(feature.get('title'));
                            } else {
                                mouseoverFeatureTooltip.find('#tooltip-text').html(feature.get('primaryname1'));
                            }
                        //} else {
                            // Name for normal zoom
                        //    mouseoverFeatureTooltip.find('#tooltip-text').html(feature.get('primaryname2'));
                        //}
                        if(currentMousePx[0] < mapwidth*0.33){
                            mouseoverFeatureTooltip.removeClass('left')
                                .addClass('right');
                        }
                        if(currentMousePx[0] > mapwidth*0.66){
                            mouseoverFeatureTooltip.removeClass('right')
                                .addClass('left');
                        }
                        if(mouseoverFeatureTooltip.hasClass('left')){
                            mouseoverFeatureTooltip.css({
                                left: (currentMousePx[0] - mouseoverFeatureTooltip.width()+20) + 'px',
                                top: (currentMousePx[1] - mouseoverFeatureTooltip.height()/2) + 'px'
                            });
                        }
                        if(mouseoverFeatureTooltip.hasClass('right')){
                            mouseoverFeatureTooltip.css({
                                left: (currentMousePx[0] + 45) + 'px',
                                top: (currentMousePx[1] - mouseoverFeatureTooltip.height()/2) + 'px'
                            });
                        }
                        mouseoverFeatureTooltip.show();
                    }
                };

                self.map.on('mousePositionChanged', function (mousePosition, pixels, feature) {
                    var cursorStyle = "";
                    currentMousePx = pixels;
                    self.viewModel.mousePosition(mousePosition);
                    if (feature && (feature.get('arches_marker') || feature.get('arches_cluster'))) {
                        cursorStyle = "pointer";
                        if (feature.get('arches_marker') || feature.get('features').length >= 1) {  
                            if (feature.get('features')) {
                                feature = feature.get('features')[0];
                            }
                            // If "title" exists, show only title
                            if (feature.get('title') != undefined) {
                                showMouseoverFeatureTooltip(feature);
                            }
                            var fullFeature = archesFeaturesCache[feature.getId()];
                            if (fullFeature && fullFeature != 'loading') {
                                showMouseoverFeatureTooltip(fullFeature);
                            } else if (fullFeature != 'loading') {
                                archesFeaturesCache[feature.getId()] = 'loading';
                                $.ajax({
                                    type:"POST",
                                    url: arches.urls.map_markers + 'all', //?entityid=' + feature.getId(),
                                    data: {
                                        'entityid': feature.getId()
                                    }, 
                                    success: function(response) {
                                        fullFeature = geoJSON.readFeature(response.features[0]);
                                        var geom = fullFeature.getGeometry();
                                        geom.transform(ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

                                        fullFeature.set('select_feature', true);
                                        fullFeature.set('entityid', fullFeature.getId());

                                        archesFeaturesCache[feature.getId()] = fullFeature;
                                        showMouseoverFeatureTooltip(fullFeature);
                                    }
                                });
                            }
                        }
                    } else {
                        mouseoverFeatureTooltip.hide();
                    }
                    self.map.$el.css("cursor", cursorStyle);
                });

                var clusterFeaturesCache = {};

                var selectFeatureOverlay = new ol.FeatureOverlay({
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
                selectFeatureOverlay.setMap(self.map.map);
                
                $('.resource-info-closer').click(function() {
                    $('#resource-info').hide();
                    selectFeatureOverlay.getFeatures().clear();
                    $('.resource-info-closer')[0].blur();
                });

                $('.cluster-info-closer').click(function() {
                    $('#cluster-info').hide();
                    $('.cluster-info-closer')[0].blur();
                });

                this.viewModel = {
                    selectedResource: ko.observable({}),
                    clusterFeatures: ko.observableArray(),
                    mousePosition: ko.observable('')
                };
                ko.applyBindings(this.viewModel, $('#resource-info')[0]);
                ko.applyBindings(this.viewModel, $('#cluster-info')[0]);
                ko.applyBindings(this.viewModel, $('#mouse-position-panel')[0]);

                var showFeaturePopup = function(feature) {
                    var resourceData = {
                        id: feature.getId(),
                        reportLink: arches.urls.reports + feature.getId()
                    };
                    var typeInfo = resourceTypes[feature.get('entitytypeid')];
                    $('#cluster-info').hide();
                    if (typeInfo) {
                        resourceData.typeName = resourceTypes[feature.get('entitytypeid')].name;
                        resourceData.typeIcon = resourceTypes[feature.get('entitytypeid')].icon;
                    }
                    _.each(feature.getKeys(), function (key) {
                        resourceData[key] = feature.get(key);
                    });
                    
                    selectFeatureOverlay.getFeatures().clear();
                    selectFeatureOverlay.getFeatures().push(feature);
                    self.viewModel.selectedResource(resourceData);
                    $('#resource-info').show();
                };

                this.showFeaturePopup = showFeaturePopup;

                var showClusterPopup = function(feature) {
                    var ids = [];
                    _.each(feature.get('features'), function(childFeature) {
                        if (childFeature.getId() != undefined) {
                            ids.push(childFeature.getId());
                        }
                    });
                    if (ids.length>0) {
                        var featureIds = ids.join(',');
                        var completeFeatures = clusterFeaturesCache[featureIds];

                        self.viewModel.clusterFeatures.removeAll();
                        $('#resource-info').hide();
                        $('#cluster-info').show();

                        if (completeFeatures) {
                            self.viewModel.clusterFeatures.push.apply(self.viewModel.clusterFeatures, completeFeatures);
                        } else {
                            $.ajax({
                                type:"POST",
                                url: arches.urls.map_markers + 'all', //?entityid=' + featureIds,
                                data: {
                                    'entityid': featureIds
                                }, 
                                success: function(response) {
                                    clusterFeaturesCache[featureIds] = response.features;
                                    self.viewModel.clusterFeatures.push.apply(self.viewModel.clusterFeatures, response.features);
                                }
                            });
                        }
                    }
                };

                var currentZoom;
                this.map.on('viewChanged', function (zoom, extent) {
                    // Če pridemo do max zooma, prikažemo načrt grobišč
                    if (zoom >= 19) {
                        // Načrt prikažemo le, če smo na pravem mestu
                        currentMaxZoom = 19;
                        maxZoomExtended = false;
                        for (var i=2;i<3;i++) { // 4
                            if (ol.extent.intersects(extent, self.map.baseLayers[i].extent)) {
                                // Če načrt še ni prikazan, ostanemo pri osnovnem zoomu in kasneje omogočimo dodaten zoom 
                                if (!layer2Visible[i-2]) {
                                    self.map.map.getView().setZoom(currentMaxZoom);
                                }
                                layer2Visible[i-2] = true;
                                self.map.baseLayers[i].layer.setVisible(true);
                                currentMaxZoom = arches.mapDefaults.maxZoom;
                                maxZoomExtended = true;
                            }
                        }
                        // Dodatno preverimo še ročno vpisane koordinate (v teh primerih le dovolimo večji zoom)
                        searchType = $("#search_type").val();
                        if (!maxZoomExtended && searchType != 'Site') {
                            for (var i = 0; i < maxZoomAreas.length; i++) {
                               point1 = [maxZoomAreas[i][0],maxZoomAreas[i][1]];
                               point2 = [maxZoomAreas[i][2],maxZoomAreas[i][3]];
                               point1 = ol.proj.transform(point1, 'EPSG:4326','EPSG:3857');
                               point2 = ol.proj.transform(point2, 'EPSG:4326','EPSG:3857');
                               extent1 = [point1[0], point1[1],point2[0], point2[1]]
                               if (ol.extent.intersects(extent, extent1)) {
                                  maxZoomExtended = true;
                               }
                            }
                            if (maxZoomExtended) {
                                currentMaxZoom = arches.mapDefaults.maxZoom;
                            }
                        }
                        if (!maxZoomExtended) {
                           self.map.map.getView().setZoom(currentMaxZoom);
                        }
                    } else {
                        for (var i=2;i<3;i++) {  // 4
                            self.map.baseLayers[i].layer.setVisible(false);
                        }
                    }
                    currentZoom = zoom;
                });
                
                this.map.on('mapClicked', function(e, clickFeature) {
                    selectFeatureOverlay.getFeatures().clear();
                    $('#resource-info').hide();
                    if (clickFeature) {
                        var keys = clickFeature.getKeys();
                        var isCluster = _.contains(keys, "features");
                        var isArchesFeature = (_.contains(keys, 'arches_cluster') || _.contains(keys, 'arches_marker'));
                        if (isCluster && clickFeature.get('features').length > 1) {
                            if (currentZoom !== currentMaxZoom) {
                                var extent = clickFeature.getGeometry().getExtent();
                                _.each(clickFeature.get("features"), function (feature) {
                                    if (_.contains(keys, 'extent')) {
                                        featureExtent = ol.extent.applyTransform(feature.get('extent'), ol.proj.getTransform('EPSG:4326', 'EPSG:3857'));
                                    } else {
                                        featureExtent = feature.getGeometry().getExtent();
                                    }
                                    extent = ol.extent.extend(extent, featureExtent);
                                });
                                self.map.map.getView().fitExtent(extent, (self.map.map.getSize()));
                            } else {
                                showClusterPopup(clickFeature);
                            }
                        } else {
                            if (isCluster) {
                                clickFeature = clickFeature.get('features')[0];
                                keys = clickFeature.getKeys();
                            }
                            if (!_.contains(keys, 'select_feature')) {
                                if (isArchesFeature) {
                                    if (clickFeature.get('title') == undefined) {
                                        if (archesFeaturesCache[clickFeature.getId()] && archesFeaturesCache[clickFeature.getId()] !== 'loading'){
                                            showFeaturePopup(archesFeaturesCache[clickFeature.getId()]);
                                        } else {
                                            $('.map-loading').show();
                                            archesFeaturesCache[clickFeature.getId()] = 'loading';
                                            $.ajax({
                                                url: arches.urls.map_markers + 'all?entityid=' + clickFeature.getId(),
                                                success: function(response) {
                                                    var feature = geoJSON.readFeature(response.features[0]);
                                                    var geom = feature.getGeometry();
                                                    geom.transform(ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

                                                    feature.set('select_feature', true);
                                                    feature.set('entityid', feature.getId());

                                                    archesFeaturesCache[clickFeature.getId()] = feature;
                                                    $('.map-loading').hide();
                                                    showFeaturePopup(feature);
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                this.resultLayer = new ResourceLayerModel({entitytypeid: null, vectorColor: arches.resourceMarker.defaultColor}).layer();
                this.map.map.addLayer(this.resultLayer);
                var styleFactory = function (color, zIndex) {
                    var rgb = utils.hexToRgb(color);
                    return [new ol.style.Style({
                        text: new ol.style.Text({
                            text: arches.resourceMarker.icon,
                            font: 'normal 42px ' + arches.resourceMarker.font,
                            offsetX: 0, //5,
                            offsetY: 0, //((42/2)*-1)-5,
                            fill: new ol.style.Fill({
                                color: 'rgba(126,126,126,0.3)',
                            })
                        }),
                        zIndex: zIndex
                    }), new ol.style.Style({
                        text: new ol.style.Text({
                            text: arches.resourceMarker.icon,
                            font: 'normal 42px ' + arches.resourceMarker.font,
                            offsetY: 0, //(42/2)*-1,
                            stroke: new ol.style.Stroke({
                                color: 'white',
                                width: 3
                            }),
                            fill: new ol.style.Fill({
                                color: 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.9)',
                            })
                        }),
                        zIndex: zIndex
                    })];
                };
                var normalStyle = styleFactory(arches.resourceMarker.defaultColor, 1000000);
                var highlightStyle = styleFactory('#4CAE4C', 9999999);

                this.currentPageLayer = new ol.layer.Vector({
                    source: new ol.source.GeoJSON(),
                    style: function(feature) {
                        if(feature.get('highlight')) {
                            return highlightStyle;
                        } else {
                            return normalStyle;
                        }
                    },
                    rendererOptions: { zIndexing: true }
                });
                
                this.map.map.addLayer(this.currentPageLayer);
                
                // Kopija iz map.js (le self je treba dodati pred map.map)
                $('.geom-upload').on('change', function() {
                    if (this.files.length > 0) {
                        var file = this.files[0];
                        var reader = new FileReader();
                        reader.onloadend = function(e) { 
                            var features = [];
                            var result = this.result;
                            stevecBarv = stevecBarv + 1;
                            result = result.replace(/(?:\")/g, "");
                            //console.log(result);
                            results = papaParse.parse(result, {
                                delimiter: "\t",
                                header: true,
                                dynamicTyping: true,
                                skipEmptyLines: true,
                                comments: "#"
                            });

                            var features = [],
                                featurecollection = { type: 'FeatureCollection', 
                                                      crs:  { type: 'name',
                                                              properties: {
                                                                 name: 'EPSG:4326'
                                                              }
                                                            },
                                                      features: features };
                            for (i=0; i<results.data.length; i++) {
                                if ((results.data[i]['NAJDISCE'] == undefined && results.data[i]['LON'] != '') || (results.data[i]['LON'] == undefined) || (results.data[i]['LAT'] == undefined && results.data[i]['LON'] != '')) {
                                    alert(arches.translations['Wrong CSV file structure (SITE_NAME, LON, LAT)!']);
                                    return;
                                }
                                if (results.data[i]['NAJDISCE'] != '' && results.data[i]['LON'] != '' && results.data[i]['LAT'] != '' && results.data[i]['NAJDISCE'] != undefined) {
                                    if ((results.data[i]['LAT'].toString().split('.').length-1 > 1) || (results.data[i]['LON'].toString().split('.').length-1 > 1)) {
                                        alert(arches.translations['Invalid coordinates format!']);
                                        return;
                                    } 
                                    feature = { type: 'Feature',
                                                geometry: {
                                                   type: 'Point',
                                                   coordinates: [results.data[i]['LON'], results.data[i]['LAT']]
                                                },
                                                properties: {
                                                   title: results.data[i]['NAJDISCE']
                                                }
                                              };
                                    features.push(feature);
                                }
                            } 
                            
                            var geojson_format = new ol.format.GeoJSON();
                            
                            var features1 = [];
                            var readFeatures = geojson_format.readFeatures(featurecollection);
                            _.each(readFeatures, function (feature) {
                                var featureProjection = geojson_format.readProjection(featurecollection);
                                var transform = ol.proj.getTransform(featureProjection, ol.proj.get('EPSG:3857'));
                                var geometry = feature.getGeometry();
                                if (geometry) {
                                    geometry.applyTransform(transform);
                                }
                                features1.push(feature);
                            });
                            var color = "";
                            if (stevecBarv % 5 == 1) {
                                color = "#00ffff";
                            } else if (stevecBarv % 5 == 2) {
                                color = "#ffff00";
                            } else if (stevecBarv % 5 == 3) {
                                color = "#66ff33";
                            } else if (stevecBarv % 5 == 4) {
                                color = "#ffcc00";
                            } else if (stevecBarv % 5 == 0) {
                                color = "#cc9966";
                            }
                            this.customLayer = new ResourceLayerModel({entitytypeid: null, vectorColor: color, archesLayer: false}).layer();
                            this.customLayer.vectorSource.addFeatures(features1);
                            self.map.map.addLayer(this.customLayer);
                            var view = self.map.map.getView();
                            view.fitExtent(this.customLayer.vectorSource.getExtent(), (self.map.map.getSize()));
                            hideAllPanels();
                        };
                        reader.readAsText(file);
                    }
                });

            },

            zoomToResource: function(resourceid){
                this.cancelFitBaseLayer = true;
                var feature = this.resultLayer.getSource().getFeatureById(resourceid);
                if(feature.getGeometry().getGeometries().length > 1){
                    var extent = feature.getGeometry().getExtent();
                    var minX = extent[0];
                    var minY = extent[1];
                    var maxX = extent[2];
                    var maxY = extent[3];
                    var polygon = new ol.geom.Polygon([[[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]]]);
                    //polygon.transform('EPSG:3857', 'EPSG:4326');
                    this.map.map.getView().fitGeometry(polygon, this.map.map.getSize(), {maxZoom:16}); 
                    //this.zoomToExtent(feature.getGeometry().getExtent());
                }else{
                    this.map.map.getView().fitGeometry(feature.getGeometry().getGeometries()[0], this.map.map.getSize(), {maxZoom:16});                    
                }
            },
            
            zoomToExtent: function(extent){
                var size = this.map.map.getSize();
                var view = this.map.map.getView()
                view.fitExtent(
                    extent,
                    size
                );
            },

            highlightFeatures: function(resultsarray, entityIdArray){
                var resultFeatures = [];
                var currentPageFeatures = [];
                var nonResultFeatures = [];
                var self = this;
                var sameResultSet = (entityIdArray[0] === '_none');
                if (this.resourceFeatures) {
                    if (sameResultSet) {
                        if (resultsarray.results.hits.hits.length == 0) {
                            self.vectorLayer.vectorSource.clear();
                            this.resultLayer.vectorSource.clear();
                            this.currentPageLayer.getSource().clear();
                            self.vectorLayer.vectorSource.addFeatures(this.resourceFeatures);                            
                        } else {
                            currentPageFeatures = this.currentPageLayer.getSource().getFeatures();
                            self.currentPageLayer.getSource().clear();
                            self.resultLayer.vectorSource.addFeatures(currentPageFeatures);
                            
                            currentPageFeatures = [];
                            _.each(resultsarray.results.hits.hits, function(pageResult) {
                                var feature = self.resultLayer.vectorSource.getFeatureById(pageResult['_id']);
                                if (feature) {
                                    self.resultLayer.vectorSource.removeFeature(feature);
                                    if (!feature.get('arches_marker')) {
                                        feature.set('arches_marker', true);
                                    }
                                    currentPageFeatures.push(feature);
                                }
                            });
                            self.currentPageLayer.getSource().addFeatures(currentPageFeatures);
                        }
                    } else {
                        self.vectorLayer.vectorSource.clear();
                        this.resultLayer.vectorSource.clear();
                        this.currentPageLayer.getSource().clear();

                        if (entityIdArray[0] === '_all') {
                             _.each(this.resourceFeatures, function (feature) {
                                if (_.find(resultsarray.results.hits.hits, function(hit){ return hit['_id'] === feature.getId() })) {
                                    if (!feature.get('arches_marker')) {
                                        feature.set('arches_marker', true);
                                    }
                                    currentPageFeatures.push(feature);
                                } else {
                                    resultFeatures.push(feature);
                                }
                            });
                        } else {
                            _.each(this.resourceFeatures, function (feature) {
                                if (_.find(resultsarray.results.hits.hits, function(hit){ return hit['_id'] === feature.getId() })) {
                                    if (!feature.get('arches_marker')) {
                                        feature.set('arches_marker', true);
                                    }
                                    currentPageFeatures.push(feature);
                                } else if (entityIdArray.indexOf(feature.getId()) > 0) {
                                    resultFeatures.push(feature);
                                } else {
                                    nonResultFeatures.push(feature);
                                }
                            });
                        }
                        self.currentPageLayer.getSource().addFeatures(currentPageFeatures);
                        self.resultLayer.vectorSource.addFeatures(resultFeatures);
                        self.vectorLayer.vectorSource.addFeatures(nonResultFeatures);
                        if (self.drawingFeatureOverlay.getFeatures().getLength() === 0 && this.query.filter.geometry.type() !== 'bbox') {
                            self.zoomToResults();
                        }
                    }
                    self.previousEntityIdArray = entityIdArray;
                } else {
                    console.log('NOT resourceFeatures');
                    this.highlightOnLoad = {
                        resultsarray: resultsarray,
                        entityIdArray: entityIdArray
                    };
                }
            },

            zoomToResults: function () {
                var extent = ol.extent.extend(this.currentPageLayer.getSource().getExtent(), this.resultLayer.vectorSource.getExtent());
                this.map.map.getView().fitExtent(extent, this.map.map.getSize());
            },

            selectFeatureById: function(resourceid){
                this.unselectAllFeatures();
                var feature = this.currentPageLayer.getSource().getFeatureById(resourceid);
                if(feature){
                    feature.set('highlight', true);
                    return feature;
                } 
            },

            unselectAllFeatures: function(){
                this.currentPageLayer.getSource().forEachFeature(function(feature) {
                    feature.set('highlight', false);
                });
            },

            getMapExtent: function(){
                var extent = ol.proj.transformExtent(this.map.map.getView().calculateExtent(this.map.map.getSize()), 'EPSG:3857', 'EPSG:4326');
                return extent;
            },

            onMoveEnd: function(evt) {
                this.query.filter.geometry.coordinates(this.getMapExtent());
            },

            togglefilter: function(evt){
                var link = $(evt.target).closest('a');
                var data = link.data();
                var item = link.find('i');
 
                if (!(item.hasClass("fa-check"))){
                    this.enableFilter(data.tooltype);
                }else{
                    this.clear();
                }
            },

            enableFilter: function(tooltype){
                console.log(tooltype);
                if(tooltype){
                    if(tooltype === 'map-extent'){
                        this.removeDrawingTools();
                        this.clearDrawingFeatures();
                        this.query.filter.geometry.type('bbox');
                        this.query.filter.geometry.coordinates(this.getMapExtent());
                        this.map.map.on('moveend', this.onMoveEnd, this);
                    }else{
                        this.clearDrawingFeatures();
                        this.query.filter.geometry.type(tooltype);
                        this.changeDrawingTool(this.map.map, tooltype);
                        this.map.map.un('moveend', this.onMoveEnd, this);     
                    }                  
                }
            },

            changeDrawingTool: function(map, tooltype){
                this.disableDrawingTools();
                console.log(tooltype);
                this.modifyTool = new ol.interaction.Modify({
                    features: this.drawingFeatureOverlay.getFeatures(),
                    // the SHIFT key must be pressed to delete vertices, so
                    // that new vertices can be drawn at the same position
                    // of existing vertices
                    deleteCondition: function(event) {
                        return ol.events.condition.shiftKeyOnly(event) &&
                                ol.events.condition.singleClick(event);
                    }
                });
                map.addInteraction(this.modifyTool);                

                this.drawingtool = new ol.interaction.Draw({
                    features: this.drawingFeatureOverlay.getFeatures(),
                    type: tooltype
                });
                this.drawingtool.set('type', tooltype);

                this.drawingtool.on('drawstart', function(){
                    if(this.drawingtool.get('type') !== 'Point'){
                        this.clearDrawingFeatures();                       
                    }
                }, this);

                this.drawingtool.on('drawend', function(evt){
                    var self = this;
                    var geometry = evt.feature.getGeometry().clone();
                    geometry.transform('EPSG:3857', 'EPSG:4326');
                    this.query.filter.geometry.coordinates(geometry.getCoordinates());

                    //this.applyBuffer();
                    
                    evt.feature.on('change', function(evt) {
                        var geometry = evt.target.getGeometry().clone();
                        geometry.transform('EPSG:3857', 'EPSG:4326');
                        self.query.filter.geometry.coordinates(geometry.getCoordinates());
                        //self.applyBuffer();
                    });
                    //this.removeDrawingTools();
                    //this.clearDrawingFeatures();
                    //this.query.filter.geometry.type('');
                    //this.query.filter.geometry.coordinates([]);
                    //this.map.map.un('moveend', this.onMoveEnd, this);
                }, this);

                this.enableDrawingTools();
            },

            enableDrawingTools: function(){
                if(this.drawingtool){
                    this.map.map.addInteraction(this.drawingtool);
                }
            },

            disableDrawingTools: function(){
                if(this.drawingtool){
                    this.map.map.removeInteraction(this.drawingtool);
                }
            },

            removeDrawingTools: function(){
                this.disableDrawingTools();
                delete this.drawingtool;
            },

            clearDrawingFeatures: function(){
                if (this.bufferFeatureOverlay){
                    this.bufferFeatureOverlay.getFeatures().clear();                 
                }
                if (this.drawingFeatureOverlay){
                    this.drawingFeatureOverlay.getFeatures().clear();
                }
            },

            applyBuffer: function(){
                var self = this;
                var params = {
                    filter: ko.toJSON(this.query.filter)
                }; 
                if(this.query.filter.buffer.width() > 0 && this.drawingFeatureOverlay.getFeatures().getLength() > 0){
                    $.ajax({
                        type: "GET",
                        url: arches.urls.buffer,
                        data: {
                            filter: ko.toJSON(this.query.filter)
                        },
                        success: function(results){
                            var source = new ol.source.GeoJSON(({object:{type: 'FeatureCollection', features: [{type:'Feature', geometry: JSON.parse(results)}]}}));
                            var feature = source.getFeatures()[0];
                            
                            feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
                            self.bufferFeatureOverlay.getFeatures().clear();  
                            self.bufferFeatureOverlay.addFeature(feature);
                        },
                        error: function(){}
                    });                    
                }else{
                    this.bufferFeatureOverlay.getFeatures().clear();  
                }
            },

            toggleMapTools: function() {
                if($('#map-tools-btn').hasClass('open')){
                    this.disableDrawingTools();
                }
                else {
                    this.enableDrawingTools();
                }
                $('#map-tools-btn').toggleClass('open');
            },

            toggleFilterSection: function(ele, expand){
                if(expand){
                    this.slideToggle(ele, 'show');
                }else{
                    this.slideToggle(ele, 'hide');               
                }
            },

            slideToggle: function(ele, showOrHide){
                var self = this;
                if ($(ele).is(":visible") && showOrHide === 'hide'){
                    ele.slideToggle('slow');
                    return;
                }

                if (!($(ele).is(":visible")) && showOrHide === 'show'){
                    ele.slideToggle('slow', function(){
                        self.map.map.updateSize();
                        self.zoomToResults();
                    });
                    return;
                }

                if (!showOrHide){
                    ele.slideToggle('slow');                    
                }
            },

            restoreState: function(filter, expanded){
                this.map.map.once('change:size', function(){
                    if(typeof filter !== 'undefined' && 'geometry' in filter && filter.geometry.coordinates.length > 0){
                        this.query.filter.inverted(ko.utils.unwrapObservable(filter.inverted));                        
                        this.query.filter.geometry.type(ko.utils.unwrapObservable(filter.geometry.type));
                        this.query.filter.geometry.coordinates(ko.utils.unwrapObservable(filter.geometry.coordinates));
                        this.query.filter.buffer.width(ko.utils.unwrapObservable(filter.buffer.width));
                        this.query.filter.buffer.unit(ko.utils.unwrapObservable(filter.buffer.unit));

                        var coordinates = this.query.filter.geometry.coordinates();
                        var type = this.query.filter.geometry.type();
                        if(type === 'bbox'){
                            this.map.map.on('moveend', this.onMoveEnd, this); 

                            var extent = ol.proj.transformExtent(coordinates, 'EPSG:4326', 'EPSG:3857');
                            this.zoomToExtent(extent);

                        }else{
                            var feature = new ol.Feature({
                                geometry: new ol.geom[type](coordinates)
                            });

                            feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
                            this.zoomToExtent(feature.getGeometry().getExtent());
                            this.drawingFeatureOverlay.addFeature(feature);
                            this.changeDrawingTool(this.map.map, type);
                            this.disableDrawingTools();

                            feature.on('change', function(evt) {
                                var geometry = evt.target.getGeometry().clone();
                                geometry.transform('EPSG:3857', 'EPSG:4326');
                                this.query.filter.geometry.coordinates(geometry.getCoordinates());
                                //self.applyBuffer();
                            }, this);
                        }
                    }

                }, this);

                if(typeof expanded === 'undefined'){
                    searchType = $("#search_type").val();
                    if (searchType == 'Site' || searchType == 'Grave' || searchType == 'Object') {
                        expanded = true;
                    } else {
                        expanded = false;
                    }
                }
                this.expanded(expanded);

            },

            clear: function(){
                this.removeDrawingTools();
                this.clearDrawingFeatures();
                this.query.filter.inverted(false);
                this.query.filter.geometry.type('');
                this.query.filter.geometry.coordinates([]);
                this.map.map.un('moveend', this.onMoveEnd, this);
            },

            clusterItemClick: function (e) {
                var entityid = $(e.target).closest('.cluster-item-link').data().entityid;
                var geoJSONFeature = ko.utils.arrayFirst(this.viewModel.clusterFeatures(), function(item) {
                    return entityid === item.id;
                });

                var feature = geoJSON.readFeature(geoJSONFeature);
                var geom = feature.getGeometry();
                geom.transform(ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

                feature.set('select_feature', true);
                feature.set('entityid', feature.getId());

                this.showFeaturePopup(feature);
            }
        });
});
