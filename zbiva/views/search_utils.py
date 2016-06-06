from django.conf import settings
from arches.app.search.search_engine_factory import SearchEngineFactory
from arches.app.views.concept import get_preflabel_from_conceptid
from arches.app.search.elasticsearch_dsl_builder import Query, Bool, Match
from django.core.cache import cache

def get_auto_filter(request, searchType):
    lang = request.GET.get('lang', settings.LANGUAGE_CODE)
    se1 = SearchEngineFactory().create()
    classificationTerm = 'Heritage Resource Type'
    searchString1 = searchType
    query1 = Query(se1, start=0, limit=settings.SEARCH_DROPDOWN_LENGTH)
    boolquery1 = Bool()
    boolquery1.should(Match(field='term', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
    boolquery1.should(Match(field='term.folded', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
    boolquery1.should(Match(field='term.folded', query=searchString1.lower(), fuzziness='AUTO'))
    query1.add_query(boolquery1)
    results1 = query1.search(index='term', doc_type='value')
    conceptid1 = ''
    context1 = ''
    for result1 in results1['hits']['hits']:
        prefLabel = get_preflabel_from_conceptid(result1['_source']['context'], lang)
        result1['_source']['options']['context_label'] = prefLabel['value']
        if (prefLabel['value'] == classificationTerm and result1['_source']['term'] == searchType)  :
            conceptid1 = result1['_source']['options']['conceptid']
            context1 = result1['_source']['context']
    AUTO_TERM_FILTER = {"inverted": False, "type": "concept"}
    AUTO_TERM_FILTER["text"] = searchType
    AUTO_TERM_FILTER["value"] = conceptid1
    AUTO_TERM_FILTER["context"] = context1
    AUTO_TERM_FILTER["context_label"] = classificationTerm
    AUTO_TERM_FILTER["id"] = AUTO_TERM_FILTER['text'] + conceptid1
    return AUTO_TERM_FILTER
    
def get_search_contexts(request):
    search_context = {}
    search_context = cache.get('search_contexts')
    if search_context is not None:
        #print 'Search_context iz cacha!'
        return search_context
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    se1 = SearchEngineFactory().create()
    context_label1 = '-'
    search_context = {}
    for search_term in settings.SEARCH_TERMS:
        searchString1 = search_term['text']
        query1 = Query(se1, start=0, limit=settings.SEARCH_DROPDOWN_LENGTH)
        boolquery1 = Bool()
        boolquery1.should(Match(field='term', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
        boolquery1.should(Match(field='term.folded', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
        boolquery1.should(Match(field='term.folded', query=searchString1.lower(), fuzziness='AUTO'))
        query1.add_query(boolquery1)
        results1 = query1.search(index='term', doc_type='value')
        conceptid1 = ''
        context1 = ''
        for result1 in results1['hits']['hits']:
            prefLabel = get_preflabel_from_conceptid(result1['_source']['context'], lang)
            result1['_source']['options']['context_label'] = prefLabel['value']
            if (prefLabel['value'] == search_term['context_label'] and result1['_source']['term'] == search_term['text']):
                conceptid1 = result1['_source']['options']['conceptid']
                context1 = result1['_source']['context']
                #print search_term['context_label'] + ': ' + conceptid1
                #print searchString1
                #print result1
        result = {'conceptid': conceptid1, 'context': context1}
        if context_label1 <> search_term['context_label']:
            value = {}
        #print result
        value[search_term['text_key']] = result
        #print value
        search_context[search_term['context_key']] = value
        #print search_context
        #print 'Iscem [' + search_term['context_label'] + '][' + search_term['text']  + ']'
        #print value
        context_label1 = search_term['context_label']
    #print search_context
    #print search_context['Historical_Period']['BRONZE_AGE']
    #print 'Shranjujem search_context v cache'
    cache.set('search_contexts', search_context, 86400)

    return search_context
    
def get_search_range_contexts(request):
    search_range_context = {}
    search_range_context = cache.get('search_range_contexts')
    if search_range_context is not None:
        #print 'Search_range_context iz cacha!'
        return search_range_context
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    se1 = SearchEngineFactory().create()
    context_label1 = '-'
    search_range_context = {}
    for search_term in settings.RANGE_TERMS:
        searchString1 = search_term['text']
        query1 = Query(se1, start=0, limit=settings.SEARCH_DROPDOWN_LENGTH)
        boolquery1 = Bool()
        boolquery1.should(Match(field='term', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
        boolquery1.should(Match(field='term.folded', query=searchString1.lower(), type='phrase_prefix', fuzziness='AUTO'))
        boolquery1.should(Match(field='term.folded', query=searchString1.lower(), fuzziness='AUTO'))
        query1.add_query(boolquery1)
        results1 = query1.search(index='term', doc_type='value')
        conceptid1 = ''
        context1 = ''
        for result1 in results1['hits']['hits']:
            prefLabel = get_preflabel_from_conceptid(result1['_source']['context'], lang)
            result1['_source']['options']['context_label'] = prefLabel['value']
            if (prefLabel['value'] == search_term['context_label'] and result1['_source']['term'] == search_term['text']):
                #print result1['_source']['ids'][0]
                conceptid1 = result1['_source']['options']['conceptid']
                context1 = result1['_source']['context']
                valueid1 = result1['_source']['ids'][0]
                #print search_term['context_label'] + ': ' + conceptid1
                #print searchString1
                #print result1
        result = {'conceptid': conceptid1, 'context': context1, 'valueid': valueid1}
        if context_label1 <> search_term['context_label']:
            value = {}
        #print result
        value[search_term['text_key']] = result
        #print value
        search_range_context[search_term['context_key']] = value
        #print search_range_context
        #print 'Iscem [' + search_term['context_label'] + '][' + search_term['text']  + ']'
        #print value
        context_label1 = search_term['context_label']
    #print search_range_context
    #print search_range_context['Historical_Period']['BRONZE_AGE']
    #print 'Shranjujem search_range_context v cache'
    cache.set('search_range_contexts', search_range_context, 86400)
    return search_range_context
