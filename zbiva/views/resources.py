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
import urllib
import urlparse
import os
import re
from django.template import RequestContext
from django.shortcuts import render_to_response, redirect
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import permission_required
from django.conf import settings
from django.db import transaction
from arches.app.models import models
from zbiva.models.concept import Concept
from zbiva.models.resource import Resource
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
from arches.app.utils.JSONResponse import JSONResponse
from arches.app.views.concept import get_preflabel_from_valueid
from arches.app.views.concept import get_preflabel_from_conceptid
from arches.app.views.resources import get_related_resources
from arches.app.search.search_engine_factory import SearchEngineFactory
from arches.app.search.elasticsearch_dsl_builder import Query, Terms, Bool, Match
from django.db.models import Max, Min
from django.http import HttpResponseNotFound
from django.contrib.gis.geos import GEOSGeometry
import elasticsearch

@permission_required('edit')
@csrf_exempt
def resource_manager(request, resourcetypeid='', form_id='default', resourceid=''):

    if resourceid != '':
        resource = Resource(resourceid)
    elif resourcetypeid != '':
        resource = Resource({'entitytypeid': resourcetypeid})

    if form_id == 'default':
        form_id = resource.form_groups[0]['forms'][0]['id']

    form = resource.get_form(form_id)
    if request.method == 'DELETE':
        resource.delete_index()
        se = SearchEngineFactory().create()
        realtionships = resource.get_related_resources(return_entities=False)
        for realtionship in realtionships:
            se.delete(index='resource_relations', doc_type='all', id=realtionship.resourcexid)
            realtionship.delete()
        resource.delete()
        return JSONResponse({ 'success': True })

    if request.method == 'POST':
        data = JSONDeserializer().deserialize(request.POST.get('formdata', {}))
        form.update(data, request.FILES)

        with transaction.atomic():
            if resourceid != '':
                resource.delete_index()
            resource.save(user=request.user)
            resource.index()
            resourceid = resource.entityid

            return redirect('resource_manager', resourcetypeid=resourcetypeid, form_id=form_id, resourceid=resourceid)

    min_max_dates = models.Dates.objects.aggregate(Min('val'), Max('val'))
    
    if request.method == 'GET':
        if form != None:
            lang = request.GET.get('lang', request.LANGUAGE_CODE)
            print request.LANGUAGE_CODE
            if lang == 'en':
                lang = 'en-US'
            print lang
            form.load(lang)
            return render_to_response('resource-manager.htm', {
                    'form': form,
                    'formdata': JSONSerializer().serialize(form.data),
                    'form_template': 'views/forms/' + form_id + '.htm',
                    'form_id': form_id,
                    'resourcetypeid': resourcetypeid,
                    'resourceid': resourceid,
                    'main_script': 'resource-manager',
                    'active_page': 'ResourceManger',
                    'resource': resource,
                    'resource_name': resource.get_primary_name(),
                    'resource_type_name': resource.get_type_name(),
                    'form_groups': resource.form_groups,
                    'min_date': min_max_dates['val__min'].year if min_max_dates['val__min'] != None else 0,
                    'max_date': min_max_dates['val__max'].year if min_max_dates['val__min'] != None else 1,
                    'timefilterdata': JSONSerializer().serialize(Concept.get_time_filter_data(lang)),
                },
                context_instance=RequestContext(request))
        else:
            return HttpResponseNotFound('<h1>Arches form not found.</h1>')
          
