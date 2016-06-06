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

from arches_hip import urls as arches_hip_urls
from django.conf.urls import patterns, url, include
from django.contrib.sitemaps.views import sitemap
from zbiva.sitemap import MySiteSitemap

uuid_regex = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

urlpatterns = patterns('',
    url(r'^$', 'zbiva.views.main.index'),
    url(r'^index.htm', 'zbiva.views.main.index', name='home'),
    url(r'^help.htm', 'zbiva.views.resources.help', name='help'),
    url(r'^reports/(?P<resourceid>%s)$' % uuid_regex , 'zbiva.views.resources.report', name='report'),
    url(r'^resources/(?P<resourcetypeid>[0-9a-zA-Z_.]*)/(?P<form_id>[a-zA-Z_-]*)/(?P<resourceid>%s|())$' % uuid_regex, 'zbiva.views.resources.resource_manager', name="resource_manager"),
    url(r'^concepts/search$', 'zbiva.views.concept.search', name="concept_search"),
    url(r'^concepts/search_sparql_endpoint$', 'zbiva.views.concept.search_sparql_endpoint_for_concepts', name="search_sparql_endpoint"),
    url(r'^concepts/(?P<conceptid>%s)/confirm_delete/$' % uuid_regex, 'zbiva.views.concept.confirm_delete', name="confirm_delete"),     
    url(r'^search$', 'zbiva.views.search.home_page', name="search_home"),
    url(r'^search_sites$', 'zbiva.views.search.home_page_sites', name="search_sites"),
    url(r'^search_graves$', 'zbiva.views.search.home_page_graves', name="search_graves"),
    url(r'^search_objects$', 'zbiva.views.search.home_page_objects', name="search_objects"),
    url(r'^search/resources$', 'zbiva.views.search.search_results', name="search_results"),
    url(r'^search/export$', 'zbiva.views.search.export_results', name="search_results_export"),
    url(r'^search/terms$', 'zbiva.views.search.search_terms', name="search_terms"),
    url(r'^buffer/$', 'zbiva.views.search.buffer', name="buffer"),
    url(r'^resources/layers/(?P<entitytypeid>.*)$', 'zbiva.views.resources.map_layers', name="map_layers"),
    url(r'^resources/markers/(?P<entitytypeid>.*)$', 'zbiva.views.resources.map_layers', {'get_centroids':True}, name="map_markers"),    
    url(r'^get_admin_areas','zbiva.views.resources.get_admin_areas', name='get_admin_areas'),
    url(r'', include(arches_hip_urls)),
    url(r'^i18n/', include('django.conf.urls.i18n')),
    # SEO
    url(r'^sitemap\.xml$', sitemap, {'sitemaps': {'entry': MySiteSitemap}},
        name='django.contrib.sitemaps.views.sitemap'),
)
