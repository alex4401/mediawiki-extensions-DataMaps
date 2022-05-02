(function($, mw) {
    var mapConfigs = mw.config.get('dataMaps');

    function loadMapData(pageName, version) {
        var url = mw.util.getUrl(pageName, {
            action: 'raw',
            ctype: 'application/json',
            version: version,
        });
        return fetch(url).then(function (response) {
            return response.json();
        });
    }

    function initialiseMap($map, config) {
        if ($map.data('initialised')) {
            return;
        }
        $map.data('initialised', true);

        loadMapData(config.pageName, config.version).then(function(data) {
            var halvedImageBounds = [config.imageBounds[0]/2, config.imageBounds[1]/2];
            var ctx = {
                config: config,
                data: data,
                leaflet: L.map($map.get(0), {
                    crs: L.CRS.Simple,
                    center: [50, 100],
                    zoom: 1,
                }),
                coordSpace: config.coordinateBounds,

                leafletIcons: {},
                leafletLayers: {},
            };

            //ctx.leaflet.setMaxBounds([[0,0],[100, 100]]);
            L.imageOverlay(config.image, [[0,0],[100,100]]).addTo(ctx.leaflet);

            for (var groupName in config.groups) {
                var group = config.groups[groupName];
                ctx.leafletIcons[groupName] = L.icon({ iconUrl: group.icon, iconSize: [32, 32] });
            }
    
            for (var markerType in data.markers) {
                var groupName = markerType.split(' ', 1)[0];
                var group = config.groups[groupName];
                var placements = data.markers[markerType];

                var layer = L.featureGroup().addTo(ctx.leaflet);
                ctx.leafletLayers[markerType] = layer;

                placements.forEach(function(coords) {
                    L.marker([100-coords.lat, coords.long], {
                        icon: ctx.leafletIcons[groupName]
                    }).addTo(layer);
                });

                layer.bindPopup("<b>"+group.name+"</b>");
            }
        });
    }

    function onPageContent($content) {
        for (var id in mapConfigs) {
            var map = initialiseMap($content.find('.datamap#datamap-' + id), mapConfigs[id]);
        }
    }

	mw.hook('wikipage.content').add(onPageContent);
})(window.jQuery, window.mediaWiki);