def report(request, resourceid):
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    print 'Jezik:'
    if lang == 'en':
       lang = 'en-US'
    print lang
    se = SearchEngineFactory().create()
    try:
        report_info = se.search(index='resource', id=resourceid)
    except elasticsearch.ElasticsearchException as es1:
        if es1[0] == 404:
            result = JSONDeserializer().deserialize(es1[1])
            if not result['found']:
                return render_to_response('404.htm', {
                    'main_script': '404',
                    'active_page': '404'
                },
                context_instance=RequestContext(request))
    #print report_info
    report_info['source'] = report_info['_source']
    report_info['type'] = report_info['_type']
    report_info['source']['graph'] = report_info['source']['graph']
    del report_info['_source']
    del report_info['_type']

    def get_evaluation_path(valueid):
        value = models.Values.objects.get(pk=valueid)
        concept_graph = Concept().get(id=value.conceptid_id, include_subconcepts=False, 
            include_parentconcepts=True, include_relatedconcepts=False, up_depth_limit=None, lang=lang)
        
        paths = []
        for path in concept_graph.get_paths(lang=lang)[0]:
            if path['label'] != 'Arches' and path['label'] != 'Evaluation Criteria Type':
                paths.append(path['label'])
        return '; '.join(paths)


    concept_label_ids = set()
    uuid_regex = re.compile('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
    # gather together all uuid's referenced in the resource graph
    def crawl(items):
        for item in items:
            for key in item:
                if isinstance(item[key], list):
                    crawl(item[key])
                else:
                    if isinstance(item[key], basestring) and uuid_regex.match(item[key]):
                        if key == 'EVALUATION_CRITERIA_TYPE_E55__value':
                            item[key] = get_evaluation_path(item[key])
                        concept_label_ids.add(item[key])

    crawl([report_info['source']['graph']])

    # get all the concept labels from the uuid's
    concept_labels = se.search(index='concept_labels', id=list(concept_label_ids))

    # convert all labels to their localized prefLabel
    temp = {}
    if concept_labels != None:
        for concept_label in concept_labels['docs']:
            #temp[concept_label['_id']] = concept_label
            if concept_label['found']:
                # the resource graph already referenced the preferred label in the desired language
                if concept_label['_source']['type'] == 'prefLabel' and concept_label['_source']['language'] == lang:
                    temp[concept_label['_id']] = concept_label['_source']
                else: 
                    # the resource graph referenced a non-preferred label or a label not in our target language, so we need to get the right label
                    temp[concept_label['_id']] = get_preflabel_from_conceptid(concept_label['_source']['conceptid'], lang)
         
    # replace the uuid's in the resource graph with their preferred and localized label                    
    def crawl_again(items):
        for item in items:
            for key in item:
                if isinstance(item[key], list):
                    crawl_again(item[key])
                else:
                    if isinstance(item[key], basestring) and uuid_regex.match(item[key]):
                        try:
                            item[key] = temp[item[key]]['value']
                        except:
                            pass

    crawl_again([report_info['source']['graph']])
    
    # Podatke na visjih nivojih, ki zdruzujejo vec razlicnih nivojev, prestavimo na prvi nivo
    # To je potrebno zato, ker sicer ne moremo skrivati posameznih sklopov iz skupinske veje
    keys = ['REGION_E55','COUNTRY_E55','OTHER_NAME_E48','SETTLEMENT_E48','TOPOGRAPHICAL_UNIT_E48', 'TOPOGRAPHICAL_AREA_E48',
            'PLACE_ADDRESS_E45','PLACE_CADASTRAL_REFERENCE_E53',
            'ADMINISTRATIVE_SUBDIVISION_E48']
    old_key = 'PLACE_E53'
    for key in keys:
        if old_key in report_info['source']['graph']: 
            for data in report_info['source']['graph'][old_key]:
                if key in data:
                    if key not in report_info['source']['graph']:
                       report_info['source']['graph'][key] = []
                    report_info['source']['graph'][key].append(data.pop(key)[0])
    keys = ['SETTING_TYPE_E55','DESCRIPTION_OF_LOCATION_E62']
    old_key = 'PLACE_SITE_LOCATION_E53'
    old_key1 = 'PLACE_E53'
    for key in keys:
        if old_key1 in report_info['source']['graph']: 
            for data in report_info['source']['graph'][old_key1]:
                if old_key in data:
                    if key in data[old_key][0]:
                        if key not in report_info['source']['graph']:
                            report_info['source']['graph'][key] = []
                        report_info['source']['graph'][key].append(data[old_key][0].pop(key)[0])
    keys = ['DESCRIPTION_OF_LOCATION_E62']
    old_key = 'SPATIAL_COVERAGE_E53'
    old_key1 = 'PLACE_E53'
    for key in keys:
        if old_key1 in report_info['source']['graph']: 
            for data in report_info['source']['graph'][old_key1]:
                if old_key in data:
                    if key in data[old_key][0]:
                        if key not in report_info['source']['graph']:
                            report_info['source']['graph'][key] = []
                        report_info['source']['graph'][key].append(data[old_key][0].pop(key)[0])
    keys = ['BODY_CODE_E42','AGE_MIN_E16','AGE_MAX_E16','BODY_FEATURE_E55','BODY_DESCRIPTION_E62']
    old_key = 'BODY_E21'
    for key in keys:
        if old_key in report_info['source']['graph']: 
            for data in report_info['source']['graph'][old_key]:
                if key in data:
                    if key not in report_info['source']['graph']:
                       report_info['source']['graph'][key] = []
                    report_info['source']['graph'][key].append(data.pop(key)[0])
    
    # Vsem stevilcnim podatkom spremenimo pike v vejice (Arches shrani podatke v string, ceprav je v grafu number!)
    #keys = ['GRAVE_MEASUREMENT_TYPE_E55','OBJECT_MEASUREMENT_TYPE_E55']
    #numbers = ['VALUE_OF_MEASUREMENT_E60__value']
    #for key in keys:
    #    if key in report_info['source']['graph']: 
    #        for data in report_info['source']['graph'][key]:
    #            for number in numbers:
    #                if number in data:
    #                    data[number] = data[number].replace('.',',')

    # Vse datumske podatke spremenimo le v leta 
    if 'BEGINNING_OF_EXISTENCE_E63' in report_info['source']['graph']:
        for data in report_info['source']['graph']['BEGINNING_OF_EXISTENCE_E63']:
            for data1 in data['BEGINNING_OF_EXISTENCE_TIME___SPAN_E52']:
                if 'START_DATE_OF_EXISTENCE_E49' in data1:
                    for data2 in data1['START_DATE_OF_EXISTENCE_E49']:
                        if 'START_DATE_OF_EXISTENCE_E49__value' in data2:
                            data2['START_DATE_OF_EXISTENCE_E49__value'] = data2['START_DATE_OF_EXISTENCE_E49__value'][:4].lstrip("0")
    if 'END_OF_EXISTENCE_E64' in report_info['source']['graph']:
        for data in report_info['source']['graph']['END_OF_EXISTENCE_E64']:
            for data1 in data['END_OF_EXISTENCE_TIME___SPAN_E52']:
                if 'END_DATE_OF_EXISTENCE_E49' in data1:
                    for data2 in data1['END_DATE_OF_EXISTENCE_E49']:
                        if 'END_DATE_OF_EXISTENCE_E49__value' in data2:
                            data2['END_DATE_OF_EXISTENCE_E49__value'] = data2['END_DATE_OF_EXISTENCE_E49__value'][:4].lstrip("0")

    
    #print report_info
    #return JSONResponse(report_info, indent=4)

    related_resource_dict = {
        'HERITAGE_RESOURCE': [],
        'HERITAGE_RESOURCE_GROUP': [],
        'ACTIVITY': [],
        'ACTOR': [],
        'HISTORICAL_EVENT': [],
        'INFORMATION_RESOURCE_IMAGE': [],
        'INFORMATION_RESOURCE_DOCUMENT': [],
        'SITE': [],
        'GRAVE': [],
        'OBJECT': []
    }

    related_resource_info = get_related_resources(resourceid, lang)

    # parse the related entities into a dictionary by resource type
    for related_resource in related_resource_info['related_resources']:
        information_resource_type = 'DOCUMENT'
        related_resource['relationship'] = []
        # Predpostavka, da so v information resources samo zahtevani podatki, sicer je potrebno parsati tudi to
        #print 'Leto izdaje:'
        #if related_resource['dates']:
            #print related_resource['dates'][0]['value'][:4]
            #related_resource['pub_year'] = related_resource['dates'][0]['value'][:4]
        for child in related_resource['child_entities']:
            if child['entitytypeid'] == 'TITLE.E41':
                #print 'Naslov:'
                #print child['label']
                related_resource['title'] = child['label']
            elif child['entitytypeid'] == 'PUBLICATION_TITLE.E41':
                #print 'Naslov publikacije:'
                #print child['label']
                related_resource['pub_title'] = child['label']
            elif child['entitytypeid'] == 'PLACE_OF_CREATION.E48':
                #print 'Kraj izdaje:'
                #print child['label']
                related_resource['pub_place'] = child['label']
            elif child['entitytypeid'] == 'YEAR_OF_CREATION.E62':
                #print 'Leto izdaje:'
                #print child['label']
                related_resource['pub_year'] = child['label']
            elif child['entitytypeid'] == 'CREATOR_APPELLATION.E82':
                #print 'Avtor:'
                #print child['label']      
                related_resource['author'] = child['label']         
                
        if related_resource['entitytypeid'] == 'HERITAGE_RESOURCE.E18':
            for entity in related_resource['domains']:
                if entity['entitytypeid'] == 'RESOURCE_TYPE_CLASSIFICATION.E55':
                    related_resource['relationship'].append(get_preflabel_from_valueid(entity['value'], lang)['value'])
        elif related_resource['entitytypeid'] == 'HERITAGE_RESOURCE_GROUP.E27':
            for entity in related_resource['domains']:
                if entity['entitytypeid'] == 'RESOURCE_TYPE_CLASSIFICATION.E55':
                    related_resource['relationship'].append(get_preflabel_from_valueid(entity['value'], lang)['value'])
        elif related_resource['entitytypeid'] == 'ACTIVITY.E7':
            for entity in related_resource['domains']:
                if entity['entitytypeid'] == 'ACTIVITY_TYPE.E55':
                    related_resource['relationship'].append(get_preflabel_from_valueid(entity['value'], lang)['value'])
        elif related_resource['entitytypeid'] == 'ACTOR.E39':
            for entity in related_resource['domains']:
                if entity['entitytypeid'] == 'ACTOR_TYPE.E55':
                    related_resource['relationship'].append(get_preflabel_from_conceptid(entity['conceptid'], lang)['value'])
                    related_resource['actor_relationshiptype'] = ''
        elif related_resource['entitytypeid'] == 'HISTORICAL_EVENT.E5':
            for entity in related_resource['domains']:
                if entity['entitytypeid'] == 'HISTORICAL_EVENT_TYPE.E55':
                    related_resource['relationship'].append(get_preflabel_from_conceptid(entity['conceptid'], lang)['value'])
        elif related_resource['entitytypeid'] == 'INFORMATION_RESOURCE.E73':
            for entity in related_resource['domains']:
                if entity['entitytypeid'] == 'INFORMATION_RESOURCE_TYPE.E55':
                    related_resource['relationship'].append(get_preflabel_from_valueid(entity['value'], lang)['value'])
            for entity in related_resource['child_entities']:
                if entity['entitytypeid'] == 'FILE_PATH.E62':
                    related_resource['file_path'] = settings.MEDIA_URL + entity['label']
                if entity['entitytypeid'] == 'THUMBNAIL.E62':
                    related_resource['thumbnail'] = settings.MEDIA_URL + entity['label']
                    information_resource_type = 'IMAGE'
            
        # get the relationship between the two entities
        for relationship in related_resource_info['resource_relationships']:
            if relationship['entityid1'] == related_resource['entityid'] or relationship['entityid2'] == related_resource['entityid']: 
                related_resource['relationship'].append(get_preflabel_from_valueid(relationship['relationshiptype'], lang)['value'])
                related_resource['notes'] = relationship['notes']

        entitytypeidkey = related_resource['entitytypeid'].split('.')[0]
        if entitytypeidkey == 'INFORMATION_RESOURCE':
            entitytypeidkey = '%s_%s' % (entitytypeidkey, information_resource_type)
        related_resource_dict[entitytypeidkey].append(related_resource)
    
    #related_resource_dict['INFORMATION_RESOURCE_DOCUMENT'] = sorted(related_resource_dict['INFORMATION_RESOURCE_DOCUMENT'], key=lambda k: k['pub_year']) 
    related_resource_dict['INFORMATION_RESOURCE_DOCUMENT'] = sorted(related_resource_dict['INFORMATION_RESOURCE_DOCUMENT'], key=lambda k: ('pub_year' not in k, k.get('pub_year', None)))
    print 'Report...'
    
    return render_to_response('resource-report.htm', {
            'geometry': JSONSerializer().serialize(report_info['source']['geometry']),
            'resourceid': resourceid,
            'report_template': 'views/reports/' + report_info['type'] + '.htm',
            'report_info': report_info,
            'related_resource_dict': related_resource_dict,
            'main_script': 'resource-report-zbiva',
            'active_page': 'ResourceReport'
        },
        context_instance=RequestContext(request))     

def map_layers(request, entitytypeid='all', get_centroids=False):
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    if lang == 'en':
       lang = 'en-US'
    data = []
    geom_param = request.GET.get('geom', None)
    print 'map_layers: ' + entitytypeid
    #print request.method
    bbox = request.GET.get('bbox', '')
    limit = request.GET.get('limit', settings.MAP_LAYER_FEATURE_LIMIT)
    if request.method == 'GET':
        entityids = request.GET.get('entityid', '')
    elif request.method == 'POST':
        entityids = request.POST.get('entityid', '')
    #print entityids 
    geojson_collection = {
      "type": "FeatureCollection",
      "features": []
    }
    #print request.META
    url =  request.META.get('HTTP_REFERER')
    searchType = 'Search'
    if not url:
        return JSONResponse(geojson_collection)
    if url.find('searchType')>0:
        parsed = urlparse.urlparse(url)
        searchType =  urlparse.parse_qs(parsed.query)['searchType'][0]
    else:
        if url.find('search_sites')>0:
            searchType = 'Site'
            entitytypeid = 'SITE.E18'
        elif url.find('search_graves')>0:
            searchType = 'Grave'
            entitytypeid = 'GRAVE.E18'
        elif url.find('search_objects')>0:
            searchType = 'Object' 
            entitytypeid = 'OBJECT.E18'  
    #print searchType
    se = SearchEngineFactory().create()
    query = Query(se, limit=limit)
    args = { 'index': 'maplayers' }
    if entitytypeid != 'all':
        args['doc_type'] = entitytypeid
    if entityids != '':
        for entityid in entityids.split(','):
            item = se.search(index='maplayers', id=entityid)
            #print item
            # Prevodi
            #print 'Result_item'
            #print item['_source']['properties']
            concept_label_ids = set()
            uuid_regex = re.compile('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
            # gather together all uuid's referenced in the resource graph
            def crawl(items):
                for item in items:
                    if isinstance(item, dict):
                        for key in item:
                            if isinstance(item[key], list):
                                crawl(item[key])
                            else:
                                if isinstance(item[key], basestring) and uuid_regex.match(item[key]):
                                    concept_label_ids.add(item[key])

            crawl([item['_source']['properties']])
            
            # get all the concept labels from the uuid's
            concept_labels = se.search(index='concept_labels', id=list(concept_label_ids))

            # convert all labels to their localized prefLabel
            temp = {}
            if concept_labels != None:
                for concept_label in concept_labels['docs']:
                    #temp[concept_label['_id']] = concept_label
                    if concept_label['found']:
                        # the resource graph already referenced the preferred label in the desired language
                        if concept_label['_source']['type'] == 'prefLabel' and concept_label['_source']['language'] == lang:
                            temp[concept_label['_id']] = concept_label['_source']
                        else: 
                            # the resource graph referenced a non-preferred label or a label not in our target language, so we need to get the right label
                            temp[concept_label['_id']] = get_preflabel_from_conceptid(concept_label['_source']['conceptid'], lang)
            
            # replace the uuid's in the resource graph with their preferred and localized label                    
            def crawl_again(items):
                for item in items:
                    if isinstance(item, dict):
                        for key in item:
                            if isinstance(item[key], list):
                                crawl_again(item[key])
                            else:
                                if isinstance(item[key], basestring) and uuid_regex.match(item[key]):
                                    try:
                                        item[key] = temp[item[key]]['value']
                                    except:
                                        pass

            crawl_again([item['_source']['properties']])
            #print 'crawl_again'
            #print item['_source']['properties']
            
            geojson_collection['features'].append(item['_source'])
            #geojson_collection['features'].append(se.search(index='maplayers', id=entityid)['_source'])
            
            #Poiskus pridobitve slik - pridobiti se jih da, vendar jih je potem problem prikazati, zato jih tu ne bomo prikazovali
            #related_resources = get_related_resources(entityid, lang, start=0, limit=15)
            #if related_resources['related_resources']:
            #    thumbnails = {'thumbnail': [] }
            #    for entity in related_resources['related_resources'][0]['child_entities']:
                    #print entity
            #        if entity['entitytypeid']=='THUMBNAIL.E62':
            #            thumbnails['thumbnail'].append(entity['value'])
            #    item['_source']['properties']['thumbnails'] = thumbnails
        #print item['_source']['properties']
        geojson_collection['features'] = sorted(geojson_collection['features'], key=lambda k: (k['properties']['primaryname'].lower())) 
        return JSONResponse(geojson_collection)
    data = query.search(**args)
    for item in data['hits']['hits']:
        # Ce nismo na splosnem searchu, upostevamo samo ustrezne tipe resourcov
        if (searchType != 'Search'):
            #print item
            #print item['_source']['properties']['searchType']
            if (item['_source']['properties']['searchType'] != searchType):
                continue
            #print 'Je'
        
        if get_centroids:
            item['_source']['geometry'] = item['_source']['properties']['centroid']
            item['_source'].pop('properties', None)
        elif geom_param != None:
            item['_source']['geometry'] = item['_source']['properties'][geom_param]
            item['_source']['properties'].pop('extent', None)
            item['_source']['properties'].pop(geom_param, None)
        else:
            item['_source']['properties'].pop('extent', None)
            item['_source']['properties'].pop('centroid', None)
        geojson_collection['features'].append(item['_source'])
    print 'St. zapisov: '
    print len(data['hits']['hits'])
    return JSONResponse(geojson_collection)   

def help(request):
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    url = settings.HELP_SI
    if request.LANGUAGE_CODE == 'de':
        url = settings.HELP_DE
    if request.LANGUAGE_CODE == 'en':
        url = settings.HELP_EN
    response = urllib.urlopen(url)
    data = response.read()
    return render_to_response('help.htm', {
            'main_script': 'help',
            'active_page': 'Help',
            'html_data': data
        },
        context_instance=RequestContext(request))

def get_admin_areas(request):
    geomString = request.GET.get('geom', '')
    if geomString != '':
        geom = GEOSGeometry(geomString)
        intersection = models.Overlays.objects.filter(geometry__intersects=geom)
    else:
        intersection = None
    return JSONResponse({'results': intersection}, indent=4)
