define(['jquery', 
    'underscore',
    'backbone',
    'bootstrap',
    'arches', 
    'select2',
    'knockout',
    'knockout-mapping', 
    'views/forms/sections/branch-list',
    'resource-types',
    'bootstrap-datetimepicker',
    'plugins/knockout-select2'], 
    function($, _, Backbone, bootstrap, arches, select2, ko, koMapping, BranchList, resourceTypes) {

        return Backbone.View.extend({

            initialize: function(options) { 
                var self = this;
                ko.observableArray.fn.get = function(entitytypeid, key) {
                    var allItems = this();
                    var ret = '';
                    _.each(allItems, function(node){
                        if (entitytypeid.search(node.entitytypeid()) > -1){
                            ret = node[key]();
                        }
                    }, this);
                    return ret
                }

                this._rawdata = ko.toJSON(JSON.parse($('#advancedfilterdata').val()));
                this.viewModel = JSON.parse(this._rawdata);
                this.expanded = ko.observable(false);
                this.expanded.subscribe(function(status){
                    self.toggleFilterSection($('#advanced-filter-sites'), status)
                });

                this.query = {
                    filter:  {
                        domains: this.viewModel.domains,
                        site_names: ko.observableArray(),
                        other_names: ko.observableArray(),
                        settlements: ko.observableArray(),
                        tus: ko.observableArray(),
                        tas: ko.observableArray(),
                        regions: ko.observableArray(),
                        countries: ko.observableArray(),
                        site_features: ko.observableArray(),
                        inverted: ko.observable(false),
                        editing:{
                            site_names: {},
                            other_names: {},
                            settlements: {},
                            tus: {},
                            tas: {},
                            regions: {},
                            countries: {},
                            site_features: {}
                        },
                        defaults:{
                            regions: {
                                region_value: '',
                                region_label: ''
                            },
                            countries: {
                                country_value: '',
                                country_label: ''
                            },
                            site_features: {
                                site_feature_value: '',
                                site_feature_label: ''
                            }                        } 
                    },
                    changed: ko.pureComputed(function(){
                        var ret = ko.toJSON(this.query.filter.site_names()) + 
                            ko.toJSON(this.query.filter.other_names()) + 
                            ko.toJSON(this.query.filter.settlements()) + 
                            ko.toJSON(this.query.filter.tus()) + 
                            ko.toJSON(this.query.filter.tas()) + 
                            ko.toJSON(this.query.filter.regions()) + 
                            ko.toJSON(this.query.filter.countries()) + 
                            ko.toJSON(this.query.filter.site_features()) + 
                            ko.toJSON(this.query.filter.inverted());
                        return ret;
                    }, this).extend({ rateLimit: 200 })
                };
                this.query.filter.site_names.subscribe(function(site_names){
                    var site_namesenabled = site_names.length > 0;
                    this.trigger('enabled', site_namesenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.other_names.subscribe(function(other_names){
                    var other_namesenabled = other_names.length > 0;
                    this.trigger('enabled', other_namesenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.settlements.subscribe(function(settlements){
                    var settlementsenabled = settlements.length > 0;
                    this.trigger('enabled', settlementsenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.tus.subscribe(function(tus){
                    var tusenabled = tus.length > 0;
                    this.trigger('enabled', tusenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.tas.subscribe(function(tas){
                    var tasenabled = tas.length > 0;
                    this.trigger('enabled', tasenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.regions.subscribe(function(regions){
                    var regionsenabled = regions.length > 0;
                    this.trigger('enabled', regionsenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.countries.subscribe(function(countries){
                    var countriesenabled = countries.length > 0;
                    this.trigger('enabled', countriesenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.site_features.subscribe(function(site_features){
                    var site_featuresenabled = site_features.length > 0;
                    this.trigger('enabled', site_featuresenabled, this.query.filter.inverted());
                }, this);

                this.site_name_filter_branchlist = new BranchList({
                    el: $('#site-name-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'site_names',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });
                this.other_name_filter_branchlist = new BranchList({
                    el: $('#other-name-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'other_names',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });
                this.settlement_filter_branchlist = new BranchList({
                    el: $('#settlement-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'settlements',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });
                this.tu_filter_branchlist = new BranchList({
                    el: $('#topographical-unit-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'tus',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });
                this.ta_filter_branchlist = new BranchList({
                    el: $('#topographical-area-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'tas',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });
                this.region_filter_branchlist = new BranchList({
                    el: $('#region-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'regions',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });
                this.country_filter_branchlist = new BranchList({
                    el: $('#country-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'countries',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });
                this.site_feature_filter_branchlist = new BranchList({
                    el: $('#site-feature-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'site_features',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });                

                this.site_name_filter_branchlist.on('change', function(){
                    self.query.filter.site_names.removeAll();
                    console.log('site_name_changed');
                    _.each(this.getData(), function(item){
                        console.log(item);
                        self.query.filter.site_names.push(item);
                    })
                    this.getEditedBranch();
                });
                
                this.other_name_filter_branchlist.on('change', function(){
                    self.query.filter.other_names.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.other_names.push(item);
                    })
                    this.getEditedBranch();
                });
                
                this.settlement_filter_branchlist.on('change', function(){
                    self.query.filter.settlements.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.settlements.push(item);
                    })
                    this.getEditedBranch();
                });
                
                this.tu_filter_branchlist.on('change', function(){
                    self.query.filter.tus.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.tus.push(item);
                    })
                    this.getEditedBranch();
                });
                
                this.ta_filter_branchlist.on('change', function(){
                    self.query.filter.tas.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.tas.push(item);
                    })
                    this.getEditedBranch();
                });
                
                this.region_filter_branchlist.on('change', function(){
                    self.query.filter.regions.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.regions.push(item);
                    })
                    this.getEditedBranch();
                });
                
                this.country_filter_branchlist.on('change', function(){
                    self.query.filter.countries.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.countries.push(item);
                    })
                    this.getEditedBranch();
                });
                
                this.site_feature_filter_branchlist.on('change', function(){
                    self.query.filter.site_features.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.site_features.push(item);
                    })
                    this.getEditedBranch();
                });

                //ko.applyBindings(this.query.filter, $('#time-filter')[0]);
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
                    ele.slideToggle('slow');
                    return;
                }

                if (!showOrHide){
                    ele.slideToggle('slow');                    
                }
            },

            restoreState: function(filter, expanded){
                if(typeof filter !== 'undefined'){
                    if('inverted' in filter){
                        this.query.filter.inverted(filter.inverted);
                    }
                    if('site_names' in filter && filter.site_names.length > 0){
                        _.each(filter.site_names, function(filter){
                            this.query.filter.site_names.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.site_name_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('other_names' in filter && filter.other_names.length > 0){
                        _.each(filter.other_names, function(filter){
                            this.query.filter.other_names.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.other_name_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('settlements' in filter && filter.settlements.length > 0){
                        _.each(filter.settlements, function(filter){
                            this.query.filter.settlements.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.settlement_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('tus' in filter && filter.tus.length > 0){
                        _.each(filter.tus, function(filter){
                            this.query.filter.tus.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.tu_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('tas' in filter && filter.tas.length > 0){
                        _.each(filter.tas, function(filter){
                            this.query.filter.tas.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.ta_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('regions' in filter && filter.regions.length > 0){
                        _.each(filter.regions, function(filter){
                            this.query.filter.regions.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.region_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('countries' in filter && filter.countries.length > 0){
                        _.each(filter.countries, function(filter){
                            this.query.filter.countries.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.country_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('site_features' in filter && filter.site_features.length > 0){
                        _.each(filter.site_features, function(filter){
                            this.query.filter.site_features.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.site_feature_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                }
                // Default setting for advanced filter
                if(typeof expanded === 'undefined'){
                    expanded = true;
                }
                this.expanded(expanded);
            },
            deleteBranchList: function(branchlist) {
                toBeDeleted = [];
                _.each(branchlist.viewModel.branch_lists(), function(branch){
                    toBeDeleted.push(branch);
                }, this);
                _.each(toBeDeleted, function(branch){
                    branchlist.viewModel.branch_lists.remove(branch);
                }, this);
            },
            clear: function(){
                console.log('Clear');
                this.query.filter.inverted(false);
                this.query.filter.site_names.removeAll();
                this.query.filter.other_names.removeAll();
                this.query.filter.settlements.removeAll();
                this.query.filter.tus.removeAll();
                this.query.filter.tas.removeAll();
                this.query.filter.regions.removeAll();
                this.query.filter.countries.removeAll();
                this.query.filter.site_features.removeAll();
                this.deleteBranchList(this.site_name_filter_branchlist);
                this.deleteBranchList(this.other_name_filter_branchlist);
                this.deleteBranchList(this.settlement_filter_branchlist);
                this.deleteBranchList(this.tu_filter_branchlist);
                this.deleteBranchList(this.ta_filter_branchlist);
                this.deleteBranchList(this.region_filter_branchlist);
                this.deleteBranchList(this.country_filter_branchlist);
                this.deleteBranchList(this.site_feature_filter_branchlist);
            }

        });

});
