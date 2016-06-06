define(['jquery', 
    'underscore',
    'backbone',
    'bootstrap',
    'arches', 
    'select2',
    'knockout',
    'views/related-resources-graph',
    'resource-types',
    'bootstrap-datetimepicker',
    'plugins/knockout-select2'], 
    function($, _, Backbone, bootstrap, arches, select2, ko, RelatedResourcesGraph, resourceTypes) {

        return Backbone.View.extend({

            events: {
                'click .page-button': 'newPage',
                'click .related-resources-graph': 'showRelatedResouresGraph',
                'click .navigate-map': 'zoomToFeature',
                'mouseover .arches-search-item': 'itemMouseover',
                'mouseout .arches-search-item': 'itemMouseout'
            },

            initialize: function(options) { 
                var self = this;
                _.extend(this, options);

                this.total = ko.observable();
                this.results = ko.observableArray();
                this.page = ko.observable(1);
                this.paginator = ko.observable();

                ko.applyBindings(this, $('#search-results-list')[0]);
                ko.applyBindings(this, $('#search-results-count')[0]);
                ko.applyBindings(this, $('#paginator')[0]);

            },

            showRelatedResouresGraph: function (e) {
                var resourceId = $(e.target).data('resourceid');
                var primaryName = $(e.target).data('primaryname');
                var typeId = $(e.target).data('entitytypeid');
                var searchItem = $(e.target).closest('.arches-search-item');
                var graphPanel = searchItem.find('.arches-related-resource-panel');
                var nodeInfoPanel = graphPanel.find('.node_info');
                if (!graphPanel.hasClass('view-created')) {
                    new RelatedResourcesGraph({
                        el: graphPanel[0],
                        resourceId: resourceId,
                        resourceName: primaryName,
                        resourceTypeId: typeId
                    });
                }
                nodeInfoPanel.hide();
                $(e.target).closest('li').toggleClass('graph-active');
                graphPanel.slideToggle(500);
            },

            newPage: function(evt){
                var data = $(evt.target).data();             
                this.page(data.page);
            },

            updateResults: function(results){
                var self = this;
                this.paginator(results);
                var data = $('div[name="search-result-data"]').data();
                
                this.total(data.results.hits.total);
                self.results.removeAll();
                
                $.each(data.results.hits.hits, function(){
                    var description = resourceTypes[this._source.entitytypeid].defaultDescription;
                    var descriptionNode = resourceTypes[this._source.entitytypeid].descriptionNode;
                    var found = false;
                    $.each(this._source.child_entities, function(i, entity){
                        if (descriptionNode.search('#' + entity.entitytypeid + '#')>0 ){
                            descriptionNode = descriptionNode.replace('#' + entity.entitytypeid + '#', entity.value);
                            found = true;
                        }
                    })
                    $.each(this._source.domains, function(i, entity){
                        if (descriptionNode.search('#' + entity.entitytypeid + '#')>0 ){
                            descriptionNode = descriptionNode.replace('#' + entity.entitytypeid + '#', entity.label);
                            found = true;
                        }
                    })
                    if (found) {
                        // Dokler imamo se kaksen nezamenjan string, ga odstranimo
                        while (descriptionNode.search('#')>0) {
                            drugi_hash = descriptionNode.lastIndexOf('#');
                            prvi_hash = descriptionNode.lastIndexOf('#', drugi_hash-1);
                            druga_vejica = descriptionNode.indexOf(';', drugi_hash);
                            prva_vejica = descriptionNode.lastIndexOf(';', prvi_hash);
                            if (druga_vejica < drugi_hash) {
                                druga_vejica = descriptionNode.length;
                            }
                            if (prva_vejica == -1) {
                                prva_vejica = -2;
                            }
                            descriptionNode = descriptionNode.substring(0, prva_vejica + 2) + descriptionNode.substring(druga_vejica + 2, descriptionNode.length);
                        }
                        if (descriptionNode.slice(-2)=='; ') {
                            descriptionNode = descriptionNode.substring(0, descriptionNode.length -2);
                        }
                        if (descriptionNode.slice(-1)==';') {
                            descriptionNode = descriptionNode.substring(0, descriptionNode.length -1);
                        }
                        description = descriptionNode.replace(';', ',');
                    }

                    self.results.push({
                        primaryname: this._source.primaryname,
                        resourceid: this._source.entityid,
                        entitytypeid: this._source.entitytypeid,
                        description: description,
                        geometries: ko.observableArray(this._source.geometries),
                        typeIcon: resourceTypes[this._source.entitytypeid].icon,
                        typeName: resourceTypes[this._source.entitytypeid].name
                    });
                });

                return data;
            },

            restoreState: function(page){
                if(typeof page !== 'undefined'){
                    this.page(ko.utils.unwrapObservable(page));
                }
            },

            itemMouseover: function(evt){
                if(this.currentTarget !== evt.currentTarget){
                    var data = $(evt.currentTarget).data();
                    this.trigger('mouseover', data.resourceid);    
                    this.currentTarget = evt.currentTarget;              
                }
                return false;    
            },

            itemMouseout: function(evt){
                this.trigger('mouseout');
                delete this.currentTarget;
                return false;
            },

            zoomToFeature: function(evt){
                var data = $(evt.currentTarget).data();
                this.trigger('find_on_map', data.resourceid, data);  
                $('html,body').scrollTop(0);
            }

        });
    });
