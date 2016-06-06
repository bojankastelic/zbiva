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

#!/usr/bin/env python
import sys
import os
from os import listdir
from os.path import isfile, join
from PIL import Image, ImageOps

if __name__ == "__main__":
    print 'Parameter: '
    print sys.argv[1]
    mypath = sys.argv[1]
    print 'Seznam vseh slik:'
    from os import walk
    
    size = 128,128

    def generate_thumbnail(path, file):
        file_name, file_extension = os.path.splitext(filename)
        infile = path + '/' + file
        if file_extension.upper() == '.GIF':
           outfile = path + '/' + 'thumb_' + file_name + '.gif'
        else:
           outfile = path + '/' + 'thumb_' + file_name + '.jpg'
        
        if infile != outfile:
            try:
                im = Image.open(infile)
                thumb = ImageOps.fit(im, (128,128), Image.ANTIALIAS)
                try:
                    if file_extension.upper() == '.GIF':
                        thumb.save(outfile, 'GIF')
                    else:
                        thumb.save(outfile, 'JPEG')
                except:
                    table = [i/256 for i in range(65536)]
                    thumb = thumb.point(table, 'L')
                    thumb.save(outfile, 'JPEG')
            except:
                print "cannot create thumbnail for", infile
    
    def generate_thumbnail2(path, file):
        #im = Image.open(file)
        #thumb = ImageOps.fit(im, (128,128), Image.ANTIALIAS)
        #f = io.BytesIO()
        #try:
        #  thumb.save(f, 'JPEG')
        #except:
        #    table = [i/256 for i in range(65536)]
        #    thumb = thumb.point(table, 'L')
        #    thumb.save(f, 'JPEG')
        #return SimpleUploadedFile('%s_%s.%s' % ('thumb', os.path.splitext(file.name)[0], 'jpg'), f.getvalue(), content_type='image/jpeg')
        
        file_name, file_extension = os.path.splitext(filename)
        
        infile = path + '/' + file
        outfile = path + '/' + 'thumb_' + file_name + '.jpg'
        if infile != outfile:
            try:
                im = Image.open(infile)
                im.thumbnail(size)
                im.save(outfile, "JPEG")
            except:
                print "cannot create thumbnail for", infile
                
    for (dirpath, dirnames, filenames) in walk(mypath):
        for filename in filenames:
            file_name, file_extension = os.path.splitext(filename)
            if (file_extension.upper() == '.GIF' or file_extension.upper() == '.PNG' or file_extension.upper() == '.JPG') and not file_name.startswith('thumb_'):
                print 'Creating thumbnail for: ' + dirpath + '/' + filename
                generate_thumbnail(dirpath, filename)

    
