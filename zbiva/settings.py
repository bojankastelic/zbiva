# -*- coding: utf-8 -*-
import os
import inspect
from arches_hip.settings import *
from django.utils.translation import ugettext as _

PACKAGE_ROOT = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
PACKAGE_NAME = PACKAGE_ROOT.split(os.sep)[-1]
DATABASES['default']['NAME'] = 'arches_%s' % (PACKAGE_NAME)
ROOT_URLCONF = '%s.urls' % (PACKAGE_NAME)

INSTALLED_APPS = INSTALLED_APPS + ('django.contrib.humanize','django.contrib.sitemaps', PACKAGE_NAME,)

STATICFILES_DIRS = (os.path.join(PACKAGE_ROOT, 'media'),) + STATICFILES_DIRS
TEMPLATE_DIRS = (os.path.join(PACKAGE_ROOT, 'templates'),os.path.join(PACKAGE_ROOT, 'templatetags')) + TEMPLATE_DIRS

# Absolute filesystem path to the directory that will hold user-uploaded files.
MEDIA_ROOT =  os.path.join(PACKAGE_ROOT, 'uploadedfiles')

RESOURCE_MODEL = {'default': 'zbiva.models.resource.Resource'}

DATABASES['default']['POSTGIS_TEMPLATE'] = 'template_postgis_20'
BING_KEY = 'YOUR BING KEY'

PACKAGE_VALIDATOR = 'zbiva.source_data.validation.Zbiva_Validator'

SEARCH_ITEMS_PER_PAGE = 50

DEBUG = False
STATIC_ROOT = '/home/zbiva/Projects/zbiva/zbiva/static/'
ALLOWED_HOSTS = ['zbiva.zrc-sazu.si']

ADMINS = (
     ('*********', '******@******'),
)

INDEX_SI = "http://iza.zrc-sazu.si/Zbiva/si/o_zbivi.html"
INDEX_EN = "http://iza.zrc-sazu.si/Zbiva/en/about.html"
INDEX_DE = "http://iza.zrc-sazu.si/Zbiva/de/Hauptseite.html"
HELP_SI = "http://iza.zrc-sazu.si/Zbiva/si/pomoc.html"
HELP_EN = "http://iza.zrc-sazu.si/Zbiva/en/help.html"
HELP_DE = "http://iza.zrc-sazu.si/Zbiva/de/Suchhinweise.html"   

# Gmail
EMAIL_USE_TLS = True
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_HOST_PASSWORD = '***********'
EMAIL_PORT = 587
EMAIL_HOST_USER = 'Zbiva-ZRC-SAZU<*****@*******>'

#EMAIL_USE_SSL = True
EMAIL_TIMEOUT = 15
#EMAIL_SSL_KEYFILE = ''
#EMAIL_SSL_CERTFILE = ''

#EMAIL_HOST = 'localhost'
#EMAIL_PORT = 1025

EMAIL_FROM = 'Zbiva<*****@******>'

DEFAULT_MAP_X = 1608255
DEFAULT_MAP_Y = 5779060

DEFAULT_MAP_X = 1649235 #-13179347.3099
DEFAULT_MAP_Y = 5799591 #4031285.8349
DEFAULT_MAP_X = 1549235 
DEFAULT_MAP_Y = 5729591
DEFAULT_MAP_ZOOM = 6
MAP_MIN_ZOOM = 1
MAP_MAX_ZOOM = 25
MAP_EXTENT = '1491451,5680729,1855482,5929510'
MAP_EXTENT = '1451451,4900729,1955482,6329510'

LANGUAGE_CODE = 'en-US'
LOCALE_NAME = 'sl_SI'

# Na iPhoneu in iPadu se ne prikaze: RESOURCE_MARKER_ICON_UNICODE = '\u29EB'
# Premalo podolgovat (predebel), vendar edini dela na iPadu in iPhone-u: 
RESOURCE_MARKER_ICON_UNICODE = '\u2666'
# Prevelik: RESOURCE_MARKER_ICON_UNICODE = '\u2B27' 
RESOURCE_MARKER_ICON_FONT = 'octicons'
RESOURCE_MARKER_DEFAULT_COLOR = '#C4171D'

gettext = lambda s: s
LANGUAGES = (
    ('sl', gettext('Slovenscina')),
    ('de', gettext('Deutsch')),
    ('en', gettext('English')),
)

LOCALE_PATHS = (
    os.path.join("/".join(PACKAGE_ROOT.split('/')[:-1]), 'locale'),
    os.path.join(ROOT_DIR, 'locale'),
)

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True
USE_L10N = True

DATE_FORMAT = "d.m.Y"
DATETIME_FORMAT = "d.m.Y"

