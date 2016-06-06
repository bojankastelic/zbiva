define([
    'jquery',
    'openlayers',
    'underscore',
    'arches'
], function($, ol, _, arches) {
    var baseLayers = arches.bingLayers;

    _.each(baseLayers, function(layer) {
        layer.layer = new ol.layer.Tile({
            visible: false,
            preload: Infinity,
            source: new ol.source.BingMaps({
                key: arches.bingKey,
                imagerySet: layer.id
            })
        });
    });

    baseLayers.splice(0,1);
    baseLayers.splice(1,1);

    _.each(arches.OSMLayers, function(layer) {
        baseLayers.unshift({
            id: layer.id,
            name: layer.name,
            icon: layer.icon,
            layer: new ol.layer.Tile({
                visible: false,
                source: new ol.source.XYZ({
                    url: layer.url
                })
            }),
            custom: layer.custom
        });
    });
    
    /*
    extent1 = [14.35522505526365,46.23901228878026]
    extent1 = ol.proj.transform(extent1, 'EPSG:4326','EPSG:3857');
    extent = [extent1[0]-3, extent1[1]-142, extent1[0]+150, extent1[1]+8];
    //console.log(extent);
    baseLayers.push({
        custom: '1',
        id: 'Kranj',
        name: 'Župna cerkev, Kranj',
        icon: arches.urls.media + 'img/logo_Zbiva.png',
        extent: extent,
        layer: new ol.layer.Image({
            source: new ol.source.ImageStatic({
                url: arches.urls.media + 'img/image_layers/Kranj_2015.png',
                imageExtent: extent 
            }),
            opacity: 0.7
        })
    });
    */
    extent1 = [15.065903663635252, 46.50876045823123]
    extent1 = ol.proj.transform(extent1, 'EPSG:4326','EPSG:3857');
    extent = [extent1[0]-74.58, extent1[1]-78.7, extent1[0], extent1[1]+44.1];
    baseLayers.push({
        custom: '1',
        id: 'Puscava',
        name: 'Puščava, Stari trg',
        icon: arches.urls.media + 'img/logo_Zbiva.png',
        extent: extent,
        layer: new ol.layer.Image({
            source: new ol.source.ImageStatic({
                url: arches.urls.media + 'img/image_layers/Puscava_WGS84_3.jpg',
                imageExtent: extent 
            }),
            opacity: 0.7
        })
    });

    
    //set default map style to Roads
    baseLayers[0].layer.setVisible(true);
    baseLayers[2].layer.setVisible(false);
    //baseLayers[3].layer.setVisible(false);
   
    return baseLayers;
 
});
