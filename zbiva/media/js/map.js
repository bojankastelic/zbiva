require([
    'jquery',
    'underscore',
    'backbone',
    'openlayers',
    'knockout',
    'arches',
    'resource-layer-info',
    'views/map',
    'map/layers',
    'map/resource-layers',
    'map/layer-model',
    'map/resource-layer-model',
    'selected-resource-id',
    'resource-types',
    'papaparse',
    'bootstrap',
    'select2',
    'plugins/jquery.knob.min'
], function($, _, Backbone, ol, ko, arches, layerInfo, MapView, layers, resourceLayers, LayerModel, ResourceLayerModel, selectedResourceId, resourceTypes, papaParse) {
    var geoJSON = new ol.format.GeoJSON();
    var PageView = Backbone.View.extend({
        el: $('body'),
        events: {
            'click .visibility-toggle': 'visibilityToggle',
            'click .on-map-toggle': 'onMapToggle',
            'click .layer-zoom': 'layerZoom',
            'click .cluster-item-link': 'clusterItemClick'
        },
        initialize: function(options) {
            var maxZoomAreas = [
                                  [14.3552,46.2380,14.3561,46.2392], // Kranj
                                  [15.0654,46.5084,15.0663,46.5089]  // Puščava
                               ];
            var self = this;
            var currentMaxZoom = arches.mapDefaults.maxZoom;
            var layer2Visible = [false,false];
            var mapLayers = [];
            var stevecBarv = 0;
            var elevateArchesResourceLayers = function () {
                map.map.getLayers().forEach(function(layer, index) {
                    if (layer.get('is_arches_layer')) {
                        map.map.removeLayer(layer);
                        map.map.addLayer(layer);
                    }
                });
            };
            _.each(layers, function(layer, index) {
                if (layer.onMap) {
                    if (typeof layer.layer == 'function') {
                        layer.layer = layer.layer();
                    }
                    mapLayers.push(layer.layer);
                }
                layer.onMap = ko.observable(layer.onMap);
                layers[index].onMap.subscribe(function(add) {
                    // allow for lazy instantiation (and thus load)
                    if (typeof layer.layer == 'function') {
                        layer.layer = layer.layer();
                    }
                    if (add) {
                        map.map.addLayer(layer.layer);
                        elevateArchesResourceLayers();
                    } else {
                        map.map.removeLayer(layer.layer);
                    }
                });
                layer.active = ko.observable(true);
                layers[index].active.subscribe(function(show) {
                    layer.layer.setVisible(show);
                });
                layer.filtered = ko.observable(false);
            });
            var map = new MapView({
                el: $('#map'),
                overlays: mapLayers.reverse()
            });

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
            selectFeatureOverlay.setMap(map.map);

            self.viewModel = {
                baseLayers: map.baseLayers,
                layers: ko.observableArray(layers),
                filterTerms: ko.observableArray(),
                zoom: ko.observable(arches.mapDefaults.zoom),
                mousePosition: ko.observable(''),
                selectedResource: ko.observable({}),
                selectedAddress: ko.observable(''),
                clusterFeatures: ko.observableArray()
            };
            self.map = map;
            var clusterFeaturesCache = {};
            var archesFeaturesCache = {};

            var selectDeafultFeature = function (features) {
                var feature = _.find(features, function (feature) {
                    return feature.getId() === selectedResourceId;
                });
                if (feature) {
                    var geom = geoJSON.readGeometry(feature.get('geometry_collection'));
                    geom.transform(ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));
                    map.map.getView().fitExtent(geom.getExtent(), map.map.getSize());
                    selectFeatureOverlay.getFeatures().clear();
                    selectFeatureOverlay.getFeatures().push(feature);
                    selectedResourceId = null;
                }
            };
            if (selectedResourceId) {
                selectDeafultFeature(resourceLayers.features());

                resourceLayers.features.subscribe(function (features) {
                    selectDeafultFeature(features);
                });
            }

            self.viewModel.filterTerms.subscribe(function () {
                var terms = self.viewModel.filterTerms()
                _.each(self.viewModel.layers(), function(layer) {
                    var filtered = true;
                    if (terms.length == 0) {
                        filtered = false;
                    } else {
                        _.each(terms, function(term) {
                            if (term.text === layer.name) {
                                filtered = false;
                            } else if (_.contains(layer.categories, term.text)) {
                                filtered = false;
                            }
                        });
                    }
                    layer.filtered(filtered)
                });
            });

            map.on('layerDropped', function (layer, name, features) {
                
                /*var layerModel = new LayerModel({
                      name: name,
                      description: '',
                      categories: [''],
                      icon: 'fa fa-map-marker',
                      iconColor: '#C4171D',
                      layer: layer,
                      onMap:  ko.observable(true),
                      active: ko.observable(true),
                      filtered: ko.observable(false)
                });
                layerModel.onMap.subscribe(function(add) {
                    if (add) {
                        map.map.addLayer(layer);
                        elevateArchesResourceLayers();
                    } else {
                        map.map.removeLayer(layer);
                    }
                });
                layerModel.active.subscribe(function(show) {
                    layer.setVisible(show);
                });
                self.viewModel.layers.push(layerModel);
                */
                this.customLayer = new ResourceLayerModel({entitytypeid: null, vectorColor: '#66ff33', archesLayer: false}).layer();
                this.customLayer.vectorSource.addFeatures(features);
                map.map.addLayer(this.customLayer);
                /*
                $('.knob').knob({
                    change: function (value) {
                        var layerId = this.$.data().layerid;
                        var layer = ko.utils.arrayFirst(self.viewModel.layers(), function(item) {
                            return layerId === item.id;
                        });
                        layer.layer.setOpacity(value/100);
                    }
                });
                $(".knob").css("font-size", 11);
                $(".knob").css("font-weight", 200);
                $('[data-toggle="popover"]').popover();
                */
            });

            map.on('viewChanged', function (zoom, extent) {
                /*if (zoom >= 8) {
                    for (var i=1;i<4;i++) {
                        resourceLayers.layers[i].layer.setSource(new ol.source.Cluster({
                            distance: 1,
                            source: resourceLayers.layers[i].layer.vectorSource
                          })
                        );
                    }
                } else {
                    for (var i=1;i<4;i++) {
                        resourceLayers.layers[i].layer.setSource(new ol.source.Cluster({
                            distance: 45,
                            source: resourceLayers.layers[i].layer.vectorSource
                          })
                        );
                    }
                } */
                // Če pridemo do max zooma, prikažemo načrt grobišč
                if (zoom >= 19) {
                    // Načrt prikažemo le, če smo na pravem mestu
                    currentMaxZoom = 19;
                    maxZoomExtended = false;
                    for (var i=2;i<3;i++) {  // 4
                        if (ol.extent.intersects(extent, map.baseLayers[i].extent)) {
                            // Če načrt še ni prikazan, ostanemo pri osnovnem zoomu in kasneje omogočimo dodaten zoom 
                            if (!layer2Visible[i-2]) {
                                map.map.getView().setZoom(currentMaxZoom);
                            }
                            layer2Visible[i-2] = true;
                            map.baseLayers[i].layer.setVisible(true);
                            currentMaxZoom = arches.mapDefaults.maxZoom;
                            maxZoomExtended = true;
                        }
                    }
                    // Dodatno preverimo še ročno vpisane koordinate (v teh primerih le dovolimo večji zoom)
                    if (!maxZoomExtended) {
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
                       map.map.getView().setZoom(currentMaxZoom);
                    }
                } else {
                    for (var i=2;i<3;i++) { // 4
                        map.baseLayers[i].layer.setVisible(false);
                    }
                }
                self.viewModel.zoom(zoom);
            });

            /* Testing...
            map.map.getView().on('propertychange', function(e) {
               console.log(e.key);
               switch (e.key) {
                  case 'resolution':
                    console.log(e.oldValue);
                    console.log(e.target);
                    console.log(e.target.get(e.key));
                    //if (e.target.get(e.key)<0.30) {
                    //    map.map.getView().setZoom(18);
                    //}
                    break;
               }
            });
            */
            var mouseoverFeatureTooltip = $('#feature_tooltip');
            var currentMousePx = null;

            var showMouseoverFeatureTooltip = function(feature) {
                var mapheight = map.$el.height();
                var mapwidth = map.$el.width();
                if (currentMousePx) {
                    //if (self.viewModel.zoom() >= 19) {
                        // Name for normal zoom
                        if (feature.get('title')!=undefined) {
                            mouseoverFeatureTooltip.find('#tooltip-text').html(feature.get('title'));
                        } else {
                            mouseoverFeatureTooltip.find('#tooltip-text').html(feature.get('primaryname1'));
                        }
                    //} else {
                        // Name for max zoom
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
                            left: (currentMousePx[0] - mouseoverFeatureTooltip.width() - 15) + 'px',
                            top: (currentMousePx[1] - mouseoverFeatureTooltip.height()/2 + map.$el.offset().top) + 'px'
                        });
                    }
                    if(mouseoverFeatureTooltip.hasClass('right')){
                        mouseoverFeatureTooltip.css({
                            left: (currentMousePx[0] + 10) + 'px',
                            top: (currentMousePx[1] - mouseoverFeatureTooltip.height()/2 + map.$el.offset().top) + 'px'
                        });
                    }
                    mouseoverFeatureTooltip.show();
                }
            };

            map.on('mousePositionChanged', function (mousePosition, pixels, feature) {
                var cursorStyle = "";
                currentMousePx = pixels;
                self.viewModel.mousePosition(mousePosition);

                if (feature && (feature.get('arches_marker') || feature.get('arches_cluster'))) {
                    cursorStyle = "pointer";
                    if (feature.get('arches_marker') || feature.get('features').length >= 1) { 
                        feature = feature.get('features')[0];
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
                map.$el.css("cursor", cursorStyle);
            });

            $('.resource-info-closer').click(function() {
                $('#resource-info').hide();
                selectFeatureOverlay.getFeatures().clear();
                $('.resource-info-closer')[0].blur();
            });

            $('.cluster-info-closer').click(function() {
                $('#cluster-info').hide();
                $('.cluster-info-closer')[0].blur();
            });

            var showFeaturePopup = function(feature) {
                var resourceData = {
                    id: feature.getId(),
                    reportLink: arches.urls.reports + feature.getId()
                };
                var typeInfo = layerInfo[feature.get('entitytypeid')];
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

            map.on('mapClicked', function(e, clickFeature) {
                selectFeatureOverlay.getFeatures().clear();
                $('#resource-info').hide();
                if (clickFeature) {
                    var keys = clickFeature.getKeys();
                    var isCluster = _.contains(keys, "features");
                    var isArchesFeature = (_.contains(keys, 'arches_cluster') || _.contains(keys, 'arches_marker'));
                    if (isCluster && clickFeature.get('features').length > 1) {
                        if (self.viewModel.zoom() !== currentMaxZoom) {
                            var extent = clickFeature.getGeometry().getExtent();
                            _.each(clickFeature.get("features"), function (feature) {
                                if (_.contains(keys, 'extent')) {
                                    featureExtent = ol.extent.applyTransform(feature.get('extent'), ol.proj.getTransform('EPSG:4326', 'EPSG:3857'));
                                } else {
                                    featureExtent = feature.getGeometry().getExtent();
                                }
                                extent = ol.extent.extend(extent, featureExtent);
                            });
                            map.map.getView().fitExtent(extent, (map.map.getSize()));
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
                                console.log(clickFeature.get('title'));
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
            
            var hideAllPanels = function () {
                $("#overlay-panel").addClass("hidden");
                $("#basemaps-panel").addClass("hidden");

                //Update state of remaining buttons
                $("#inventory-basemaps").removeClass("arches-map-tools-pressed");
                $("#inventory-basemaps").addClass("arches-map-tools");
                $("#inventory-basemaps").css("border-bottom-left-radius", "1px");

                $("#inventory-overlays").removeClass("arches-map-tools-pressed");
                $("#inventory-overlays").addClass("arches-map-tools");
                $("#inventory-overlays").css("border-bottom-right-radius", "1px");
            };

            ko.applyBindings(self.viewModel, $('body')[0]);

            $(".basemap").click(function (){
                var basemap = $(this).attr('id');
                _.each(map.baseLayers, function(baseLayer){
                    baseLayer.layer.setVisible(baseLayer.id == basemap);
                });
                hideAllPanels();
            });

            //Inventory-basemaps button opens basemap panel
            $(".inventory-basemaps").click(function (){
                if ($(this).hasClass('arches-map-tools-pressed')) {
                    hideAllPanels();
                } else {
                    $("#overlay-panel").addClass("hidden");
                    $("#basemaps-panel").removeClass("hidden");

                    //Update state of remaining buttons
                    $("#inventory-overlays").removeClass("arches-map-tools-pressed");
                    $("#inventory-overlays").addClass("arches-map-tools");
                    $("#inventory-overlays").css("border-bottom-right-radius", "3px");

                    //Update state of current button and adjust position
                    $("#inventory-basemaps").addClass("arches-map-tools-pressed");
                    $("#inventory-basemaps").removeClass("arches-map-tools");
                    $("#inventory-basemaps").css("border-bottom-left-radius", "3px");
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

            //Close Button
            $(".close").click(function (){
                hideAllPanels();
            });

            //Show and hide Layer Library.  
            $("#add-layer").click(function(){
                $( ".map-space" ).slideToggle(600);
                $( "#layer-library" ).slideToggle(600);
            });

            $("#back-to-map").click(function(){
                $( ".map-space" ).slideToggle(600);
                $( "#layer-library" ).slideToggle(600);
            });

            $('.knob').knob({
                change: function (value) {
                    var layerId = this.$.data().layerid;
                    var layer = ko.utils.arrayFirst(self.viewModel.layers(), function(item) {
                        return layerId === item.id;
                    });
                    layer.layer.setOpacity(value/100);
                }
            });
            $(".knob").css("font-size", 11);
            $(".knob").css("font-weight", 200);

            $(".ol-zoom").css("top", "10px");
            $(".ol-zoom").css("z-index", "500");
            $(".ol-attribution").css("margin-bottom", "70px");

            //Select2 Simple Search initialize
            $('.layerfilter').select2({
                data: function() {
                    var terms = [];
                    _.each(layers, function (layer) {
                        terms = _.union(terms, layer.categories, [layer.name]);
                    });

                    return {
                        results: _.map(terms, function(term) {
                            return {
                                id: _.uniqueId('term'),
                                text: term
                            };
                        })
                    };
                },
                placeholder: "",
                multiple: true,
                maximumSelectionSize: 5
            });

            //filter layer library
            $(".layerfilter").on("select2-selecting", function(e) {
                self.viewModel.filterTerms.push(e.object);
            });

            $(".layerfilter").on("select2-removed", function(e) {
                var term = ko.utils.arrayFirst(self.viewModel.filterTerms(), function(term) {
                    return term.id === e.val;
                });

                self.viewModel.filterTerms.remove(term);
            });

            //Select2 Simple Search initialize
            $('.geocodewidget').select2({
                ajax: {
                    url: "geocoder",
                    dataType: 'json',
                    quietMillis: 250,
                    data: function (term, page) {
                        return {
                            q: term
                        };
                    },
                    results: function (data, page) {
                        return { results: data.results };
                    },
                    cache: true
                },
                minimumInputLength: 4,
                multiple: true,
                maximumSelectionSize: 1
            });

            $('.geocodewidget').on("select2-selecting", function(e) {
                var geom = geoJSON.readGeometry(e.object.geometry);
                geom.transform(ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));
                self.map.map.getView().fitExtent(geom.getExtent(), self.map.map.getSize());
                self.viewModel.selectedAddress(e.object.text);
                overlay.setPosition(ol.extent.getCenter(geom.getExtent()));
                overlay.setPositioning('center-center');
                $('#popup').show();
            });

            $('.geocodewidget').on('select2-removing', function () {
                $('#popup').hide();
            });
            
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
                        //console.log(results);

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
                        //console.log(features);
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
                        map.map.addLayer(this.customLayer);
                        var view = map.map.getView();
                        view.fitExtent(this.customLayer.vectorSource.getExtent(), (map.map.getSize()));
                        hideAllPanels();
                    };
                    reader.readAsText(file);
                }
            });

            var overlay = new ol.Overlay({
              element: $('#popup')[0]
            });

            map.map.addOverlay(overlay);

            $('[data-toggle="popover"]').popover();
        },
        getLayerById: function(layerId) {
            return ko.utils.arrayFirst(this.viewModel.layers(), function(item) {
                return layerId === item.id;
            });
        },
        visibilityToggle: function (e) {
            var layer = this.getLayerById($(e.target).closest('.visibility-toggle').data().layerid);
            layer.active(!layer.active());
        },
        onMapToggle: function (e) {
            var layer = this.getLayerById($(e.target).closest('.on-map-toggle').data().layerid);
            layer.onMap(!layer.onMap());
        },
        layerZoom: function (e) {
            var layer = this.getLayerById($(e.target).closest('.layer-zoom').data().layerid).layer;
            if (layer.getLayers) {
                layer = layer.getLayers().getArray()[0];
            }
            if (layer.getSource) {
                this.map.map.getView().fitExtent(layer.getSource().getExtent(), this.map.map.getSize());
            }
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
    new PageView();
});