MIDDLEWARE_CLASSES = (
   'django.contrib.sessions.middleware.SessionMiddleware',
   'django.middleware.locale.LocaleMiddleware',
   'django.middleware.common.CommonMiddleware',
   #'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'arches.app.utils.set_anonymous_user.SetAnonymousUser',
)

#STATIC_URL = '/zbiva/media/'
STATIC_URL = '/media/'

def RESOURCE_TYPE_CONFIGS():
    return {
        'SITE.E18': {
            'resourcetypeid': 'SITE.E18',
            'name': _('Site'),
            'icon_class': 'fa fa-university',
            'default_page': 'summary',
            'default_description': _('No description available'),
            'description_node': _('Other name') + ': ' + '#OTHER_NAME.E48#' + '; ' + _('Settlement') + ': ' + '#SETTLEMENT.E48#' + '; ' + _('Topographical unit') + ': ' + '#TOPOGRAPHICAL_UNIT.E48#' + '; ' + _('Topographical area') + ': ' + '#TOPOGRAPHICAL_AREA.E48#' + '; ' + _('Region') + ': ' + '#REGION.E55#' + '; ' + _('Country') + ': ' + '#COUNTRY.E55#',
            'categories': [_('Resource')],
            'has_layer': True,
            'on_map': True,
            'marker_color': '#C4171D',
            'stroke_color': '#cf454a',
            'fill_color': '#db7377',
            'primary_name_lookup': {
                'entity_type': 'SITE_NAME.E41',
                'lookup_value': 'Primary'
            },
            'sort_order': 2
        },
        'GRAVE.E18': {
            'resourcetypeid': 'GRAVE.E18',
            'name': _('Grave'),
            'icon_class': 'fa fa-plus-square-o',
            'default_page': 'summary',
            'default_description': _('No description available'),
            'description_node': _('Site name') + ': ' + '#SITE_NAME.E41#' + '; ' + _('Other name') + ': ' + '#OTHER_NAME.E48#' + '; ' + _('Settlement') + ': ' + '#SETTLEMENT.E48#' + '; ' + _('Topographical unit') + ': ' + '#TOPOGRAPHICAL_UNIT.E48#' + '; ' + _('Topographical area') + ': ' + '#TOPOGRAPHICAL_AREA.E48#' + '; ' + _('Region') + ': ' + '#REGION.E55#' + '; ' + _('Country') + ': ' + '#COUNTRY.E55#',
            'categories': [_('Resource')],
            'has_layer': True,
            'on_map': True,
            'marker_color': '#a44b0f',
            'stroke_color': '#a7673d',
            'fill_color': '#c8b2a3',
            'primary_name_lookup': {
                'entity_type': 'GRAVE_CODE.E42'
            },
            'sort_order': 3
        },
        'OBJECT.E18': {
            'resourcetypeid': 'OBJECT.E18',
            'name': _('Object'),
            'icon_class': 'fa fa-circle-o-notch',
            'default_page': 'summary',
            'default_description': _('No description available'),
            'description_node': _('Site name') + ': ' + '#SITE_NAME.E41#' + '; ' + _('Other name') + ': ' + '#OTHER_NAME.E48#' + '; ' + _('Settlement') + ': ' + '#SETTLEMENT.E48#' + '; ' + _('Topographical unit') + ': ' + '#TOPOGRAPHICAL_UNIT.E48#' + '; ' + _('Topographical area') + ': ' + '#TOPOGRAPHICAL_AREA.E48#' + '; ' + _('Region') + ': ' + '#REGION.E55#' + '; ' + _('Country') + ': ' + '#COUNTRY.E55#' + '; ' + _('Grave, building, SE') + ': ' + '#GRAVE_SE.E62#' + '; ' + _('Object') + ': ' + '#OBJECT_TYPE.E55#' + '; ' + _('Description') + ': ' + '#OBJECT_DESCRIPTION.E62#',
            'categories': [_('Resource')],
            'has_layer': True,
            'on_map': True,
            'marker_color': '#fa6003',
            'stroke_color': '#fb8c49',
            'fill_color': '#ffc29e',
            'primary_name_lookup': {
                'entity_type': 'OBJECT_CODE.E42'
            },
            'sort_order': 3
        },
        'INFORMATION_RESOURCE.E73': {
            'resourcetypeid': 'INFORMATION_RESOURCE.E73',
            'name': _('Information Resource'),
            'icon_class': 'fa fa-file-text-o',
            'default_page': 'information-resource-summary',
            'default_description': _('No description available'),
            'description_node': _('INSERT RESOURCE DESCRIPTION NODE HERE'),
            'categories': [_('Resource')],
            'has_layer': True,
            'on_map': False,
            'marker_color': '#8D45F8',
            'stroke_color': '#32a2a2',
            'fill_color': '#66b9b9',
            'primary_name_lookup': {
                'entity_type': 'TITLE.E41',
                'lookup_value': 'Primary'
            },
            'sort_order': 5
        }
    }


