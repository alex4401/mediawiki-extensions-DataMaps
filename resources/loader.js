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
                markerGroups: {},
            };

            //ctx.leaflet.setMaxBounds([[0,0],[100, 100]]);
            L.imageOverlay(config.image, [[0,0],[100,100]]).addTo(ctx.leaflet);
    
            for (var groupName in data.markers) {
                var group = L.featureGroup().addTo(ctx.leaflet);
                var placements = data.markers[groupName];
                ctx.markerGroups[groupName] = group;

                placements.forEach(function(coords) {
                    L.marker([100-coords.lat, coords.long]).addTo(group);
                });
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