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
from datetime import datetime
from django.conf import settings
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.utils.importlib import import_module
from django.contrib.gis.geos import GEOSGeometry
from django.db.models import Max, Min
from arches.app.models import models
from arches.app.views.search import get_paginator
from zbiva.models.concept import Concept
from arches.app.utils.JSONResponse import JSONResponse
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
from arches.app.search.search_engine_factory import SearchEngineFactory
from zbiva.search.elasticsearch_dsl_builder import Bool, Match, Query, Nested, Terms, GeoShape, Range
from arches.app.views.concept import get_preflabel_from_conceptid
from zbiva.views.search_utils import get_auto_filter, get_search_range_contexts, get_search_contexts
from django.utils.translation import ugettext as _
from zbiva.utils.data_management.resources.exporter import ResourceExporter
import locale

import csv
import re

import csv

try:
    from cStringIO import StringIO
except ImportError:
    from StringIO import StringIO

geocoder = import_module(settings.GEOCODING_PROVIDER)

def home_page_sites(request):
    return home_page_all(request, 'Site')

def home_page_graves(request):
    return home_page_all(request, 'Grave')

def home_page_objects(request):
    return home_page_all(request, 'Object')

def home_page(request):
    return home_page_all(request, 'Search')

def home_page_all(request, name):
    print 'home_page_all: ' + name
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    if lang == 'en':
       lang = 'en-US'
    min_max_dates = models.Dates.objects.aggregate(Min('val'), Max('val'))
    search_context =  get_search_contexts(request)
    if name == 'Site':
        advancedfilterdata = {
                                'site_names': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'other_names': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'settlements': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'tus': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'tas': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'regions': {
                                    'branch_lists': [],
                                    'domains': {'REGION.E55' : Concept().get_e55_domain('REGION.E55', lang)}
                                },
                                'countries': {
                                    'branch_lists': [],
                                    'domains': {'COUNTRY.E55' : Concept().get_e55_domain('COUNTRY.E55', lang)}
                                },
                                'site_features': {
                                    'branch_lists': [],
                                    'domains': {'SITE_FEATURE.E55' : Concept().get_e55_domain('SITE_FEATURE.E55', lang)}
                                }
                            }
    elif name == 'Grave':
        advancedfilterdata = {
                                'site_names': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'other_names': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'settlements': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'tus': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'tas': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'regions': {
                                    'branch_lists': [],
                                    'domains': {'REGION.E55' : Concept().get_e55_domain('REGION.E55', lang)}
                                },
                                'countries': {
                                    'branch_lists': [],
                                    'domains': {'COUNTRY.E55' : Concept().get_e55_domain('COUNTRY.E55', lang)}
                                },
                                'grave_features': {
                                    'branch_lists': [],
                                    'domains': {'GRAVE_FEATURE.E55' : Concept().get_e55_domain('GRAVE_FEATURE.E55', lang),
                                                'GRAVE_FEATURE_LEVEL2.E55' : Concept().get_e55_domain('GRAVE_FEATURE_LEVEL2.E55', lang)}
                                },
                                'body_features': {
                                    'branch_lists': [],
                                    'domains': {'BODY_FEATURE.E55' : Concept().get_e55_domain('BODY_FEATURE.E55', lang),
                                                'BODY_FEATURE_LEVEL2.E55' : Concept().get_e55_domain('BODY_FEATURE_LEVEL2.E55', lang)}
                                },
                                'measurement_types': {
                                    'branch_lists': [],
                                    'domains': {'GRAVE_MEASUREMENT_TYPE.E55' : Concept().get_e55_domain('GRAVE_MEASUREMENT_TYPE.E55', lang),
                                                'unit': [{"conceptid": "0",
                                                        "entitytypeid": "unit",
                                                        "id": "0",
                                                        "languageid": lang,
                                                        "text": _("m"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                 }],
                                                'operators': [{
                                                        "conceptid": "0",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "0",
                                                        "languageid": lang,
                                                        "text": _("less than"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                    },{
                                                        "conceptid": "1",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "1",
                                                        "languageid": lang,
                                                        "text": _("less than or equal"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                    },{
                                                        "conceptid": "2",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "2",
                                                        "languageid": lang,
                                                        "text": _("greater than"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                    },{
                                                        "conceptid": "3",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "3",
                                                        "languageid": lang,
                                                        "text": _("greater than or equal"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",

                                                        "children": []
                                                    },{
                                                        "conceptid": "4",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "4",
                                                        "languageid": lang,
                                                        "text": _("equal"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                    }]
                                               }
                                }
                            }
    elif name == 'Object':
        advancedfilterdata = {
                                'site_names': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'other_names': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'settlements': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'tus': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'tas': {
                                    'branch_lists': [],
                                    'domains': {}
                                },
                                'regions': {
                                    'branch_lists': [],
                                    'domains': {'REGION.E55' : Concept().get_e55_domain('REGION.E55', lang)}
                                },
                                'countries': {
                                    'branch_lists': [],
                                    'domains': {'COUNTRY.E55' : Concept().get_e55_domain('COUNTRY.E55', lang)}
                                },
                                'materials': {
                                    'branch_lists': [],
                                    'domains': {'MATERIAL.E57' : Concept().get_e55_domain('MATERIAL.E57', lang)}
                                },
                                'object_types': {
                                    'branch_lists': [],
                                    'domains': {'OBJECT_TYPE.E55' : Concept().get_e55_domain('OBJECT_TYPE.E55', lang)}
                                },
                                'object_features': {
                                    'branch_lists': [],
                                    'domains': {'OBJECT_FEATURE.E55' : Concept().get_e55_domain('OBJECT_FEATURE.E55', lang),
                                                'OBJECT_FEATURE_LEVEL1.E55' : Concept().get_e55_domain('OBJECT_FEATURE_LEVEL1.E55', lang),
                                                'OBJECT_FEATURE_LEVEL2.E55' : Concept().get_e55_domain('OBJECT_FEATURE_LEVEL2.E55', lang)}
                                },
                                'measurement_types': {
                                    'branch_lists': [],
                                    'domains': {'OBJECT_MEASUREMENT_TYPE.E55' : Concept().get_e55_domain('OBJECT_MEASUREMENT_TYPE.E55', lang),
                                                'operators': [{
                                                        "conceptid": "0",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "0",
                                                        "languageid": lang,
                                                        "text": _("less than"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                    },{
                                                        "conceptid": "1",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "1",
                                                        "languageid": lang,
                                                        "text": _("less than or equal"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                    },{
                                                        "conceptid": "2",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "2",
                                                        "languageid": lang,
                                                        "text": _("greater than"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                    },{
                                                        "conceptid": "3",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "3",
                                                        "languageid": lang,
                                                        "text": _("greater than or equal"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                    },{
                                                        "conceptid": "4",
                                                        "entitytypeid": "COMPARISON_OPERATOR.E55",
                                                        "id": "4",
                                                        "languageid": lang,
                                                        "text": _("equal"),
                                                        "valuetype": "prefLabel",  
                                                        "sortorder": "",
                                                        "collector": "",
                                                        "children": []
                                                    }]
                                               }
                                }
                            }
    else:
        advancedfilterdata = {}
    
    return render_to_response('search.htm', {
            'main_script': 'search',
            'active_page': name,
            'min_date': min_max_dates['val__min'].year if min_max_dates['val__min'] != None else 0,
            'max_date': min_max_dates['val__max'].year if min_max_dates['val__min'] != None else 1,
            'timefilterdata': JSONSerializer().serialize(Concept.get_time_filter_data(lang)),
            'advancedfilterdata': JSONSerializer().serialize(advancedfilterdata),
            'search_type': name,
            'search_context': search_context
        }, 
        context_instance=RequestContext(request))

def cmp_items(a, b):
    locale.setlocale(locale.LC_ALL, '')
    drzavaA = 'ZZZ'
    drzavaB = 'ZZZ'
    dezelaA = 'ZZZ'
    dezelaB = 'ZZZ'
    tpA = 'ZZZ'
    tpB = 'ZZZ'
    teA = 'ZZZ'
    teB = 'ZZZ'
    naseljeA = 'ZZZ'
    naseljeB = 'ZZZ'
    zaselekA = 'ZZZ'
    zaselekB = 'ZZZ'
    najdisceA = 'ZZZ'
    najdisceB = 'ZZZ'
    grobA = 'ZZZ'
    grobB = 'ZZZ'
    #for y in a['_source']['child_entities']:
    #    if y['entitytypeid'] == 'SITE_NAME.E41':
    #        najdisceA = y['label']
    #for y in b['_source']['child_entities']:
    #    if y['entitytypeid'] == 'SITE_NAME.E41':
    #        najdisceB = y['label']  
    #print najdisceA
    #print najdisceB
    for y in a['_source']['domains']:
        if y['entitytypeid'] == 'COUNTRY.E55':
            drzavaA = y['label']
    for y in b['_source']['domains']:
        if y['entitytypeid'] == 'COUNTRY.E55':
            drzavaB = y['label']
    lcompare = locale.strcoll(drzavaA, drzavaB)           
    if lcompare>0:
        return 1
    elif lcompare==0:
        for y in a['_source']['domains']:
            if y['entitytypeid'] == 'REGION.E55':
                dezelaA = y['label']
        for y in b['_source']['domains']:
            if y['entitytypeid'] == 'REGION.E55':
                dezelaB = y['label']
        lcompare = locale.strcoll(dezelaA, dezelaB)     
        if lcompare>0:
            return 1
        elif lcompare==0:
            for y in a['_source']['child_entities']:
                if y['entitytypeid'] == 'TOPOGRAPHICAL_AREA.E48':
                    tpA = y['label']
            for y in b['_source']['child_entities']:
                if y['entitytypeid'] == 'TOPOGRAPHICAL_AREA.E48':
                    tpB = y['label']
            lcompare = locale.strcoll(tpA, tpB)
            if lcompare>0:
                return 1
            elif lcompare==0:
                for y in a['_source']['child_entities']:
                    if y['entitytypeid'] == 'TOPOGRAPHICAL_UNIT.E48':
                        teA = y['label']
                for y in b['_source']['child_entities']:
                    if y['entitytypeid'] == 'TOPOGRAPHICAL_UNIT.E48':
                        teB = y['label']
                lcompare = locale.strcoll(teA, teB)
                if lcompare>0:
                    return 1
                elif lcompare==0:
                    for y in a['_source']['child_entities']:
                        if y['entitytypeid'] == 'SETTLEMENT.E48':
                            naseljeA = y['label']
                    for y in b['_source']['child_entities']:
                        if y['entitytypeid'] == 'SETTLEMENT.E48':
                            naseljeB = y['label']                    
                    lcompare = locale.strcoll(naseljeA, naseljeB)
                    if lcompare>0:
                        return 1
                    elif lcompare==0:
                        for y in a['_source']['child_entities']:
                            if y['entitytypeid'] == 'OTHER_NAME.E48':
                                zaselekA = y['label']
                        for y in b['_source']['child_entities']:
                            if y['entitytypeid'] == 'OTHER_NAME.E48':
                                zaselekB = y['label']                    
                        lcompare = locale.strcoll(zaselekA, zaselekB)
                        if lcompare>0:
                            return 1
                        elif lcompare==0:
                            for y in a['_source']['child_entities']:
                                if y['entitytypeid'] == 'SITE_NAME.E41':
                                    najdisceA = y['label']
                            for y in b['_source']['child_entities']:
                                if y['entitytypeid'] == 'SITE_NAME.E41':
                                    najdisceB = y['label']                    
                            lcompare = locale.strcoll(najdisceA, najdisceB)
                            if lcompare>0:
                                return 1
                            elif lcompare==0:
                                for y in a['_source']['child_entities']:
                                    if y['entitytypeid'] == 'GRAVE_CODE.E42':
                                        grobA = y['label']
                                for y in b['_source']['child_entities']:
                                    if y['entitytypeid'] == 'GRAVE_CODE.E42':
                                        grobB = y['label']                    
                                lcompare = locale.strcoll(grobA, grobB)
                                if lcompare>0:
                                    return 1
                                elif lcompare==0:
                                    return 0
                                else:
                                    return -1
                            else:
                                return -1
                        else:
                            return -1
                    else:
                        return -1
                else:
                    return -1
            else:
                return -1
        else:
            return -1
    else:
        return -1

def sort_dsl(parent, sort_field):
    return {
              parent + '.label': {
                 "mode" :  "min",
                 "order" : "asc",
                 "nested_path" : parent,
                 "nested_filter" : {
                    "term" : { parent + ".entitytypeid" : sort_field }
                 }
              }
           }

def search_results(request):
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    search_criteria = "# " + _("Search criteria") + ": "
    wrapper = [search_criteria]
    query = build_search_results_dsl(request, wrapper)
    search_criteria = wrapper[0]
    print 'Kriterij'
    #print search_criteria
    if search_criteria == "# " + _("Search criteria") + ": ":
        print 'Prazen kriterij'
        results = {u'hits': {u'hits': [], u'total': 0, u'max_score': None}, 
                   u'_shards': {u'successful': 5, u'failed': 0, u'total': 5},
                   u'took': 0, u'timed_out': False}
        return get_paginator(results, 0, 1, settings.SEARCH_ITEMS_PER_PAGE, ['_none'])
    #print query
    # Ta sort deluje pravilno (sortira po celih rezultatih)
    # Mozni problemi:
    # - prevodi
    query.add_sort(sort_dsl('domains', 'COUNTRY.E55'))
    query.add_sort(sort_dsl('domains', 'REGION.E55'))
    query.add_sort(sort_dsl('child_entities', 'TOPOGRAPHICAL_AREA.E48'))
    query.add_sort(sort_dsl('child_entities', 'TOPOGRAPHICAL_UNIT.E48'))
    query.add_sort(sort_dsl('child_entities', 'SETTLEMENT.E48'))
    query.add_sort(sort_dsl('child_entities', 'OTHER_NAME.E48'))
    query.add_sort(sort_dsl('child_entities', 'SITE_NAME.E41'))
    query.add_sort(sort_dsl('child_entities', 'GRAVE_CODE.E42'))
    query.add_sort(sort_dsl('child_entities', 'GRAVE_SE.E62'))
    query.add_sort(sort_dsl('child_entities', 'OBJECT_CODE.E42'))
    #print query
    results = query.search(index='entity', doc_type='') 
    total = results['hits']['total']
    page = 1 if request.GET.get('page') == '' else int(request.GET.get('page', 1))
    all_entity_ids = ['_all']
    if request.GET.get('include_ids', 'false') == 'false':
        all_entity_ids = ['_none']
    elif request.GET.get('no_filters', '') == '':
        full_results = query.search(index='entity', doc_type='', start=0, limit=1000000, fields=[])
        all_entity_ids = [hit['_id'] for hit in full_results['hits']['hits']]
    
    # Prevodi
    print 'Prevodi - zacetek'
    se = SearchEngineFactory().create()
    concept_label_ids = set()
    #print len(results['hits']['hits'])
    temp = {}
    for result in results['hits']['hits']:
        new_cli = set()
        for domain in result['_source']['domains']:
            #print domain  
            if domain['value'] not in concept_label_ids:
                concept_label_ids.add(domain['value'])
                new_cli.add(domain['value'])
        # get all the concept labels from the uuid's
        if new_cli:
            concept_labels = se.search(index='concept_labels', id=list(new_cli))
            # convert all labels to their localized prefLabel
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
        for domain in result['_source']['domains']:
            domain['label'] = temp[domain['value']]['value']
    
    print 'Prevodi - konec'
   
    #print results['hits']['hits']
    #for x in results['hits']['hits']:
    #    for y in x['_source']['domains']:
    #        print y
    
    # Rezultate sortiramo glede na hierarhijo podatkov v funkciji cmp_items
    # To ne deluje pravilno, saj se upostavajo le rezultati znotraj paginga!!!
    #results['hits']['hits'].sort(cmp_items)
    return get_paginator(results, total, page, settings.SEARCH_ITEMS_PER_PAGE, all_entity_ids)

def search_terms(request):
    lang = request.GET.get('lang', settings.LANGUAGE_CODE)
    searchType = request.GET.get('s', '')
    if searchType!= 'Search':
        results = {'hits': {'total': 0,
                            'max_score': None,
                            'hits': []
                           },
                   'took': 0,
                   'timed_out': False,
                   '_shards': {'successful': 0,
                               'failed': 0,
                               'total': 0
                              }
                  }
        return JSONResponse(results)  

    query = build_search_terms_dsl(request)
    results = query.search(index='term', doc_type='value')
    # Prevedemo se imena polj
    for result in results['hits']['hits']:
        prefLabel = get_preflabel_from_conceptid(result['_source']['context'], lang)
        result['_source']['options']['context_label'] = _(prefLabel['value'])
    return JSONResponse(results)

def build_search_terms_dsl(request):
    se = SearchEngineFactory().create()
    searchString = request.GET.get('q', '')
    query = Query(se, start=0, limit=settings.SEARCH_DROPDOWN_LENGTH)
    boolquery = Bool()
    boolquery.should(Match(field='term', query=searchString.lower(), type='phrase_prefix', fuzziness='AUTO'))
    boolquery.should(Match(field='term.folded', query=searchString.lower(), type='phrase_prefix', fuzziness='AUTO'))
    boolquery.should(Match(field='term.folded', query=searchString.lower(), fuzziness='AUTO'))
    query.add_query(boolquery)

    return query

def build_base_search_results_dsl(request, passed_search_criteria):
    searchType =  request.GET.get('searchType', '')
    term_filter = request.GET.get('termFilter', '')
    if request.GET.get('spatialFilter', None) != None:
        spatial_filter = JSONDeserializer().deserialize(request.GET.get('spatialFilter', None)) 
    else:
        spatial_filter = []
    export = request.GET.get('export', None)
    page = 1 if request.GET.get('page') == '' else int(request.GET.get('page', 1))
    if request.GET.get('temporalFilter', None) != None:
        temporal_filter = JSONDeserializer().deserialize(request.GET.get('temporalFilter', None))
    else:
        temporal_filter = []
    se = SearchEngineFactory().create()

    if export != None:
        limit = settings.SEARCH_EXPORT_ITEMS_PER_PAGE  
    else:
        limit = settings.SEARCH_ITEMS_PER_PAGE
    
    search_criteria = passed_search_criteria[0]
    query = Query(se, start=limit*int(page-1), limit=limit)
    boolquery = Bool()
    boolfilter = Bool()
    # Ce smo na jezicku, razlicnem od obicajnega searcha, dodamo omejitev po tipu (Resource Classification)
    if searchType != 'Search':
        auto_filter = []
        if term_filter: 
            for item in JSONDeserializer().deserialize(term_filter):
                auto_filter.append(item) 
        
            # Poiscimo concept id in context za SearchType
            AUTO_TERM_FILTER = get_auto_filter(request, searchType)
            
            auto_filter.append(AUTO_TERM_FILTER)
            term_filter = JSONSerializer().serialize(auto_filter)
        else:
            term_filter = ""    
    if term_filter != '':
        for term in JSONDeserializer().deserialize(term_filter):
            if term['type'] == 'term':
                entitytype = models.EntityTypes.objects.get(conceptid_id=term['context'])
                boolfilter_nested = Bool()
                boolfilter_nested.must(Terms(field='child_entities.entitytypeid', terms=[entitytype.pk]))
                boolfilter_nested.must(Match(field='child_entities.value', query=term['value'], type='phrase'))
                nested = Nested(path='child_entities', query=boolfilter_nested)
                if term['inverted']:
                   search_criteria = search_criteria + _('NOT') + ' ' 
                search_criteria = search_criteria + term['context_label'] + ' = ' + term['text'] + ' ' + _('and') + ' '
                if term['inverted']:
                    boolfilter.must_not(nested)
                else:    
                    boolfilter.must(nested)
            elif term['type'] == 'concept':
                concept_ids = _get_child_concepts(term['value'])
                terms = Terms(field='domains.conceptid', terms=concept_ids)
                nested = Nested(path='domains', query=terms)
                # Samodejnega kriterija pri izpisu ne upostevamo
                if term['context_label'] != 'Heritage Resource Type':
                    if term['inverted']:
                       search_criteria = search_criteria + _('NOT') + ' ' 
                    search_criteria = search_criteria + term['context_label'] + ' = ' + term['text'] + ' ' + _('and') + ' '
                if term['inverted']:
                    boolfilter.must_not(nested)
                else:
                    boolfilter.must(nested)
            elif term['type'] == 'string':
                boolfilter_folded = Bool()
                boolfilter_folded.should(Match(field='child_entities.value', query=term['value'], type='phrase_prefix'))
                boolfilter_folded.should(Match(field='child_entities.value.folded', query=term['value'], type='phrase_prefix'))
                nested = Nested(path='child_entities', query=boolfilter_folded)
                if term['inverted']:
                   search_criteria = search_criteria + _('NOT') + ' ' 
                search_criteria = search_criteria + _('Any string') + ' = ' + term['value'] + ' ' + _('and') + ' '
                if term['inverted']:
                    boolquery.must_not(nested)
                else:    
                    boolquery.must(nested)

    if 'geometry' in spatial_filter and 'type' in spatial_filter['geometry'] and spatial_filter['geometry']['type'] != '':
        geojson = spatial_filter['geometry']
                
        if geojson['type'] == 'bbox':
            coordinates = [[geojson['coordinates'][0],geojson['coordinates'][3]], [geojson['coordinates'][2],geojson['coordinates'][1]]]
            geoshape = GeoShape(field='geometries.value', type='envelope', coordinates=coordinates )
            nested = Nested(path='geometries', query=geoshape)
        else:
            buffer = spatial_filter['buffer']
            geojson = JSONDeserializer().deserialize(_buffer(geojson,buffer['width'],buffer['unit']).json)
            geoshape = GeoShape(field='geometries.value', type=geojson['type'], coordinates=geojson['coordinates'] )
            nested = Nested(path='geometries', query=geoshape)
        if 'inverted' not in spatial_filter:
            spatial_filter['inverted'] = False
            search_criteria = search_criteria + _('NOT') + ' ' 
    
        search_criteria = search_criteria + _('Map Filter Enabled') + ' ' + _('and') + ' '

        if spatial_filter['inverted']:
            boolfilter.must_not(nested)
        else:
            boolfilter.must(nested)
    # Tega ne rabimo, ker moramo upostevati obdobja!
    #if 'year_min_max' in temporal_filter and len(temporal_filter['year_min_max']) == 2:
    #    start_date = date(temporal_filter['year_min_max'][0], 1, 1)
    #    end_date = date(temporal_filter['year_min_max'][1], 12, 31)
    #    if start_date:
    #        start_date = start_date.isoformat()
    #    if end_date:
    #        end_date = end_date.isoformat()
    #    range = Range(field='dates.value', gte=start_date, lte=end_date)
    #    nested = Nested(path='dates', query=range)
    #    
    #    if 'inverted' not in temporal_filter:
    #        temporal_filter['inverted'] = False
    #
    #    if temporal_filter['inverted']:
    #        boolfilter.must_not(nested)
    #    else:
    #        boolfilter.must(nested)
    #    
    if not boolquery.empty:
        query.add_query(boolquery)
    
    if not boolfilter.empty:
        query.add_filter(boolfilter)
    #print query
    passed_search_criteria[0] = search_criteria
    
    return query

def build_search_results_dsl(request, passed_search_criteria):
    if request.GET.get('temporalFilter', None) != None:
        temporal_filters = JSONDeserializer().deserialize(request.GET.get('temporalFilter', None))
    else:
        temporal_filters = []
    if request.GET.get('advancedFilter', None) != None:
        advanced_filters = JSONDeserializer().deserialize(request.GET.get('advancedFilter', None))
    else:
        advanced_filters = []
    search_criteria = passed_search_criteria[0]
    wrapper = [search_criteria]
    query = build_base_search_results_dsl(request, wrapper)
    search_criteria = wrapper[0]
    boolfilter = Bool()
    boolquery = Bool()
    if 'year_min_max' in temporal_filters and len(temporal_filters['year_min_max']) == 2:
        print temporal_filters
        start_date = datetime(temporal_filters['year_min_max'][0], 1, 1)
        end_date = datetime(temporal_filters['year_min_max'][1], 12, 31)
        if temporal_filters['inverted']:
           search_criteria = search_criteria + _('NOT') + ' ' 
        search_criteria = search_criteria + _('Range of Years') + ' ' + _('from') + ' ' + str(temporal_filters['year_min_max'][0]) + ' ' + _('to') + ' ' + str(temporal_filters['year_min_max'][1]) + ' ' + _('and') + ' '
        if start_date:
            start_date = start_date.isoformat()
        if end_date:
            end_date = end_date.isoformat()
        # Pridobimo ID-je vrednosti filtrov
        search_range_context =  get_search_range_contexts(request)
        #print search_range_context
        #print start_date
        #print end_date
        first_date = search_range_context['Beginning_Of_Existence_Type']['First_Date']['valueid']
        last_date = search_range_context['End_Of_Existence_Type']['Last_Date']['valueid']
        #print first_date
        #print last_date
        # Prvi datum mora biti manjsi kot izbrani koncni datum
        terms = Terms(field='date_groups.conceptid', terms=first_date)
        boolfilter.must(terms)
    
        range = Range(field='date_groups.value', lt=end_date)
        
        if 'inverted' not in temporal_filters:
           temporal_filters['inverted'] = False

        if temporal_filters['inverted']:
            boolfilter.must_not(range)
        else:
            boolfilter.must(range)

        query.add_filter(boolfilter)
        
        # Zadnji datum mora biti vecji kot izbrani zacetni datum
        terms = Terms(field='date_groups.conceptid', terms=last_date)
        boolfilter.must(terms)
        range = Range(field='date_groups.value', gt=start_date)
        
        if 'inverted' not in temporal_filters:
           temporal_filters['inverted'] = False

        if temporal_filters['inverted']:
            boolfilter.must_not(range)
        else:
            boolfilter.must(range)

        query.add_filter(boolfilter)
        
        
    if 'filters' in temporal_filters:
        for temporal_filter in temporal_filters['filters']:
            date_type = ''
            date = ''
            date_operator = ''
            for node in temporal_filter['nodes']:
                if node['entitytypeid'] == 'DATE_COMPARISON_OPERATOR.E55':
                    date_operator = node['value']
                elif node['entitytypeid'] == 'date':
                    date = node['value']
                else:
                    date_type = node['value']

            terms = Terms(field='date_groups.conceptid', terms=date_type)
            boolfilter.must(terms)

            date_value = datetime.strptime(date, '%Y-%m-%d').isoformat()

            if date_operator == '1': # equals query
                range = Range(field='date_groups.value', gte=date_value, lte=date_value)
            elif date_operator == '0': # greater than query 
                range = Range(field='date_groups.value', lt=date_value)
            elif date_operator == '2': # less than query
                range = Range(field='date_groups.value', gt=date_value)
            if 'inverted' not in temporal_filters:
                temporal_filters['inverted'] = False

            if temporal_filters['inverted']:
                boolfilter.must_not(range)
            else:
                boolfilter.must(range)

            query.add_filter(boolfilter)
    
    keys = ['site_names','other_names','settlements','tus','tas', 'regions','countries','site_features','grave_features','body_features', 'materials','object_types','object_features']
    and_keys = ['site_features','grave_features','body_features','object_features','materials']
    # Polja visjih nivojev ignoriramo (v podatkih so samo koncni nivoji)
    ignore_fields = ['BODY_FEATURE_LEVEL2.E55','GRAVE_FEATURE_LEVEL2.E55','OBJECT_FEATURE_LEVEL1.E55','OBJECT_FEATURE_LEVEL2.E55']
    #print 'advanced_filters:'
    for key in keys:
        if key in advanced_filters:
            # To je zato, da se pri vsakem dodatnem kljucu uposteva AND, znotraj posamezega kljuca pa OR
            boolfilter1 = Bool()
            boolfilter = Bool()
            #print 'Key: ' + key
            uuid_regex = re.compile('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
            se1 = SearchEngineFactory().create()
            if key == 'site_names':
                polje = _('Site name')
            elif key == 'other_names':
                polje = _('Other name')
            elif key == 'settlements':
                polje = _('Settlement')
            elif key == 'tus':
                polje = _('Topographical unit')
            elif key == 'tas':
                polje = _('Topographical area')
            elif key == 'regions':
                polje = _('Region')
            elif key == 'countries':
                polje = _('Country')
            elif key == 'site_features':
                polje = _('Site features')
            elif key == 'grave_features':
                polje = _('Grave feature - level 2')
            elif key == 'body_features':
                polje = _('Body feature - level 2')
            elif key == 'materials':
                polje = _('Material')
            elif key == 'object_types':
                polje = _('Object type')
            elif key == 'object_features':
                polje = _('Object feature - level 3')
             
            vrednost = ''
            for filter in advanced_filters[key]:
                #print 'Filter'
                print filter
                for node in filter['nodes']:
                    valueid = node['value']
                    if node['label'] <> '':
                        vrednost = vrednost + node['label'] + ', '
                    elif node['value'] <> '':
                        vrednost = vrednost + node['value'] + ', '
                    #print node['label']
                    #print 'ValueId'
                    #print valueid
                    if valueid != '' and node['entitytypeid'] not in ignore_fields:
                        if isinstance(valueid, basestring) and uuid_regex.match(valueid):
                            value = models.Values.objects.get(pk=valueid)
                            #print 'ConceptId'
                            #print value.conceptid_id
                            #print node['entitytypeid']
                            concept_ids = _get_child_concepts(value.conceptid_id)
                            terms = Terms(field='domains.conceptid', terms=concept_ids)
                            nested = Nested(path='domains', query=terms)
                            if advanced_filters['inverted']:
                                boolfilter.must_not(nested)
                            else:    
                                if key in and_keys:
                                    boolfilter.must(nested)
                                else:
                                    boolfilter.should(nested)
                        else:
                            # Ta del se ni stestiran - namenjen je primerom, ce bo kaksno navadno tekstovno polje 
                            entitytype = node['entitytypeid']
                            #entitytype = models.EntityTypes.objects.get(conceptid_id=node["term"])
                            boolfilter_nested = Bool()
                            boolfilter_nested.must(Terms(field='child_entities.entitytypeid', terms=[entitytype]))
                            boolfilter_nested.must(Match(field='child_entities.value', query=valueid, type='phrase'))
                            nested = Nested(path='child_entities', query=boolfilter_nested)
                            if advanced_filters['inverted']:
                                boolfilter.must_not(nested)
                            else:    
                                if key in and_keys:
                                    boolfilter.must(nested)
                                else:
                                    boolfilter.should(nested)
                        #query.add_query(boolfilter)
                        boolfilter1.must(boolfilter)
            # Pobrisemo zadnjo vejico
            if vrednost != '':
                vrednost = vrednost[:-2]
                if advanced_filters['inverted']:
                   search_criteria = search_criteria + _('NOT') + ' ' 
                search_criteria = search_criteria + polje + ' = ' + vrednost + ' ' + _('and') + ' '
                
            query.add_query(boolfilter1)
    '''if 'measurement_types' in advanced_filters:
        for filter in advanced_filters['measurement_types']:
            data_type = ''
            data_value = ''
            data_operator = ''
            for node in filter['nodes']:
                if node['entitytypeid'] == 'COMPARISON_OPERATOR.E55':
                    data_operator = node['value']
                elif node['entitytypeid'] == 'measurement':
                    data_value = node['value']
                else:
                    data_type = node['value']
            terms = Terms(field='measurement_groups.conceptid', terms=data_type)
            boolfilter.must(terms)
            
            # Mogoce bi se dalo tu kaj upostevati decimalke???
            #data_value = datetime.strptime(date, '%Y-%m-%d').isoformat()

            if data_operator == '4': # equals query
                range = Range(field='measurement_groups.value', gte=data_value, lte=data_value)
            elif data_operator == '0': # greater than query 
                range = Range(field='measurement_groups.value', lt=data_value)
            elif data_operator == '1': # greater than equal query 
                range = Range(field='measurement_groups.value', lte=data_value)
            elif data_operator == '2': # less than query
                range = Range(field='measurement_groups.value', gt=data_value)
            elif data_operator == '3': # less than equal query
                range = Range(field='measurement_groups.value', gte=data_value)
            print range
            if 'inverted' not in advanced_filters:
                advanced_filters['inverted'] = False

            if advanced_filters['inverted']:
                boolfilter.must_not(range)
            else:
                boolfilter.must(range)
            query.add_filter(boolfilter)
    '''

    if 'measurement_types' in advanced_filters:
        for filter in advanced_filters['measurement_types']:
            data_type = ''
            data_value = None
            data_operator = ''
            operator = ''
            mera = ''
            enota = ''
            vrednost = ''
            for node in filter['nodes']:
                if node['entitytypeid'] == 'COMPARISON_OPERATOR.E55':
                    data_operator = node['value']
                    operator = node['label']
                elif node['entitytypeid'] == 'measurement':
                    if node['value'].find(',')>0:
                        node['value'] = node['value'].replace(',','.')
                    data_value = float(node['value'])
                    vrednost = node['value']
                elif node['entitytypeid'] <> 'unit':
                    # Poiscemo se contextid (sicer je v vsakem jeziku drugacna vrednost)
                    lang = request.GET.get('lang', request.LANGUAGE_CODE)
                    se1 = SearchEngineFactory().create()
                    context_label1 = '-'
                    search_context = {}
                    searchString1 = node['label']
                    mera = searchString1
                    query1 = Query(se1, start=0, limit=settings.SEARCH_DROPDOWN_LENGTH)
                    boolquery1 = Bool()
                    boolquery1.should(Match(field='term', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
                    boolquery1.should(Match(field='term.folded', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
                    boolquery1.should(Match(field='term.folded', query=searchString1.lower(), fuzziness='AUTO'))
                    query1.add_query(boolquery1)
                    results1 = query1.search(index='term', doc_type='value')
                    conceptid1 = ''
                    context1 = ''
                    data_type = node['value']
                    for result1 in results1['hits']['hits']:
                        #print result1result1['_source']['ids'][0]
                        conceptid1 = result1['_source']['options']
                        valueid1 = result1['_source']['ids'][0]
                        if node['value'] == valueid1:
                            #print conceptid1['conceptid']
                            data_type = conceptid1['conceptid']
                else:
                    enota = node['value']

            if advanced_filters['inverted']:
               search_criteria = search_criteria + _('NOT') + ' ' 
            search_criteria = search_criteria + mera + ' ' + operator + ' ' + vrednost + ' ' + enota + ' ' + _('and') + ' '
            fieldName = 'value_' + data_type
            #print fieldName
            
            if data_operator == '4': # equals query
                range = Range(field=fieldName, gte=data_value, lte=data_value)
            elif data_operator == '0': # greater than query 
                range = Range(field=fieldName, lt=data_value)
            elif data_operator == '1': # greater than equal query 
                range = Range(field=fieldName, lte=data_value)
            elif data_operator == '2': # less than query
                range = Range(field=fieldName, gt=data_value)
            elif data_operator == '3': # less than equal query
                range = Range(field=fieldName, gte=data_value)
            #print range
            if 'inverted' not in advanced_filters:
                advanced_filters['inverted'] = False

            if advanced_filters['inverted']:
                boolfilter.must_not(range)
            else:
                boolfilter.must(range)
            query.add_filter(boolfilter)
    
    if search_criteria.find(_('and'))>0:
        dolzina_anda = len(_('and')) + 2
        search_criteria = search_criteria[:-dolzina_anda];
    
    #print search_criteria
    passed_search_criteria[0] = search_criteria
    return query
    
def buffer(request):
    spatial_filter = JSONDeserializer().deserialize(request.GET.get('filter', '{"geometry":{"type":"","coordinates":[]},"buffer":{"width":"0","unit":"m"}}')) 

    if spatial_filter['geometry']['coordinates'] != '' and spatial_filter['geometry']['type'] != '':
        return JSONResponse(_buffer(spatial_filter['geometry'],spatial_filter['buffer']['width'],spatial_filter['buffer']['unit']), geom_format='json')

    return JSONResponse()

def _buffer(geojson, width=0, unit='ft'):
    geojson = JSONSerializer().serialize(geojson)
    try:
        width = float(width)
    except:
        width = 0

    if width > 0:
        geom = GEOSGeometry(geojson, srid=4326)
        geom.transform(3857)

        if unit == 'ft':
            width = width/3.28084

        buffered_geom = geom.buffer(width)
        buffered_geom.transform(4326)
        return buffered_geom
    else:
        return GEOSGeometry(geojson)

def _get_child_concepts(conceptid):
    ret = set([conceptid])
    for row in Concept().get_child_concepts(conceptid, ['narrower'], ['prefLabel'], 'prefLabel'):
        ret.add(row[0])
        ret.add(row[1])
    return list(ret)

def geocode(request):
    search_string = request.GET.get('q', '')    
    return JSONResponse({ 'results': geocoder.find_candidates(search_string) })
    
def export_results(request):
    print 'export_results'
    search_criteria = "# " + _("Search criteria") + ": "
    wrapper = [search_criteria]
    dsl = build_search_results_dsl(request, wrapper)
    search_criteria = wrapper[0]
    #print search_criteria

    dsl.add_sort(sort_dsl('domains', 'COUNTRY.E55'))
    dsl.add_sort(sort_dsl('domains', 'REGION.E55'))
    dsl.add_sort(sort_dsl('child_entities', 'TOPOGRAPHICAL_AREA.E48'))
    dsl.add_sort(sort_dsl('child_entities', 'TOPOGRAPHICAL_UNIT.E48'))
    dsl.add_sort(sort_dsl('child_entities', 'SETTLEMENT.E48'))
    dsl.add_sort(sort_dsl('child_entities', 'OTHER_NAME.E48'))
    dsl.add_sort(sort_dsl('child_entities', 'SITE_NAME.E41'))
    dsl.add_sort(sort_dsl('child_entities', 'GRAVE_CODE.E42'))
    dsl.add_sort(sort_dsl('child_entities', 'GRAVE_SE.E62'))
    dsl.add_sort(sort_dsl('child_entities', 'OBJECT_CODE.E42'))

    search_results = dsl.search(index='entity', doc_type='') 
    print 'Iskanje zakljuceno'
    response = None
    format = request.GET.get('export', 'csv')
    exporter = ResourceExporter(format)
    
    # Prevodi
    print 'Prevodi'
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    se = SearchEngineFactory().create()
    concept_label_ids = set()
    temp = {}
    for result in search_results['hits']['hits']:
        new_cli = set()
        for domain in result['_source']['domains']:
            #print domain  
            if domain['value'] not in concept_label_ids:
                concept_label_ids.add(domain['value'])
                new_cli.add(domain['value'])
        # get all the concept labels from the uuid's
        if new_cli:
            concept_labels = se.search(index='concept_labels', id=list(new_cli))
            # convert all labels to their localized prefLabel
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
        for domain in result['_source']['domains']:
            domain['label'] = temp[domain['value']]['value']

    #print search_results['hits']['hits']
    # Ker se zapis zemljepisne dolzine in sirine zapise napacno (s prevec decimalkami), jih zaokrozimo na 7 decimalk
    for hit in search_results['hits']['hits']:
        if 'latitude' in hit['_source']:
            #print round(float(hit['_source']['latitude']),7)
            hit['_source']['latitude'] = str(round(float(hit['_source']['latitude']),7))
        if 'longitude' in hit['_source']:
            #print round(float(hit['_source']['longitude']),7)
            hit['_source']['longitude'] = str(round(float(hit['_source']['longitude']),7))
    print 'Zacetek izvoza'
    results = exporter.export(search_results['hits']['hits'], search_criteria)
    #related_resources = [{'id1':rr.entityid1, 'id2':rr.entityid2, 'type':rr.relationshiptype} for rr in models.RelatedResource.objects.all()] 
    #csv_name = 'resource_relationships.csv'
    dest = StringIO()
    #csvwriter = csv.DictWriter(dest, delimiter=',', fieldnames=['id1','id2','type'])
    #csvwriter.writeheader()
    #for csv_record in related_resources:
    #    csvwriter.writerow({k:v.encode('utf8') for k,v in csv_record.items()})
    #results.append({'name':csv_name, 'outputfile': dest})
    
    zipped_results = exporter.zip_response(results, '{0}_{1}_export.zip'.format(settings.PACKAGE_NAME, format))
    print 'Konec izvoza'
    return zipped_results
    
def _get_child_concepts(conceptid):
    ret = set([conceptid])
    for row in Concept().get_child_concepts(conceptid, ['narrower'], ['prefLabel'], 'prefLabel'):
        ret.add(row[0])
        ret.add(row[1])
    return list(ret)
