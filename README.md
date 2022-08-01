# DataMaps extension

This is free software licensed under the GNU General Public License. Please
see http://www.gnu.org/copyleft/gpl.html for further details, including the
full text and terms of the license.

## Overview
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

### Structure
Content of the page should be a valid JSON with following structure:
* `mixins` (array of page names, optional): *experimental*, list of other pages with the `datamap` content model that'll be loaded first.
* `title` (string, optional): label displayed above the map's legend.
* `image` (file name, required unless `backgrounds` is specified): name of the file (with no namespace) to display as background. This translates to a single, nameless background.
* `backgrounds` (array of objects): list of *backgrounds* this map has available and the user can choose between:
* * `name` (string, required if more than one background is specified): name of this background to display in the selection control.
* * `image` (file name, required): name of the file to display for this background.
* * `at` (box, optional): location to place the background at.
* * `overlays` (array of objects, optional): list of *background overlay* specifications:
* * * `name` (string, optional): name shown in a tooltip when the mouse cursor is over the overlay.
* * * `at` (dimensions, required): bounds of the rectangle.
* `groups` (string to object map, required): map from name to a *marker group* specification:
* * `name` (string, required): name of the group and each individual marker.
* * **Circular markers:** if `fillColor` is specified
* * * `fillColor` (hex string, required): colour of each circular marker belonging to the group.
* * * `icon` (file name, optional): icon to show in the legend
* * * `size` (integer, optional): size of each circular marker. Defaults to `4`.
* * **Icon markers:** if `fillColor` is **not** specified
* * * `icon` (file name, required): name of the file (with no namespace) to show markers with. This makes all markers in group SVG-based. Current support is limited.
* * * `size` (dimensions, optional): size of each icon marker. Defaults to `[ 32, 32 ]`.
* * `article` (page name, optional): name of an article every marker's popup should link to. Can be overridden on a marker.
* `markers` (string to array of objects map, required): map from group name (and any secondary specifiers, i.e. "layers") to an array of *markers*:
* * `lat` (decimal, required): latitude.
* * `lon` (decimal, required): longitude.
* * `label` (string, optional): text to append to marker's popup title.
* * `description` (string, optional): text to add to the marker's popup.
* * `isWikitext` (boolean, optional): if true, `label` and `description` will be treated as wikitext. This is expensive, do not use for every marker. If unset, the backend will guess based on the presence of some patterns.
* * `popupImage` (file name, optional): if provided, marker's popup will display this image under the description.
* * `article` (page name, optional): name of an article the marker's popup should link to.
* `custom` (map, optional): any arbitrary to be added to the client-side map config, for use with e.g. on-site gadgets.

#### `Dimensions`
Two element decimal array, where first element is the width and second is the height. Alternatively, a number, which will be
used for both axes.

#### `Location`
Two element decimal array, where first element is the latitude and second is the longitude.

#### `Box`
Box is a array of two locations, where first describes the start point of the box and second describes the end point.

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


## Leaflet
This repository only includes a static build of modified Leaflet. Source code including the modifications is found under
[this link](https://github.com/alex4401/Leaflet/).