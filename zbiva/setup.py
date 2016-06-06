import os
import sys
from django.conf import settings
from django.core import management
import arches_hip.setup as setup
from management.commands.package_utils import authority_files
from arches.db.install import install_db
from zbiva.models.resource import Resource
from zbiva.utils.data_management.resources.importer import ResourceLoader
import os.path

def install(path_to_source_data_dir=None):
    setup.install()
    install_zbiva_db()
    create_indexes()   

def load_resource_graphs():
    setup.resource_graphs.load_graphs(break_on_error=True)

def load_authority_files(path_to_files=None):
    setup.authority_files.load_authority_files(path_to_files, break_on_error=True)

def load_resources(external_file=None):
    setup.load_resources(external_file)

def load_authority_files(path_to_files=None):
    authority_files.load_authority_files(path_to_files, break_on_error=True)
    
def install_zbiva_db():
    zbiva_db_settings = settings.DATABASES['default']
    install_zbiva_path = os.path.join(os.path.dirname(settings.PACKAGE_ROOT), 'db', 'install', 'install_zbiva_db.sql')  
    print install_zbiva_path
    zbiva_db_settings['install_path'] = install_zbiva_path   
        
    os.system('psql -h %(HOST)s -p %(PORT)s -U %(USER)s -d %(NAME)s -f "%(install_path)s"' % zbiva_db_settings)

def create_indexes():
    Resource().prepare_resource_relations_index(create=True)
    Resource().prepare_search_index('SITE.E18', create=True)
    Resource().prepare_search_index('GRAVE.E18', create=True)
    Resource().prepare_search_index('OBJECT.E18', create=True)

def load_resources(external_file=None):
    rl = ResourceLoader()
    if external_file != None:
        print 'loading:', external_file
        rl.load(external_file)
    else:
        for f in settings.BUSISNESS_DATA_FILES:
            rl.load(f)
