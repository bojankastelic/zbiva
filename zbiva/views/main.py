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
from django.template import RequestContext
from django.shortcuts import render_to_response, redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache
from django.contrib.auth import authenticate, login, logout
from django.core.urlresolvers import reverse
from django.conf import settings
from django.contrib.auth.models import User

def index(request):
    lang = request.GET.get('lang', request.LANGUAGE_CODE)
    url = settings.INDEX_SI
    if request.LANGUAGE_CODE == 'de':
        url = settings.INDEX_DE
    if request.LANGUAGE_CODE == 'en':
        url = settings.INDEX_EN
    response = urllib.urlopen(url)
    data = response.read()
    return render_to_response('index.htm', {
            'main_script': 'index',
            'active_page': 'Home',
            'html_data': data
        },
        context_instance=RequestContext(request))


@never_cache
@csrf_exempt
def auth(request):
    auth_attempt_success = None
    # POST request is taken to mean user is logging in
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(username=username, password=password)
        if user is not None and user.is_active:
            login(request, user)
            user.password = ''
            auth_attempt_success = True
        else:
            auth_attempt_success = False
    
    next = request.GET.get('next', reverse('home'))
    if auth_attempt_success:
        return redirect(next)
    else:
        if request.GET.get('logout', None) is not None:
            logout(request)
            # need to redirect to 'auth' so that the user is set to anonymous via the middleware
            return redirect('auth')
        else:
            return render_to_response('login.htm', {
                    'main_script': 'login',
                    'auth_failed': (auth_attempt_success is not None),
                    'next': next
                },
                context_instance=RequestContext(request))


def search(request):
    return render_to_response('search.htm', context_instance=RequestContext(request))
