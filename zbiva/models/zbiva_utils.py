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
from arches.management.commands import utils
from django.core.mail import EmailMultiAlternatives
from django.core import mail
from django.utils.translation import ugettext as _

entities = []
errors = []
curr_status = ""

def fill_all_entities(child_entities):
    for entity in child_entities:
        entities.append(entity)
        if entity.child_entities:
            fill_all_entities(entity.child_entities)
            
def get_current_type(resource):
    del entities[:]
    fill_all_entities(resource.child_entities)
    for entity in entities:
        if entity.entitytypeid == 'HERITAGE_RESOURCE_TYPE.E55':
            return entity.label

def get_settlement(resource):
    del entities[:]
    fill_all_entities(resource.child_entities)
    for entity in entities:
        if entity.entitytypeid == 'SETTLEMENT.E48':
            return entity.label
    return ''
    
def get_site_name(resource):
    del entities[:]
    fill_all_entities(resource.child_entities)
    for entity in entities:
        if entity.entitytypeid == 'SITE_NAME.E41':
            return entity.label
    return ''

# TODO !!!
def get_parent_name(resource):
    del entities[:]
    return '!!!'

def get_resource_icon(resource):
    del entities[:]
    fill_all_entities(resource.child_entities)
    ew_status = ''
    ew_type = ''
    element = ''
    material = ''
    construction_type = ''
    icon = '\uf060'
    
    for entity in entities:
        if entity.entitytypeid == 'EW_STATUS.E55':
            ew_status = entity.label
        if entity.entitytypeid == 'RESOURCE_TYPE_CLASSIFICATION.E55':
            ew_type = entity.label
        if entity.entitytypeid == 'COMPONENT_TYPE.E55':
            element = element + '<' + entity.label + '>'
        if entity.entitytypeid == 'MATERIAL.E57':
            material = material + '<' + entity.label + '>'
        if entity.entitytypeid == 'CONSTRUCTION_TYPE.E55':
            construction_type = construction_type + '<' + entity.label + '>'
    if (element == ''):
       element = '<Watercraft>'
       construction_type = '<Original>'
    # Ikone za ladje
    if ('<Watercraft>' in element):
        if (ew_type == 'Boat'):
            icon = u'\ue00d'
        else:
            if (ew_type == 'Coracle'):
                icon = u'\ue00c'
            else:
                if (ew_type == 'Raft'):
                    icon = u'\ue001'
                else:
                    if (ew_type == 'Canoe'):
                        icon = u'\ue00f'
                    else:
                        if (ew_type == 'Kayak'):
                            icon = u'\ue00e'
                        else:
                            if (ew_type == 'Board'):
                                icon = u'\ue00b'
    else:
        # Ikona za veslo
        if ('<Paddle>' in element):
            icon = u'\ue002'
        # Ikona za jadro
        if ('<Sail>' in element):
            icon = u'\ue00a'
        # Ikona za okvir
        if ('<Frame>' in element):
            icon = u'\ue007'
    
    # Za ostale tipe zaenkrat ne damo nobene posebne ikone
    if (resource.entitytypeid != 'HERITAGE_RESOURCE.E18' and resource.entitytypeid != 'HERITAGE_RESOURCE_GROUP.E27'):
        icon = u''
    
    # Ikone glede na status
    icon_status = ''
    if (ew_status == 'Draft'):
        icon_status = u'\uf011'
    else:
        if (ew_status == 'Pending approval'):
            icon_status = u'\uf02c'
        else:
            if ew_status == 'Approval rejected':
                icon_status = u'\uf081'
    # Barva glede na material 
    color = '#C4171D'
    if ('<Log>' in material):
        # Rjava
        color = '#8A4B08'
    if ('<Bark>' in material):
        # Siva
        color = '#585858'
    if ('<Bamboo>' in material):
        # Zelena
        color = '#088A08'
    if ('<Reed>' in material):
        # Oranzna
        color = '#B18904'
    if ('<Skin>' in material):
        # Roza
        color = '#F781BE'
    # Crke glede na tip konstrukcije
    con_type = ''
    if ('<Original>' in construction_type):
        con_type = ''
    else:
        if ('<Replica>' in construction_type):
            con_type = 'REP'
        else:
            if ('<Reconstruction>' in construction_type):
                con_type = 'REC'
            else:
                if ('<Virtual reconstruction>' in construction_type):
                    con_type = 'VRC'    
                else:
                    if ('<Model>' in construction_type):
                        con_type = 'MOD'
    icon_type = {'icon_type': icon, 'status': icon_status, 'color': color, 'con_type': con_type}
    
    return icon_type

def send_mail_to_admins(subject, error_message):
    recipients = []
    for admin in settings.ADMINS:
        recipients.append(admin[1])
    from_email = settings.EMAIL_FROM
    text_content = error_message.replace('<br>','\n')
    html_content = error_message
    #print html_content
    
    msg = EmailMultiAlternatives(subject, text_content, from_email, recipients)
    msg.attach_alternative(html_content, "text/html")            
    msg.content_subtype = "html"  # Main content is now text/html
    
    # Posljemo mail
    connection = mail.get_connection()
    
    # Manually open the connection
    connection.open()

    # Construct an email message that uses the connection
    msg.send()
    
    connection.close() 
    #print 'Mail poslan!'