#GEOCODING_PROVIDER = ''

RESOURCE_GRAPH_LOCATIONS = (
    # Put strings here, like "/home/data/resource_graphs" or "C:/data/resource_graphs".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(PACKAGE_ROOT, 'source_data', 'resource_graphs'),
)


CONCEPT_SCHEME_LOCATIONS = (
    # Put strings here, like "/home/data/authority_files" or "C:/data/authority_files".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    
    #'absolute/path/to/authority_files',
    # os.path.normpath(os.path.join(PACKAGE_ROOT, 'source_data', 'concepts', 'authority_files')),
)

BUSISNESS_DATA_FILES = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    # os.path.normpath(os.path.join(PACKAGE_ROOT, 'source_data', 'business_data', 'sample.arches')),
)

APP_NAME = 'Zbiva'

TIME_ZONE = 'America/Chicago'
USE_TZ = False

# Definicija vseh terminov, po katerih imamo predvidena shranjena iskanja (zaradi ID-jev, ki se ob vsajen uvozu spremenijo)
SEARCH_TERMS = []
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'hoop with short loops',
                     'text_key': 'NO0205_0201'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'loop and hook',
                     'text_key': 'NO0100_0201'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'hoop with long loop',
                     'text_key': 'NO0300_0201'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'forged s-shaped loop',
                     'text_key': 'NO0100_0501'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'straight ends',
                     'text_key': 'NO0100_0606'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'one thickening at one end',
                     'text_key': 'NO0100_0608'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'forged crescent',
                     'text_key': 'NO0500_0610'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'one thickening at both ends',
                     'text_key': 'NO0100_0808'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cast crescent',
                     'text_key': 'NO0600_0610'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'several thickenings at both ends',
                     'text_key': 'NO0100_0909'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'astragal-shaped thickenings',
                     'text_key': 'NO0700_0810'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'several thickenings at one end',
                     'text_key': 'NO0100_0709'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': u'naglavni obroček',
                     'text_key': 'naglavni_obrocek'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'oblika',
                     'text_key': 'oblika'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'coil-shaped',
                     'text_key': 'JOS01'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'roll-shaped',
                     'text_key': 'JOS02'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'globular-shaped',
                     'text_key': 'JOS03'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'prong-shaped',
                     'text_key': 'JOS04'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'biconical',
                     'text_key': 'JOS05'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'polyedric-shaped',
                     'text_key': 'JOS06'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'prism-shaped',
                     'text_key': 'JOS07'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'poppy-seed-shaped',
                     'text_key': 'JOS08'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cylinder-shaped',
                     'text_key': 'JOS09'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'spiral-shaped',
                     'text_key': 'JOS10'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'almond-shaped',
                     'text_key': 'JOS11'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'oblong-cylinder-shaped',
                     'text_key': 'JOS12'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'spindle-shaped',
                     'text_key': 'JOS14'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'prerez',
                     'text_key': 'prerez'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cross section: round',
                     'text_key': 'JOP01'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cross section: hollow',
                     'text_key': 'JOP02'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cross section: multipart',
                     'text_key': 'JOP03'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cross section: flat',
                     'text_key': 'JOP04'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cross section: rhombic',
                     'text_key': 'JOP05'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cross section: quadrangle',
                     'text_key': 'JOP06'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cross section: hexagonal',
                     'text_key': 'JOP07'})
SEARCH_TERMS.append({'context_label': 'Object Feature', 
                     'context_key': 'Object_Feature', 
                     'text': 'cross section: ribbed',
                     'text_key': 'JOP08'})

RANGE_TERMS = []
RANGE_TERMS.append({'context_label': 'Beginning Of Existence Type', 
                     'context_key': 'Beginning_Of_Existence_Type', 
                     'text': 'First Date',
                     'text_key': 'First_Date'})
RANGE_TERMS.append({'context_label': 'End Of Existence Type', 
                     'context_key': 'End_Of_Existence_Type', 
                     'text': 'Last Date',
                     'text_key': 'Last_Date'})
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': os.path.join(PACKAGE_ROOT, 'logs', 'application.txt'),
        },
    },
    'loggers': {
        'arches': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'zbiva': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

EXPORT_CONFIG = os.path.normpath(os.path.join(PACKAGE_ROOT, 'source_data', 'resource_export_mappings.json'))

try:
    from settings_local import *
except ImportError:
    pass
