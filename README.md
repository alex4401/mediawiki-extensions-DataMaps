# DataMaps extension
A more modern, prototype replacement for ARK Wiki's [interactive maps on DOM nodes](https://ark.wiki.gg/wiki/Module:ResourceMap).
Built on top of [Leaflet](https://leafletjs.com/). If frontend is unproven due to performance issues, stack can be rewritten onto
the old display while keeping the benefits - which are speed, reduced server load (same work in hacky Lua is done in PHP), better
automation possibilities with bots (extracted data imports), and less data transfered to the browser.

Currently no feature parity with the existing solution. [Roadmap (T75 on wiki's Trello board)](https://trello.com/c/CiLfCspG/75-datamaps-extension-for-fjordurs-release).

[Test installation link (may be broken)](https://ark-wcmove-sandbox.mglolenstine.xyz/wiki/Map_transclusion_01).

## Installation
1. Clone the repository to `extensions/DataMaps`.
2. `wfLoadExtension` in site configuration.
3. Set `$wgArkDataNamespace` to the ID of the Data namespace (`10006` on ARK Wiki).

## Creating a map
Create a page within the data namespace and assign it the `datamap` content model.

Content of the page should be a valid JSON with following structure:
* `title` (string, optional): label displayed above the map's legend.
* `image` (file name, required): name of the file (with no namespace) to display as background.
* `groups` (string to object map, required): map from name to a *marker group* specification:
* * `name` (string, required): name of the group and each individual marker.
* * `icon` (file name, optional): short-hand for `legendIcon`, and `markerIcon` if `fillColor` is not specified.
* * `legendIcon` (file name, optional): name of the file (with no namespace) to display in the legend entry of the group.
* * Exactly one of the following:
* * * `fillColor` (hex string): colour of each circular marker belonging to the group. This makes all markers in group circular.
* * * `markerIcon` (file name): name of the file (with no namespace) to show markers with. This makes all markers in group SVG-based. Current support is limited.
* * `size` (integer, optional): size of each circular marker if `fillColor` is specified. Defaults to `4`.
* `markers` (string to array of objects map, required): map from group name (and any secondary specifiers, i.e. "layers") to an array of *markers*:
* * `lat` (decimal, required): latitude.
* * `long` (decimal, required): longitude.
* * `label` (string, optional): text to append to marker's popup title.
* * `description` (string, optional): text to add to the marker's popup.
* `custom` (map, optional): any arbitrary to be added to the client-side map config, for use with e.g. on-site gadgets.

## Parser functions
* `DataMap`: used to embed a map in an article.

## General architecture
The `DataMapContent` class will handle data validation (on write only), and customised source beautification.

`DataMapEmbedRenderer` is either invoked when displaying the source page or via the `DataMap` parser function (class
`ParserFunction_EmbedDataMap`). It generates a basic HTML structure to host the map and delivers immediate configuration needed
to initialise the map client-side. This configuration is sent via the `dataMaps` mw.config variable, and each map uses its page
ID for identification (`mw.config.get('dataMaps')[page ID]`) when multiple maps are present on one page.

Markers are not sent to the browser immediately, and have to be requested with the `DataMapMarkersEndpoint`. This allows
initialisation to start while markers are being downloaded from the server, and decouples a large payload from the HTML document,
which has been a problem previously.
