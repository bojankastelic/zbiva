from django.core.urlresolvers import reverse
from django.contrib.sitemaps import Sitemap
from django.db import connection
from arches.app.search.search_engine_factory import SearchEngineFactory
import arches.app.models.models as archesmodels

class MySiteSitemap(Sitemap):

    def items(self):
        se = SearchEngineFactory().create()

        cursor = connection.cursor()
        cursor.execute("""select entitytypeid from data.entity_types where isresource = TRUE""")
        resource_types = cursor.fetchall()
        
        sites = ['home', 'help', 'map', 'search_home', 'search_sites', 'search_graves', 'search_objects']
        for resource_type in resource_types:
            if 'INFORMATION_RESOURCE.E73' not in resource_type:
                resources = archesmodels.Entities.objects.filter(entitytypeid = resource_type)
                for resource in resources:
                    report = "report/" + resource.entityid
                    sites.append(report)
        return sites

    def location(self, item):
        if item[:7] == 'report/':
            resourceid = item[7:]
            return reverse(item[:6], kwargs={'resourceid':resourceid})
        return reverse(item)
        
sitemaps = {'views': MySiteSitemap}
