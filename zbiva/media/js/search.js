require(['jquery', 
    'underscore',
    'backbone',
    'bootstrap',
    'arches', 
    'select2',
    'views/search/term-filter', 
    'views/search/map-filter',
    'views/search/time-filter',
    'views/search/advanced-filter-sites',
    'views/search/advanced-filter-graves',
    'views/search/advanced-filter-objects',
    'views/search/search-results-zbiva',
    'knockout',
    'plugins/bootstrap-slider/bootstrap-slider.min',
    'views/forms/sections/branch-list',
    'resource-types',
    'openlayers',
    'bootstrap-datetimepicker',
    'plugins/knockout-select2'], 
    function($, _, Backbone, bootstrap, arches, select2, TermFilter, MapFilter, TimeFilter, AdvancedFilterSites, AdvancedFilterGraves, AdvancedFilterObjects, SearchResults, ko, Slider, BranchList, resourceTypes, ol) {
    $(document).ready(function() {
        var wkt = new ol.format.WKT();

        var SearchView = Backbone.View.extend({
            el: $('body'),
            updateRequest: '',

            events: {
                'click #view-head-circlets': 'showHeadCirclets',
                'click #view-beads': 'showBeads',
                'click #clear-search': 'clear',
                'click #map-filter-button': 'toggleMapFilter',
                'click #time-filter-button': 'toggleTimeFilter',
                'click #advanced-filter-button': 'toggleAdvancedFilter',
                'click a.dataexport': 'exportSearch'
            },

            initialize: function(options) { 
                console.log('init');
                var mapFilterText, timeFilterText, advancedFilterText;
                var self = this;
                this.termFilter = new TermFilter({
                    el: $.find('input.resource_search_widget')[0]
                });
                this.termFilter.on('change', function(){
                    if($('#saved-searches').is(":visible")){
                        this.hideSavedSearches();
                    }
                }, this);
                this.termFilter.on('filter-removed', function(item){
                    if(item.text === mapFilterText){
                        this.mapFilter.clear();
                    }
                    if(item.text === timeFilterText){
                        this.timeFilter.clear();
                    }
                    if (item.text === advancedFilterText) {
                        this.advancedFilter.clear();
                    }
                }, this);
                this.termFilter.on('filter-inverted', function(item){
                    if(item.text === mapFilterText){
                        this.mapFilter.query.filter.inverted(item.inverted);
                    }
                    if(item.text === timeFilterText){
                        this.timeFilter.query.filter.inverted(item.inverted);
                    }
                    if(item.text === advancedFilterText){
                        this.advancedFilter.query.filter.inverted(item.inverted);
                    }
                }, this);


                this.mapFilter = new MapFilter({
                    el: $('#map-filter-container')[0]
                });
                this.mapFilter.on('enabled', function(enabled, inverted){
                    if(enabled){
                        this.termFilter.addTag(mapFilterText, inverted);
                    }else{
                        this.termFilter.removeTag(mapFilterText);
                    }
                }, this);


                this.timeFilter = new TimeFilter({
                    el: $('#time-filter-container')[0]
                });
                this.timeFilter.on('enabled', function(enabled, inverted){
                    if(enabled){
                        this.termFilter.addTag(timeFilterText, inverted);
                    }else{
                        this.termFilter.removeTag(timeFilterText);
                    }
                }, this);

                searchType = $("#search_type").val();

                if (searchType === 'Site') {
                    this.advancedFilter = new AdvancedFilterSites({
                        el: $('#advanced-filter-container')[0]
                    });
                } else if (searchType === 'Grave') {
                    this.advancedFilter = new AdvancedFilterGraves({
                        el: $('#advanced-filter-container')[0]
                    });
                } else if (searchType === 'Object') {
                    this.advancedFilter = new AdvancedFilterObjects({
                        el: $('#advanced-filter-container')[0]
                    });
                } else {
                    this.advancedFilter = null;
                }
                if (searchType != 'Search') {
                    this.advancedFilter.on('enabled', function(enabled, inverted){
                        if(enabled){
                            this.termFilter.addTag(advancedFilterText, inverted);
                        }else{
                            this.termFilter.removeTag(advancedFilterText);
                        }
                    }, this);
                }

                this.searchResults = new SearchResults({
                    el: $('#search-results-container')[0]
                });
                this.searchResults.on('mouseover', function(resourceid){
                    this.mapFilter.selectFeatureById(resourceid);
                }, this);
                this.searchResults.on('mouseout', function(){
                    this.mapFilter.unselectAllFeatures();
                }, this);
                this.searchResults.on('find_on_map', function(resourceid, data){
                    var extent,
                        expand = !this.mapFilter.expanded();
                    if (expand) {
                        this.mapFilter.expanded(true);
                    }
                    
                    _.each(data.geometries, function (geometryData) {
                        var geomExtent = wkt.readGeometry(geometryData.label).getExtent();
                        geomExtent = ol.extent.applyTransform(geomExtent, ol.proj.getTransform('EPSG:4326', 'EPSG:3857'));
                        extent = extent ? ol.extent.extend(extent, geomExtent) : geomExtent;
                    });
                    if (extent) {
                        _.delay(function() {
                            self.mapFilter.zoomToExtent(extent);
                        }, expand ? 700 : 0);
                    }
                }, this);

                mapFilterText = this.mapFilter.$el.data().filtertext;
                timeFilterText = this.timeFilter.$el.data().filtertext;
                if (searchType != 'Search') {
                    advancedFilterText = this.advancedFilter.$el.data().filtertext;
                } else {
                    advancedFilterText = '';
                }
                self.isNewQuery = true;
                this.searchQuery = {
                    queryString: function(){
                        var params = {
                            page: self.searchResults.page(),
                            termFilter: ko.toJSON(self.termFilter.query.filter.terms()),
                            temporalFilter: ko.toJSON({
                                year_min_max: self.timeFilter.query.filter.year_min_max(),
                                filters: self.timeFilter.query.filter.filters(),
                                inverted: self.timeFilter.query.filter.inverted()
                            }),
                            advancedFilter: ko.toJSON(
                                (searchType == 'Site') ? {
                                site_names: self.advancedFilter.query.filter.site_names(),
                                other_names: self.advancedFilter.query.filter.other_names(),
                                settlements: self.advancedFilter.query.filter.settlements(),
                                tus: self.advancedFilter.query.filter.tus(),
                                tas: self.advancedFilter.query.filter.tas(),
                                regions: self.advancedFilter.query.filter.regions(),
                                countries: self.advancedFilter.query.filter.countries(),
                                site_features: self.advancedFilter.query.filter.site_features(),
                                inverted: self.advancedFilter.query.filter.inverted()
                            } : (searchType == 'Grave') ? { 
                                site_names: self.advancedFilter.query.filter.site_names(),
                                other_names: self.advancedFilter.query.filter.other_names(),
                                settlements: self.advancedFilter.query.filter.settlements(),
                                tus: self.advancedFilter.query.filter.tus(),
                                tas: self.advancedFilter.query.filter.tas(),
                                regions: self.advancedFilter.query.filter.regions(),
                                countries: self.advancedFilter.query.filter.countries(),
                                grave_features: self.advancedFilter.query.filter.grave_features(),
                                body_features: self.advancedFilter.query.filter.body_features(),
                                measurement_types: self.advancedFilter.query.filter.measurement_types(),
                                inverted: self.advancedFilter.query.filter.inverted()
                            } : (searchType == 'Object') ? { 
                                site_names: self.advancedFilter.query.filter.site_names(),
                                other_names: self.advancedFilter.query.filter.other_names(),
                                settlements: self.advancedFilter.query.filter.settlements(),
                                tus: self.advancedFilter.query.filter.tus(),
                                tas: self.advancedFilter.query.filter.tas(),
                                regions: self.advancedFilter.query.filter.regions(),
                                countries: self.advancedFilter.query.filter.countries(),
                                materials: self.advancedFilter.query.filter.materials(),
                                object_types: self.advancedFilter.query.filter.object_types(),
                                object_features: self.advancedFilter.query.filter.object_features(),
                                measurement_types: self.advancedFilter.query.filter.measurement_types(),
                                inverted: self.advancedFilter.query.filter.inverted()
                            } : {
                            }),
                            spatialFilter: ko.toJSON(self.mapFilter.query.filter),
                            mapExpanded: self.mapFilter.expanded(),
                            timeExpanded: self.timeFilter.expanded(),
                            advancedExpanded: (searchType != 'Search' ? self.advancedFilter.expanded() : {}),
                            searchType: searchType
                        };
                        if (searchType == 'Site') {
                            if (self.termFilter.query.filter.terms().length === 0 &&
                                self.timeFilter.query.filter.year_min_max().length === 0 &&
                                self.timeFilter.query.filter.filters().length === 0 &&
                                self.mapFilter.query.filter.geometry.coordinates().length === 0 &&
                                self.advancedFilter.query.filter.site_names().length === 0 &&
                                self.advancedFilter.query.filter.other_names().length === 0 &&
                                self.advancedFilter.query.filter.settlements().length === 0 &&
                                self.advancedFilter.query.filter.tus().length === 0 &&
                                self.advancedFilter.query.filter.tas().length === 0 &&
                                self.advancedFilter.query.filter.regions().length === 0 &&
                                self.advancedFilter.query.filter.countries().length === 0 &&
                                self.advancedFilter.query.filter.site_features().length === 0) {
                                params.no_filters = true;
                            }
                        } else if (searchType == 'Grave') {
                            if (self.termFilter.query.filter.terms().length === 0 &&
                                self.timeFilter.query.filter.year_min_max().length === 0 &&
                                self.timeFilter.query.filter.filters().length === 0 &&
                                self.mapFilter.query.filter.geometry.coordinates().length === 0 &&
                                self.advancedFilter.query.filter.site_names().length === 0 &&
                                self.advancedFilter.query.filter.other_names().length === 0 &&
                                self.advancedFilter.query.filter.settlements().length === 0 &&
                                self.advancedFilter.query.filter.tus().length === 0 &&
                                self.advancedFilter.query.filter.tas().length === 0 &&
                                self.advancedFilter.query.filter.regions().length === 0 &&
                                self.advancedFilter.query.filter.countries().length === 0 &&
                                self.advancedFilter.query.filter.grave_features().length === 0 &&
                                self.advancedFilter.query.filter.body_features().length === 0 &&
                                self.advancedFilter.query.filter.measurement_types().length === 0) {
                                params.no_filters = true;
                            }
                        } else if (searchType == 'Object') {
                            if (self.termFilter.query.filter.terms().length === 0 &&
                                self.timeFilter.query.filter.year_min_max().length === 0 &&
                                self.timeFilter.query.filter.filters().length === 0 &&
                                self.mapFilter.query.filter.geometry.coordinates().length === 0 &&
                                self.advancedFilter.query.filter.site_names().length === 0 &&
                                self.advancedFilter.query.filter.other_names().length === 0 &&
                                self.advancedFilter.query.filter.settlements().length === 0 &&
                                self.advancedFilter.query.filter.tus().length === 0 &&
                                self.advancedFilter.query.filter.tas().length === 0 &&
                                self.advancedFilter.query.filter.regions().length === 0 &&
                                self.advancedFilter.query.filter.countries().length === 0 &&
                                self.advancedFilter.query.filter.materials().length === 0 &&
                                self.advancedFilter.query.filter.object_types().length === 0 &&
                                self.advancedFilter.query.filter.object_features().length === 0 &&
                                self.advancedFilter.query.filter.measurement_types().length === 0) {
                                params.no_filters = true;
                            }
                        } else {
                            if (self.termFilter.query.filter.terms().length === 0 &&
                                self.timeFilter.query.filter.year_min_max().length === 0 &&
                                self.timeFilter.query.filter.filters().length === 0 &&
                                self.mapFilter.query.filter.geometry.coordinates().length === 0) {
                                params.no_filters = true;
                            }
                        }
                        params.include_ids = self.isNewQuery;
                        return $.param(params).split('+').join('%20');
                    },
                    changed: ko.pureComputed(function(){
                        var ret = ko.toJSON(this.termFilter.query.changed()) +
                            ko.toJSON(this.timeFilter.query.changed()) +
                            ko.toJSON(this.mapFilter.query.changed());
                        if (searchType != 'Search') {
                            ret = ret + ko.toJSON(this.advancedFilter.query.changed());
                        }
                        return ret;
                    }, this).extend({ rateLimit: 200 })
                };

                this.getSearchQuery();

                this.searchResults.page.subscribe(function(){
                    self.doQuery();
                });

                this.searchQuery.changed.subscribe(function(){
                    self.isNewQuery = true;
                    self.searchResults.page(1);
                    self.doQuery();
                });
            },

            doQuery: function () {
                console.log('doQuery');
                var self = this;
                var queryString = this.searchQuery.queryString();
                if (this.updateRequest) {
                    this.updateRequest.abort();
                }

                $('.loading-mask').show();
                window.history.pushState({}, '', '?'+queryString);
                this.updateRequest = $.ajax({
                    type: "GET",
                    url: arches.urls.search_results,
                    data: queryString,
                    success: function(results){
                        var data = self.searchResults.updateResults(results);
                        self.mapFilter.highlightFeatures(data, $('.search-result-all-ids').data('results'));
                        self.mapFilter.applyBuffer();
                        self.isNewQuery = false;
                        $('.loading-mask').hide();
                    },
                    error: function(){}
                });
            },

            showHeadCirclets: function(){
                this.clear();
                console.log('sHC');
                $('#search-results-count').slideUp('slow');
                $('#search-results-container').slideUp('slow');
                this.hideBeads();
                $('#head-circlets').slideDown('slow');
                this.mapFilter.expanded(false);
                this.timeFilter.expanded(false);
                this.advancedFilter.expanded(false);
            },
            showBeads: function(){
                this.clear();
                console.log('sB');
                $('#search-results-count').slideUp('slow');
                $('#search-results-container').slideUp('slow');
                this.hideHeadCirclets();
                $('#beads').slideDown('slow');
                this.mapFilter.expanded(false);
                this.timeFilter.expanded(false);
                this.advancedFilter.expanded(false);
            },
            hideHeadCirclets: function(){
                $('#head-circlets').slideUp('slow');
                $('#search-results').slideDown('slow');
            },
            hideBeads: function(){
                $('#beads').slideUp('slow');
                $('#search-results').slideDown('slow');
            },
            hideSavedSearches: function(){
                this.hideHeadCirclets();
                this.hideBeads();
            },

            toggleMapFilter: function(){
                console.log('tMF');
                if($('#saved-searches').is(":visible")){
                    console.log('toggleMapFilter');
                    this.doQuery();
                    this.hideSavedSearches();
                }
                this.mapFilter.expanded(!this.mapFilter.expanded());
                window.history.pushState({}, '', '?'+this.searchQuery.queryString());
            },

            toggleTimeFilter: function(){
                console.log('tTF');
                if($('#saved-searches').is(":visible")){
                    console.log('toggleTimeFilter');
                    this.doQuery();
                    this.hideSavedSearches();
                }
                this.timeFilter.expanded(!this.timeFilter.expanded());
                window.history.pushState({}, '', '?'+this.searchQuery.queryString());
            },
            
            toggleAdvancedFilter: function(){
                console.log('tAF');
                if($('#saved-searches').is(":visible")){
                    console.log('toggleAdvancedFilter');
                    this.doQuery();
                    this.hideSavedSearches();
                }
                this.advancedFilter.expanded(!this.advancedFilter.expanded());
                window.history.pushState({}, '', '?'+this.searchQuery.queryString());
            },

            getSearchQuery: function(){
                var doQuery = false;
                console.log('gSQ');
                var query = _.chain(decodeURIComponent(location.search).slice(1).split('&') )
                    // Split each array item into [key, value]
                    // ignore empty string if search is empty
                    .map(function(item) { if (item) return item.split('='); })
                    // Remove undefined in the case the search is empty
                    .compact()
                    // Turn [key, value] arrays into object parameters
                    .object()
                    // Return the value of the chain operation
                    .value();
                if('page' in query){
                    query.page = JSON.parse(query.page);
                    doQuery = true;
                }
                this.searchResults.restoreState(query.page);


                if('termFilter' in query){
                    query.termFilter = JSON.parse(query.termFilter);
                    doQuery = true;
                }
                this.termFilter.restoreState(query.termFilter);


                if('temporalFilter' in query){
                    query.temporalFilter = JSON.parse(query.temporalFilter);
                    doQuery = true;
                }
                if('advancedFilter' in query){
                    query.advancedFilter = JSON.parse(query.advancedFilter);
                    doQuery = true;
                }
                if('timeExpanded' in query){
                    query.timeExpanded = JSON.parse(query.timeExpanded);
                    doQuery = true;
                }
                this.timeFilter.restoreState(query.temporalFilter, query.timeExpanded);
                
                if (searchType != 'Search') {
                    if('advancedExpanded' in query){
                        query.advancedExpanded = JSON.parse(query.advancedExpanded);
                        doQuery = true;
                    }
                    this.advancedFilter.restoreState(query.advancedFilter, query.advancedExpanded);
                }
                 
                if('spatialFilter' in query){
                    query.spatialFilter = JSON.parse(query.spatialFilter);
                    doQuery = true;
                }
                if('mapExpanded' in query){
                    query.mapExpanded = JSON.parse(query.mapExpanded);
                    doQuery = true;
                }
                this.mapFilter.restoreState(query.spatialFilter, query.mapExpanded);
                

                if(doQuery){
                    console.log('getSearchQuery');
                    this.doQuery();
                    this.hideSavedSearches();
                }
                
            },

            clear: function(){
                this.mapFilter.clear();
                this.timeFilter.clear();
                this.advancedFilter.clear();
                this.termFilter.clear();
            },

            exportSearch: function(e) {
                var export_format = e.currentTarget.id,
                    _href = $("a.dataexport").attr("href"),
                    format = 'export=' + export_format,
                    params_with_page = this.searchQuery.queryString(),
                    page_number_regex = /page=[0-9]+/;
                    params = params_with_page.replace(page_number_regex, format);
                $("a.dataexport").attr("href", arches.urls.search_results_export + '?' + params);
            }
        });
        new SearchView();
    });
});
