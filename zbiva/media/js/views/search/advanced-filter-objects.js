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
		    events: function(){
            	return {
            	    'change #object-feature-level1': 'objectFeatureLevel1Changed',
            	    'change #object-feature-level2': 'objectFeatureLevel2Changed',
            	    'change #object-measurement': 'objectMeasurementChanged'
                }
            },        
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
                    self.toggleFilterSection($('#advanced-filter-objects'), status)
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
                        materials: ko.observableArray(),
                        object_types: ko.observableArray(),
                        object_features: ko.observableArray(),
                        measurement_types: ko.observableArray(),
                        inverted: ko.observable(false),
                        editing:{
                            site_names: {},
                            other_names: {},
                            settlements: {},
                            tus: {},
                            tas: {},
                            regions: {},
                            countries: {},
                            materials: {},
                            object_types: {},
                            object_features: {},
                            measurement_types: {}
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
                            materials: {
                                material_value: '',
                                material_label: ''
                            }, 
                            object_types: {
                                object_type_value: '',
                                object_type_label: ''
                            }, 
                            object_features: {
                                object_feature_value: '',
                                object_feature_label: ''
                            }                       
                       } 
                    },
                    changed: ko.pureComputed(function(){
                        var ret = ko.toJSON(this.query.filter.site_names()) + 
                            ko.toJSON(this.query.filter.other_names()) + 
                            ko.toJSON(this.query.filter.settlements()) + 
                            ko.toJSON(this.query.filter.tus()) + 
                            ko.toJSON(this.query.filter.tas()) + 
                            ko.toJSON(this.query.filter.regions()) + 
                            ko.toJSON(this.query.filter.countries()) + 
                            ko.toJSON(this.query.filter.materials()) + 
                            ko.toJSON(this.query.filter.object_types()) + 
                            ko.toJSON(this.query.filter.object_features()) + 
                            ko.toJSON(this.query.filter.measurement_types()) + 
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
                this.query.filter.materials.subscribe(function(materials){
                    var materialsenabled = materials.length > 0;
                    this.trigger('enabled', materialsenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.object_types.subscribe(function(object_types){
                    var object_typesenabled = object_types.length > 0;
                    this.trigger('enabled', object_typesenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.object_features.subscribe(function(object_features){
                    var object_featuresenabled = object_features.length > 0;
                    this.trigger('enabled', object_featuresenabled, this.query.filter.inverted());
                }, this);
                this.query.filter.measurement_types.subscribe(function(measurement_types){
                    var measurement_typesenabled = measurement_types.length > 0;
                    this.trigger('enabled', measurement_typesenabled, this.query.filter.inverted());
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
                this.material_filter_branchlist = new BranchList({
                    el: $('#material-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'materials',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });                
                this.object_type_filter_branchlist = new BranchList({
                    el: $('#object-type-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'object_types',
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);;
                    }
                });                
                this.object_feature_filter_branchlist = new BranchList({
                    el: $('#object-feature-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'object_features',
                    // Tu izjemoma kontroliramo le končno vrednost (v primeru dvonivojske izbire se programsko vrednost 2. nivoja ne postavi pravilnp)!
                    validateBranch: function (nodes) {
                        var valid = nodes != undefined && nodes.length > 0;
                        console.log(valid);
                        _.each(nodes, function (node) {
                            console.log(node);
                            if (node.entitytypeid === 'OBJECT_FEATURE.E55' && node.entityid === '' && node.value === ''){
                                valid = false;
                                console.log(false);
                            }
                        }, this);
                        return valid;
                    }
                });                
                this.measurement_type_filter_branchlist = new BranchList({
                    el: $('#measurement-type-section')[0],
                    data: this.viewModel,
                    singleEdit: false,
                    dataKey: 'measurement_types',
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
                this.material_filter_branchlist.on('change', function(){
                    self.query.filter.materials.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.materials.push(item);
                    })
                    this.getEditedBranch();
                });
                this.object_type_filter_branchlist.on('change', function(){
                    self.query.filter.object_types.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.object_types.push(item);
                    })
                    this.getEditedBranch();
                });
                this.object_feature_filter_branchlist.on('change', function(){
                    self.query.filter.object_features.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.object_features.push(item);
                    })
                    this.getEditedBranch();
                });
                this.measurement_type_filter_branchlist.on('change', function(){
                    self.query.filter.measurement_types.removeAll();
                    _.each(this.getData(), function(item){
                        self.query.filter.measurement_types.push(item);
                    })
                    this.getEditedBranch();
                });
                //ko.applyBindings(this.query.filter, $('#time-filter')[0]);
                
                // Na začetku najnižji nivo izbire izbrišemo, da ga bo uporabnik izbrak preko ostalih nivojev
                var newValues = [];
                $("#object-feature-level2").select2("destroy").select2({data: newValues}).trigger('change');
                $("#object-feature").select2("destroy").select2({data: newValues}).trigger('change');
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
                    if('materials' in filter && filter.materials.length > 0){
                        _.each(filter.materials, function(filter){
                            this.query.filter.materials.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.material_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('object_types' in filter && filter.object_types.length > 0){
                        _.each(filter.object_types, function(filter){
                            this.query.filter.object_types.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.object_type_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('object_features' in filter && filter.object_features.length > 0){
                        _.each(filter.object_features, function(filter){
                            this.query.filter.object_features.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.object_feature_filter_branchlist.viewModel.branch_lists.push(branch);
                        }, this);
                    }
                    if('measurement_types' in filter && filter.measurement_types.length > 0){
                        _.each(filter.measurement_types, function(filter){
                            this.query.filter.measurement_types.push(filter);
                            var branch = koMapping.fromJS({
                                'editing':ko.observable(false), 
                                'nodes': ko.observableArray(filter.nodes)
                            });
                            this.measurement_type_filter_branchlist.viewModel.branch_lists.push(branch);
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
                console.log('clear');
                this.query.filter.inverted(false);
                this.query.filter.site_names.removeAll();
                this.query.filter.other_names.removeAll();
                this.query.filter.settlements.removeAll();
                this.query.filter.tus.removeAll();
                this.query.filter.tas.removeAll();
                this.query.filter.regions.removeAll();
                this.query.filter.countries.removeAll();
                this.query.filter.materials.removeAll();
                this.query.filter.object_types.removeAll();
                this.query.filter.object_features.removeAll();
                this.query.filter.measurement_types.removeAll();
                this.deleteBranchList(this.site_name_filter_branchlist);
                this.deleteBranchList(this.other_name_filter_branchlist);
                this.deleteBranchList(this.settlement_filter_branchlist);
                this.deleteBranchList(this.tu_filter_branchlist);
                this.deleteBranchList(this.ta_filter_branchlist);
                this.deleteBranchList(this.region_filter_branchlist);
                this.deleteBranchList(this.country_filter_branchlist);
                this.deleteBranchList(this.material_filter_branchlist);
                this.deleteBranchList(this.object_type_filter_branchlist);
                this.deleteBranchList(this.object_feature_filter_branchlist);
                this.deleteBranchList(this.measurement_type_filter_branchlist);
            },
            objectFeatureLevel1Changed: function(evt) {
                if (this.blocked) {
                    return;
                }
                console.log('Sprememba object feature - level 1');
                var master_id = '#object-feature-level1';
                var detail_id = '#object-feature-level2';
                var data_key = 'object_features';
                var master_list = 'OBJECT_FEATURE_LEVEL1.E55'
                var detail_list = 'OBJECT_FEATURE_LEVEL2.E55'
			    var valueMaster = this.$el.find(master_id).val();
                var valueDetail = this.$el.find(detail_id).val();
                console.log('Izbran master ID: ' + valueMaster);
	            var master = '-';
	            _.each(this.object_feature_filter_branchlist.viewModel.branch_lists(), function(branch) {
	                 _.each(branch.nodes(), function (node) {
	                     if (node.entitytypeid() === master_list && valueMaster === node.value()) {
	                        master = node.label();
	                        console.log('Izbran master: ' + node.label() + '(node.value: ' + node.value() + ')');
					     }
				    });
            	});
                var domains = koMapping.fromJS(this.viewModel[data_key].domains[detail_list]);
	        	var newValues = [];
                var detailVpisan = !(valueDetail === '');
	        	if (!detailVpisan) {
				    console.log('Detail še ni vpisan.');
	        	}
                var detailZnotrajMastra = false;
                var naselDetail = false;
                _.each(domains(), function(item){
				    if (item.text() === master) {
                    	var detailsForMaster = item.children();
                    	_.each(detailsForMaster, function(item){
                       		if (detailVpisan && valueDetail === item.id()) {
							    detailZnotrajMastra = true;
			     				console.log('Izbrana detail je že znotraj izbranega mastra.');
		          			}
		          			naselDetail = true;
                          	newValues.push({
                              	id: item.id(),
                              	text: item.text(),
                              	value: item.id(),
                              	label: item.text(),
                              	entitytypeid: detail_list
                         	});
                       	});
		       			if (detailVpisan && !detailZnotrajMastra) {
						    console.log('Izbrana detail je izven izbranega mastra, zato ga pobrišemo.');
						    $(detail_id).select2('data', {id: '', text: '', value: '', label: '', entitytypeid: detail_list}, false);
		       			}
                    }
			    });      
	        	//if (!detailVpisan || !detailZnotrajMastra) {
	        	if (newValues.length>0) {
	        		$(detail_id).select2("destroy").select2({data: newValues}).trigger('change');
				    console.log('Nove vrednosti za detail so vpisane!');
	        	}
	        	// Če nismo našli detaila, poizkusimo še nivo nižje
	        	if (!naselDetail) {
	            	var master_id = '#object-feature-level1';
	            	var middle_detail_id = '#object-feature-level2';
                    var detail_id = '#object-feature';
                    var data_key = 'object_features';
                    var master_list = 'OBJECT_FEATURE_LEVEL1.E55'
                    var master1_list = 'OBJECT_FEATURE_LEVEL2.E55'
                    var detail_list = 'OBJECT_FEATURE.E55'
                    // Shranimo si vrednosti od prejšnjega mastra
                    var valueMaster1 = valueMaster;
                    var labelMaster1 = master;
                    
			        var valueMaster = this.$el.find(master_id).val();
                    var valueDetail = this.$el.find(detail_id).val();
                    console.log('Izbran master ID: ' + valueMaster);
	                var master = '-';
	                _.each(this.object_feature_filter_branchlist.viewModel.branch_lists(), function(branch) {
	                     _.each(branch.nodes(), function (node) {
	                         if (node.entitytypeid() === master_list && valueMaster === node.value()) {
	                            master = node.label();
	                            console.log('Izbran master: ' + node.label() + '(node.value: ' + node.value() + ')');
					         }
				        });
                	});
                    var domains = koMapping.fromJS(this.viewModel[data_key].domains[detail_list]);
	            	var newValues = [];
                    var detailVpisan = !(valueDetail === '');
	            	if (!detailVpisan) {
				        console.log('Detail še ni vpisan.');
	            	}
                    var detailZnotrajMastra = false;
                    var naselDetail = false;
                    _.each(domains(), function(item){
				        if (item.text() === master) {
                        	var detailsForMaster = item.children();
                        	_.each(detailsForMaster, function(item){
                           		if (detailVpisan && valueDetail === item.id()) {
							        detailZnotrajMastra = true;
			         				console.log('Izbrana detail je že znotraj izbranega mastra.');
		              			}
		              			naselDetail = true;
                              	newValues.push({
                                  	id: item.id(),
                                  	text: item.text(),
                                  	value: item.id(),
                                  	label: item.text(),
                                  	entitytypeid: detail_list
                             	});
                           	});
		           			if (detailVpisan && !detailZnotrajMastra) {
						        console.log('Izbrana detail je izven izbranega mastra, zato ga pobrišemo.');
						        $(detail_id).select2('data', {id: '', text: '', value: '', label: '', entitytypeid: detail_list}, false);
		           			}
                        }
			        });      
	            	//if (!detailVpisan || !detailZnotrajMastra) {
	            	if (newValues.length>0) {
	        			$(detail_id).select2("destroy").select2({data: newValues}).trigger('change');
	            		console.log(detail_id);
	            		console.log(newValues);
				        console.log('Nove vrednosti za detail so vpisane!');
				        var newValues1 = [];
				        console.log(valueMaster1);
				        console.log(labelMaster1);
				        console.log(master1_list);
				        console.log(middle_detail_id);
				        newValues1.push({
                                  	id: valueMaster1,
                                  	text: labelMaster1,
                                  	value: valueMaster1,
                                  	label: labelMaster1,
                                  	entitytypeid: master1_list
                             	});
				        $(middle_detail_id).select2("destroy").select2({data: newValues1}).trigger('change');
				        $(middle_detail_id).select2('data', {id: valueMaster1, text: labelMaster1, value: valueMaster1, label: labelMaster1, entitytypeid: master1_list}, false);
	            	}
	        	}
            },
            objectFeatureLevel2Changed: function(evt) {
                if (this.blocked) {
                    return;
                }
                console.log('Sprememba object feature - level 2');
                var masterl1_id = '#object-feature-level1';
                var master_id = '#object-feature-level2';
                var detail_id = '#object-feature';
                var data_key = 'object_features';
                var masterl1_list = 'OBJECT_FEATURE_LEVEL1.E55'
                var master_list = 'OBJECT_FEATURE_LEVEL2.E55'
                var detail_list = 'OBJECT_FEATURE.E55'
			    var valueMasterl1 = this.$el.find(masterl1_id).val();
                var valueMaster = this.$el.find(master_id).val();
                var valueDetail = this.$el.find(detail_id).val();
                console.log('Izbran master ID: ' + valueMaster);
	            var master = '-';
	            var masterl1 = '-';
	            _.each(this.object_feature_filter_branchlist.viewModel.branch_lists(), function(branch) {
	                 _.each(branch.nodes(), function (node) {
	                     if (node.entitytypeid() === masterl1_list && valueMasterl1 === node.value()) {
	                        masterl1 = node.label();
	                        console.log('Izbran masterL1: ' + node.label() + '(node.value: ' + node.value() + ')');
					     }
	                     if (node.entitytypeid() === master_list && valueMaster === node.value()) {
	                        master = node.label();
	                        console.log('Izbran master: ' + node.label() + '(node.value: ' + node.value() + ')');
					     }
				    });
            	});
                var domains = koMapping.fromJS(this.viewModel[data_key].domains[detail_list]);
	        	var newValues = [];
                var detailVpisan = !(valueDetail === '');
	        	if (!detailVpisan) {
				    console.log('Detail še ni vpisan.');
	        	}
                var detailZnotrajMastra = false;
                _.each(domains(), function(item){
				    if (item.text() === masterl1) {
				        var detailsForMasterl1 = item.children();
				        _.each(detailsForMasterl1, function(item){
				            if (item.text() === master) {
                            	var detailsForMaster = item.children();
                            	_.each(detailsForMaster, function(item){
                               		if (detailVpisan && valueDetail === item.id()) {
							            detailZnotrajMastra = true;
			             				console.log('Izbrana detail je že znotraj izbranega mastra.');
		                  			}
                                  	newValues.push({
                                      	id: item.id(),
                                      	text: item.text(),
                                      	value: item.id(),
                                      	label: item.text(),
                                      	entitytypeid: detail_list
                                 	});
                               	});
		               			if (detailVpisan && !detailZnotrajMastra) {
						            console.log('Izbrana detail je izven izbranega mastra, zato ga pobrišemo.');
						            $(detail_id).select2('data', {id: '', text: '', value: '', label: '', entitytypeid: detail_list}, false);
		               			}
                            }
                        });
                    }
			    });      
	        	//if (!detailVpisan || !detailZnotrajMastra) {
	        	    if (newValues.length>0) {
	            		$(detail_id).select2("destroy").select2({data: newValues}).trigger('change');
				        console.log('Nove vrednosti za detail so vpisane!');
				    } else {
				        console.log('Nisem dobil vrednosti, zato detaila ne vpišem');
	                }
	        	//}
            },
            objectMeasurementChanged: function(evt) {
                value = this.$el.find("#object-measurement").val();
                var domains = koMapping.fromJS(this.viewModel['measurement_types'].domains['OBJECT_MEASUREMENT_TYPE.E55']);
            	console.log(domains);
            	var index = 0;
            	var unit = 'cm';
            	_.each(domains(), function(item){
            	    index = index + 1;
            	    if (item.id() === value) {
                    	console.log('Izbrani index: ' + index);
                    	// Enoto izberemo glede na izbrani index (po vrednostih ali nazivih ne moremo - dinamicno oz. prevodi!!!)
                    	if (index === 12 || index === 13 || index === 23) {
                    	    unit = ' ';
                    	}
                    }
			    }); 
                this.$el.find('#measurement-unit-label').text(unit);
                this.$el.find('#measurement-unit-label').val(unit);
                this.$el.find('#measurement-unit-label').change();
                console.log('Measurement changed');
            }
   
        });

});
