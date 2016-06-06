'''
ARCHES - a program developed to inventory and manage immovable cultural heritage.
Copyright (C) 2013 J. Paul Getty Trust and World Monuments Fund

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
'''
from django.conf import settings
import arches.app.models.models as archesmodels
from arches.app.models.edit_history import EditHistory
from arches.app.models.resource import Resource as ArchesResource
from zbiva.models.entity import Entity
from arches.app.search.search_engine_factory import SearchEngineFactory
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
from zbiva.models import forms
from zbiva.models import zbiva_utils
from arches.app.search.elasticsearch_dsl_builder import Query, Bool, Match
from arches.app.views.concept import get_preflabel_from_conceptid
from arches.app.models.forms import DeleteResourceForm
from django.utils.translation import ugettext as _
from django.contrib.gis.geos import GEOSGeometry

class Resource(ArchesResource):
    def __init__(self, *args, **kwargs):
        super(Resource, self).__init__(*args, **kwargs)
        description_group = {
            'id': 'resource-description',
            'icon':'fa-folder',
            'name': _('Resource Description'),
            'forms': [
                forms.RelatedResourcesForm.get_info(),
                forms.ExternalReferenceForm.get_info()
            ]   
        }

        self.form_groups.append(description_group)

        if self.entitytypeid == 'HERITAGE_RESOURCE.E18' or self.entitytypeid == 'SITE.E18' or self.entitytypeid == 'GRAVE.E18' or self.entitytypeid == 'OBJECT.E18':
            description_group['forms'][:0] = [
                forms.SummaryForm.get_info(), 
                forms.DescriptionForm.get_info(),
                forms.LocationForm.get_info(),
                forms.ClassificationForm.get_info(),
                forms.ComponentForm.get_info(),
                forms.MeasurementForm.get_info(),
                forms.ConditionForm.get_info(),
                forms.RelatedFilesForm.get_info(),
            ]

            self.form_groups.append({
                'id': 'evaluate-resource',
                'icon':'fa-dashboard',
                'name': _('Evaluate Resource'),
                'forms': [
                    forms.DesignationForm.get_info(),
                    forms.EvaluationForm.get_info(),
                ]   
            })

        elif self.entitytypeid == 'HERITAGE_RESOURCE_GROUP.E27':
            description_group['forms'][:0] = [
                forms.SummaryForm.get_info(),
                forms.DescriptionForm.get_info(),
                forms.LocationForm.get_info(),
                forms.DistrictClassificationForm.get_info(),
                forms.MeasurementForm.get_info(),
                forms.ConditionForm.get_info(),
                forms.EvaluationForm.get_info(),
                forms.DesignationForm.get_info(),
            ]


        elif self.entitytypeid == 'ACTIVITY.E7':
            description_group['forms'][:0] = [
                forms.ActivitySummaryForm.get_info(),
                forms.DescriptionForm.get_info(),
                forms.LocationForm.get_info(),
                forms.ActivityActionsForm.get_info(),
            ]
     

        elif self.entitytypeid == 'ACTOR.E39':
            description_group['forms'][:0] = [
                forms.ActorSummaryForm.get_info(), 
                forms.DescriptionForm.get_info(),
                forms.LocationForm.get_info(),
                forms.RoleForm.get_info(),
            ]


        elif self.entitytypeid == 'HISTORICAL_EVENT.E5':
            description_group['forms'][:0] = [
                forms.HistoricalEventSummaryForm.get_info(),
                forms.DescriptionForm.get_info(),
                forms.LocationForm.get_info(), 
                forms.PhaseForm.get_info(),
            ]


        elif self.entitytypeid == 'INFORMATION_RESOURCE.E73':
            description_group['forms'][:0] = [
                forms.InformationResourceSummaryForm.get_info(), 
                forms.PublicationForm.get_info(),
                forms.CoverageForm.get_info(),
                forms.DescriptionForm.get_info(),
                forms.FileUploadForm.get_info()
            ]
            #description_group['forms'].append(forms.FileUploadForm.get_info())

            

        if self.entityid != '':
            self.form_groups.append({
                'id': 'manage-resource',
                'icon': 'fa-wrench',
                'name': _('Manage Resource'),
                'forms': [
                    EditHistory.get_info(),
                    DeleteResourceForm.get_info()
                ]
            })
            
    def get_primary_name(self):
        displayname = super(Resource, self).get_primary_name()
        names = self.get_names()
        if len(names) > 0:
            displayname = names[0].value
        return displayname


    def get_names(self):
        """
        Gets the human readable name to display for entity instances

        """

        names = []
        name_nodes = self.find_entities_by_type_id(settings.RESOURCE_TYPE_CONFIGS()[self.entitytypeid]['primary_name_lookup']['entity_type'])
        if len(name_nodes) > 0:
            for name in name_nodes:
                names.append(name)

        return names
        
    def prepare_documents_for_search_index(self):
        """
        Generates a list of specialized resource based documents to support resource search

        """
        # Arches
        
        document = Entity()
        document.property = self.property
        document.entitytypeid = self.entitytypeid
        document.entityid = self.entityid
        document.value = self.value
        document.label = self.label
        document.businesstablename = self.businesstablename
        document.primaryname = self.get_primary_name()
        document.child_entities = []
        document.dates = []
        document.domains = []
        document.geometries = []
        document.numbers = []
        # Zbiva dopolnitev
        document.searchType = self.get_current_type()
        #document.parentName = self.get_parent_name()

        for entity in self.flatten():
            if entity.entityid != self.entityid:
                if entity.businesstablename == 'domains':
                    value = archesmodels.Values.objects.get(pk=entity.value)
                    entity_copy = entity.copy()
                    entity_copy.conceptid = value.conceptid_id
                    document.domains.append(entity_copy)
                elif entity.businesstablename == 'dates':
                    document.dates.append(entity)
                elif entity.businesstablename == 'numbers':
                    document.numbers.append(entity)
                elif entity.businesstablename == 'geometries':
                    entity.value = JSONDeserializer().deserialize(fromstr(entity.value).json)
                    document.geometries.append(entity)
                else:
                    document.child_entities.append(entity)
        return [JSONSerializer().serializeToPython(document)]

    def prepare_documents_for_search_index(self):
        """
        Generates a list of specialized resource based documents to support resource search

        """
        # Arches_hip
        documents = super(Resource, self).prepare_documents_for_search_index()
        for document in documents:
            document['date_groups'] = []
            for nodes in self.get_nodes('BEGINNING_OF_EXISTENCE.E63', keys=['value']):
                document['date_groups'].append({
                    'conceptid': nodes['BEGINNING_OF_EXISTENCE_TYPE_E55__value'],
                    'value': nodes['START_DATE_OF_EXISTENCE_E49__value']
                })

            for nodes in self.get_nodes('END_OF_EXISTENCE.E64', keys=['value']):
                document['date_groups'].append({
                    'conceptid': nodes['END_OF_EXISTENCE_TYPE_E55__value'],
                    'value': nodes['END_DATE_OF_EXISTENCE_E49__value']
                })

            for nodes in self.get_nodes('GRAVE_MEASUREMENT_TYPE.E55', keys=['value','label']):
                # Poiscemo in shranimo le contextid (sicer je v vsakem jeziku drugacna vrednost)
                lang = settings.LANGUAGE_CODE
                se1 = SearchEngineFactory().create()
                context_label1 = '-'
                search_context = {}
                #print 'Iscem podatke za ' + nodes['GRAVE_MEASUREMENT_TYPE_E55__value']
                searchString1 = nodes['GRAVE_MEASUREMENT_TYPE_E55__label']
                query1 = Query(se1, start=0, limit=settings.SEARCH_DROPDOWN_LENGTH)
                boolquery1 = Bool()
                boolquery1.should(Match(field='term', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
                boolquery1.should(Match(field='term.folded', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
                boolquery1.should(Match(field='term.folded', query=searchString1.lower(), fuzziness='AUTO'))
                query1.add_query(boolquery1)
                results1 = query1.search(index='term', doc_type='value')
                conceptid1 = ''
                context1 = ''
                data_type = nodes['GRAVE_MEASUREMENT_TYPE_E55__value']
                for result1 in results1['hits']['hits']:
                    #print result1result1['_source']['ids'][0]
                    conceptid1 = result1['_source']['options']
                    valueid1 = result1['_source']['ids'][0]
                    if nodes['GRAVE_MEASUREMENT_TYPE_E55__value'] == valueid1:
                        #print 'Nasel: ' + conceptid1['conceptid']
                        data_type = conceptid1['conceptid']
                document['value_' + data_type] = float(nodes['VALUE_OF_MEASUREMENT_E60__value'])

            for nodes in self.get_nodes('OBJECT_MEASUREMENT_TYPE.E55', keys=['value','label']):
                # Poiscemo in shranimo le contextid (sicer je v vsakem jeziku drugacna vrednost)
                lang = settings.LANGUAGE_CODE
                se1 = SearchEngineFactory().create()
                context_label1 = '-'
                search_context = {}
                #print 'Iscem podatke za ' + nodes['GRAVE_MEASUREMENT_TYPE_E55__value']
                searchString1 = nodes['OBJECT_MEASUREMENT_TYPE_E55__label']
                query1 = Query(se1, start=0, limit=settings.SEARCH_DROPDOWN_LENGTH)
                boolquery1 = Bool()
                boolquery1.should(Match(field='term', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
                boolquery1.should(Match(field='term.folded', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
                boolquery1.should(Match(field='term.folded', query=searchString1.lower(), fuzziness='AUTO'))
                query1.add_query(boolquery1)
                results1 = query1.search(index='term', doc_type='value')
                conceptid1 = ''
                context1 = ''
                data_type = nodes['OBJECT_MEASUREMENT_TYPE_E55__value']
                for result1 in results1['hits']['hits']:
                    #print result1result1['_source']['ids'][0]
                    conceptid1 = result1['_source']['options']
                    valueid1 = result1['_source']['ids'][0]
                    if nodes['OBJECT_MEASUREMENT_TYPE_E55__value'] == valueid1:
                        #print 'Nasel: ' + conceptid1['conceptid']
                        data_type = conceptid1['conceptid']
                document['value_' + data_type] = float(nodes['VALUE_OF_MEASUREMENT_E60__value'])
            #print document

            #for nodes in self.get_nodes('GRAVE_MEASUREMENT_TYPE.E55', keys=['value']):
            #    document['measurement_groups'].append({
            #        'conceptid': nodes['GRAVE_MEASUREMENT_TYPE_E55__value'],
            #        'value': nodes['VALUE_OF_MEASUREMENT_E60__value']
            #    })

            #for nodes in self.get_nodes('OBJECT_MEASUREMENT_TYPE.E55', keys=['value']):
            #    document['measurement_groups'].append({
            #        'conceptid': nodes['OBJECT_MEASUREMENT_TYPE_E55__value'],
            #        'value': nodes['VALUE_OF_MEASUREMENT_E60__value']
            #    })
            
            if self.entitytypeid == 'HERITAGE_RESOURCE.E18' or self.entitytypeid == 'SITE.E18' or self.entitytypeid == 'GRAVE.E18' or self.entitytypeid == 'OBJECT.E18':
                document['searchType'] = self.get_current_type()
                #document['parentName'] = self.get_parent_name()
                    
                #document_data['designations'] = get_entity_data('TYPE_OF_DESIGNATION_OR_PROTECTION.E55', get_label=True)
                if self.get_nodes('SPATIAL_COORDINATES_GEOMETRY.E47', keys=['value']):
                    point = self.get_nodes('SPATIAL_COORDINATES_GEOMETRY.E47', keys=['value'])[0]['SPATIAL_COORDINATES_GEOMETRY_E47__value']
                    if not isinstance(point, basestring):
                        point = str(point)
                    if point.find('POINT')>=0:
                        lon = point[6:point.find(' ', 7)]
                        #print lon
                        lat = point[point.find(' ',7)+1:point.find(')')]
                        #print lat
                        document['longitude'] = lon
                        document['latitude'] = lat  
                # Pripravimo podatke o letih za izvoz
                najprej = None
                najkasneje = None
                for nodes in self.get_nodes('BEGINNING_OF_EXISTENCE.E63', keys=['value']):
                    najprej = nodes['START_DATE_OF_EXISTENCE_E49__value'][:4]
                for nodes in self.get_nodes('END_OF_EXISTENCE.E64', keys=['value']):
                    najkasneje = nodes['END_DATE_OF_EXISTENCE_E49__value'][:4]
                # !!!Opravljena nadgradnja!!!
                #if najprej:
                #    document['first_date'] = najprej
                #if najkasneje:
                #    document['last_date'] = najkasneje
        
        return documents

    def prepare_documents_for_map_index(self, geom_entities=[]):
        """
        Generates a list of geojson documents to support the display of resources on a map

        """
        
        # Arches

        document1 = []
        if len(geom_entities) > 0:
            geojson_geom = {
                'type': 'GeometryCollection',
                'geometries': [geom_entity['value'] for geom_entity in geom_entities]
            }
            geom = GEOSGeometry(JSONSerializer().serialize(geojson_geom), srid=4326)
             
            if self.entitytypeid == 'SITE.E18':
                primaryname1 = self.get_primary_name() + ', ' + self.get_settlement()
                primaryname2 = primaryname1
            elif self.entitytypeid == 'GRAVE.E18':
                primaryname1 = self.get_site_name() + ', ' + self.get_settlement() + ', ' + self.get_primary_name()
                primaryname2 =  self.get_site_name() + ', ' + self.get_settlement()
            elif self.entitytypeid == 'OBJECT.E18':
                primaryname1 = self.get_site_name() + ', ' + self.get_settlement() + ', ' + self.get_primary_name()
                primaryname2 =  self.get_site_name() + ', ' + self.get_settlement()
            else:
                primaryname1 = self.get_primary_name()
                primaryname2 = primaryname1
            document1 = [{
                'type': 'Feature',
                'id': self.entityid,
                'geometry':  geojson_geom,
                'properties': {
                    'entitytypeid': self.entitytypeid,
                    'primaryname': self.get_primary_name(),
                    'primaryname1': primaryname1,
                    'primaryname2': primaryname2,
                    'centroid': JSONDeserializer().deserialize(geom.centroid.json),
                    'extent': geom.extent,
                    # Zbiva dopolnitev
                    'searchType': self.get_current_type(),
                    #'parentName': self.get_parent_name()
                }
            }]

        documents = document1
        
        # Arches_hip
        
        def get_entity_data(entitytypeid, get_label=False):
            entity_data = _('None specified')
            entity_nodes = self.find_entities_by_type_id(entitytypeid)
            if len(entity_nodes) > 0:
                entity_data = []
                for node in entity_nodes:
                    if get_label:
                        entity_data.append(node.label)
                    else:
                        entity_data.append(node.value)
                entity_data = ', '.join(entity_data)

            return entity_data
                    
                    
        document_data = {}
        
        if self.entitytypeid == 'HERITAGE_RESOURCE.E18' or self.entitytypeid == 'SITE.E18' or self.entitytypeid == 'GRAVE.E18' or self.entitytypeid == 'OBJECT.E18':
            document_data['resource_type'] = get_entity_data('HERITAGE_RESOURCE_TYPE.E55', get_label=True)

            document_data['address'] = _('None specified')
            address_nodes = self.find_entities_by_type_id('PLACE_ADDRESS.E45')
            for node in address_nodes:
                if node.find_entities_by_type_id('ADDRESS_TYPE.E55')[0].label == 'Primary':
                    document_data['address'] = node.value

        if self.entitytypeid == 'HERITAGE_RESOURCE_GROUP.E27':
            document_data['resource_type'] = get_entity_data('HERITAGE_RESOURCE_GROUP_TYPE.E55', get_label=True)

        if self.entitytypeid == 'ACTIVITY.E7':
            document_data['resource_type'] = get_entity_data('ACTIVITY_TYPE.E55', get_label=True)

        if self.entitytypeid == 'HISTORICAL_EVENT.E5':
            document_data['resource_type'] = get_entity_data('HISTORICAL_EVENT_TYPE.E55', get_label=True)

        if self.entitytypeid == 'ACTOR.E39':
            document_data['resource_type'] = get_entity_data('ACTOR_TYPE.E55', get_label=True)

        if self.entitytypeid == 'INFORMATION_RESOURCE.E73':
            document_data['resource_type'] = get_entity_data('INFORMATION_RESOURCE_TYPE.E55', get_label=True)
            document_data['creation_date'] = get_entity_data('DATE_OF_CREATION.E50')
            document_data['publication_date'] = get_entity_data('DATE_OF_PUBLICATION.E50')

        if self.entitytypeid == 'HISTORICAL_EVENT.E5' or self.entitytypeid == 'ACTIVITY.E7' or self.entitytypeid == 'ACTOR.E39':
            document_data['start_date'] = get_entity_data('BEGINNING_OF_EXISTENCE.E63')
            document_data['end_date'] = get_entity_data('END_OF_EXISTENCE.E64')

        if self.entitytypeid == 'HERITAGE_RESOURCE.E18' or self.entitytypeid == 'HERITAGE_RESOURCE_GROUP.E27':
            document_data['designations'] = get_entity_data('TYPE_OF_DESIGNATION_OR_PROTECTION.E55', get_label=True)

        # Zbiva
        if self.entitytypeid == 'GRAVE.E18' or self.entitytypeid == 'OBJECT.E18':
            document_data['site_name'] = get_entity_data('SITE_NAME.E41', get_label=False)
            
        if self.entitytypeid == 'SITE.E18' or self.entitytypeid == 'GRAVE.E18' or self.entitytypeid == 'OBJECT.E18':
            document_data['other_name'] = get_entity_data('OTHER_NAME.E48', get_label=False)
            document_data['settlement'] = get_entity_data('SETTLEMENT.E48', get_label=False)       
            document_data['topographical_unit'] = get_entity_data('TOPOGRAPHICAL_UNIT.E48', get_label=False)       
            document_data['topographical_area'] = get_entity_data('TOPOGRAPHICAL_AREA.E48', get_label=False)       
            document_data['region'] = get_entity_data('REGION.E55', get_label=False)       
            document_data['country'] = get_entity_data('COUNTRY.E55', get_label=False)    

        if self.entitytypeid == 'SITE.E18':
            document_data['finding'] = get_entity_data('FINDING_TYPE.E55', get_label=False)    
            document_data['location_accuracy'] = get_entity_data('LOCATION_ACCURACY.E55', get_label=False)    

        if self.entitytypeid == 'GRAVE.E18':
            document_data['description'] = get_entity_data('GRAVE_DESCRIPTION.E62', get_label=False)    

        if self.entitytypeid == 'OBJECT.E18':
            document_data['object_type'] = get_entity_data('OBJECT_TYPE.E55', get_label=False)    
            document_data['description'] = get_entity_data('OBJECT_DESCRIPTION.E62', get_label=False)    

        for document in documents:
            for key in document_data:
                document['properties'][key] = document_data[key]

        return documents

    def base_prepare_search_index(self, resource_type_id, create=False):
        """
        Creates the settings and mappings in Elasticsearch to support resource search

        """
        index_settings = { 
            'settings':{
                'analysis': {
                    'analyzer': {
                        'folding': {
                            'tokenizer': 'standard',
                            'filter':  [ 'lowercase', 'asciifolding']
                        },
                        'ducet_sort': {
                          'tokenizer': 'standard',
                          'filter': [ 'icu_collation'] 
                        }
                    }
                }
            },
            'mappings': {
                resource_type_id : {
                    'properties' : {
                        'entityid' : {'type' : 'string', 'index' : 'not_analyzed'},
                        'parentid' : {'type' : 'string', 'index' : 'not_analyzed'},
                        'property' : {'type' : 'string', 'index' : 'not_analyzed'},
                        'entitytypeid' : {'type' : 'string', 'index' : 'not_analyzed'},
                        'businesstablename' : {'type' : 'string', 'index' : 'not_analyzed'},
                        'value' : {'type' : 'string', 'index' : 'not_analyzed'},
                        'label' : {'type' : 'string', 'index' : 'not_analyzed'},
                        'primaryname': {'type' : 'string', 'index' : 'not_analyzed'},
                        'child_entities' : { 
                            'type' : 'nested', 
                            'index' : 'analyzed',
                            'properties' : {
                                'entityid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'parentid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'property' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'entitytypeid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'businesstablename' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'label' : {'type' : 'string', 'analyzer': 'ducet_sort'},
                                'value' : {
                                    'type' : 'string',
                                    'index' : 'analyzed',
                                    'fields' : {
                                        'raw' : { 'type' : 'string', 'index' : 'not_analyzed'},
                                        'folded': { 'type': 'string', 'analyzer': 'folding'}
                                    }
                                }
                            }
                        },
                        'domains' : { 
                            'type' : 'nested', 
                            'index' : 'analyzed',
                            'properties' : {
                                'entityid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'parentid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'property' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'entitytypeid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'businesstablename' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'label' : {'type' : 'string', 'analyzer': 'ducet_sort'},
                                'value' : {
                                    'type' : 'string',
                                    'index' : 'analyzed',
                                    'fields' : {
                                        'raw' : { 'type' : 'string', 'index' : 'not_analyzed'}
                                    }
                                },
                                'conceptid' : {'type' : 'string', 'index' : 'not_analyzed'},
                            }
                        },
                        'geometries' : { 
                            'type' : 'nested', 
                            'index' : 'analyzed',
                            'properties' : {
                                'entityid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'parentid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'property' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'entitytypeid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'businesstablename' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'label' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'value' : {
                                    "type": "geo_shape"
                                }
                            }
                        },
                        'dates' : { 
                            'type' : 'nested', 
                            'index' : 'analyzed',
                            'properties' : {
                                'entityid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'parentid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'property' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'entitytypeid' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'businesstablename' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'label' : {'type' : 'string', 'index' : 'not_analyzed'},
                                'value' : {
                                    "type" : "date"
                                }
                            }
                        }
                    }
                }
            }
        }

        if create:
            se = SearchEngineFactory().create()
            try:
                se.create_index(index='entity', body=index_settings)
            except:
                index_settings = index_settings['mappings']
                se.create_mapping(index='entity', doc_type=resource_type_id, body=index_settings)

        return index_settings

    def prepare_search_index(self, resource_type_id, create=False):
        """
        Creates the settings and mappings in Elasticsearch to support resource search

        """

        index_settings = self.base_prepare_search_index(resource_type_id, create=False)

        index_settings['mappings'][resource_type_id]['properties']['date_groups'] = { 
            'properties' : {
                'conceptid': {'type' : 'string', 'index' : 'not_analyzed'}
            }
        }
        
        #index_settings['mappings'][resource_type_id]['properties']['measurement_groups'] = { 
        #    'properties' : {
        #        'conceptid': {'type' : 'string', 'index' : 'not_analyzed'}
        #    }
        #}

        if create:
            se = SearchEngineFactory().create()
            try:
                se.create_index(index='entity', body=index_settings)
            except:
                index_settings = index_settings['mappings']
                se.create_mapping(index='entity', doc_type=resource_type_id, body=index_settings)
        
    @staticmethod
    def get_report(resourceid):
        # get resource data for resource_id from ES, return data
        # with correct id for the given resource type
        return {
            'id': 'heritage-resource',
            'data': {
                'hello_world': 'Hello World!'
            }
        }
        
    def add_child_entity(self, entitytypeid, property, value, entityid):
        """
        Add a child entity to this entity instance

        """   
        #print "zbiva.resource.add_child_entity"  
        node = Entity()
        node.property = property
        node.entitytypeid = entitytypeid
        node.value = value
        node.entityid = entityid
        self.append_child(node)
        return node

    def get_current_type(self):
        return zbiva_utils.get_current_type(self)  
        
    def get_parent_name(self):
        return zbiva_utils.get_parent_name(self)   
        
    def get_settlement(self):
        return zbiva_utils.get_settlement(self) 

    def get_site_name(self):
        return zbiva_utils.get_site_name(self) 
