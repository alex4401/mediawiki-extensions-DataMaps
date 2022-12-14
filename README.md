# DataMaps extension

This is free software licensed under the GNU General Public License. Please see http://www.gnu.org/copyleft/gpl.html for further
details, including the full text and terms of the license.

## Overview
A modern replacement for ARK Wiki's [interactive maps on DOM nodes](https://ark.wiki.gg/wiki/Module:ResourceMap). Built on top of
[Leaflet](https://leafletjs.com/). Compared over their legacy DOM-based maps this approach gains speed, better interactivity
and extensibility, reduced server load (same work in hacky Lua is done in PHP), better automation possibilities with bots
(extracted data imports), and less data transfered to the browser.

[Repository](https://github.com/alex4401/mediawiki-extensions-DataMaps) | [Issue tracker](https://github.com/alex4401/mediawiki-extensions-DataMaps/issues)

## Installation
If your wiki is hosted on [wiki.gg](https://wiki.gg), simply request the extension via their representatives.

Check the [MediaWiki.org page](https://www.mediawiki.org/wiki/Extension:DataMaps) otherwise.

### MediaWiki support schedule
This extension's development tracks [wiki.gg](https://wiki.gg)'s platform - currently MediaWiki **1.37**. All versioned releases
of DataMaps target this version, and only this version. Not much official support is provided for other versions of the platform.

Branches targeting other versions of MediaWiki may end up being developed as a rolling release fork of the mainline. They'll be
promoted when wiki.gg migrates to the corresponding version. No backports will be ever done.

This is simply because of limited resources and the lack of external users. However, if you need the extension on newer MediaWiki
outside of the schedule above, please [inform us](https://ark.wiki.gg/wiki/User_talk:Alex4401).

## Creating a map
Create a page within the data namespace and assign it the `datamap` content model.

### Structure
Content of the page should be a valid JSON with following structure:
* `$mixin` (boolean, optional): if `true` forces the map to be recognised as a preset/mix-in and relaxes validation.
* `mixins` (array of page names, optional): *experimental*, list of other pages with the `datamap` content model that'll be loaded first and stacked to share configuration.
* `crs` (box, optional): reference coordinate space, which also determines whether the system origin will be top-left or bottom-left. Defaults to `[ [0, 0], [100, 100] ]`, which is top-left - swap the points for bottom-left.
* `image` (file name, required, allowed only if `backgrounds` is not specified): name of the file (with no namespace) to display as background. This translates to a single, nameless background.
* `backgrounds` (array of objects): list of *backgrounds* this map has available and the user can choose between:
* * `name` (string, required if more than one background is specified): name of this background to display in the selection control.
* * `image` (file name, required): name of the file to display for this background.
* * `at` (box, optional): location to place the background at.
* * `associatedLayer` (string, optional): if specified, the background will toggle on the `bg:VALUE` layer instead of `bg:INDEX`.
* * `overlays` (array of objects, optional): list of *background overlay* specifications:
* * * `name` (string, optional): name shown in a tooltip when the mouse cursor is over the overlay.
* * * Images:
* * * * `image` (file name, required): name of an image to display.
* * * * `at` (dimensions, required): bounds of the image.
* * * Rectangles:
* * * * `at` (dimensions, required): bounds of the rectangle.
* * * * `color` (colour, supports transparency, optional): colour to fill the rectangle with.
* * * Polylines:
* * * * `path` (array of locations, required): list of points the path should go through sequentially.
* * * * `color` (colour, supports transparency, optional): colour to display the line with.
* * * * `thickness` (number, optional): thickness of the line.
* `hideLegend` (boolean, optional): if `true` does not show or load the legend at all. Defaults to `false`.
* `enableSearch` (boolean, optional): if `true` enables marker search for this map. Controlled by `$wgDataMapsDefaultFeatures` identified by `Search`.
* `showCoordinates` (boolean, optional): if `true` displays coordinates on mouse move and inside popups. Controlled by `$wgDataMapsDefaultFeatures` identified by `ShowCoordinates`.
* `sortChecklistsByAmount` (boolean, optional): if `true` sorts checklists by the number of markers inside. Controlled by `$wgDataMapsDefaultFeatures` identified by `SortChecklistsByAmount`.
* `disableZoom` (boolean, optional): if `true` locks the map into zoom level of `2.75` (adjustable with `leafletSettings`), disables the zoom control and zoom interactions.
* `requireCustomMarkerIDs` (boolean, optional): if `true` requires the `id` property to be always present on markers. Controlled by `$wgDataMapsDefaultFeatures` identified by `RequireCustomMarkerIDs`.
* `leafletSettings` (object, optional): settings to pass to Leaflet's map instance.
* * [Check Leaflet's documentation for valid options.](https://leafletjs.com/reference.html#map-option) Only simple (strings, booleans and numbers) options are supported. There is always a possibility of conflicts.
* * Common:
* * * `maxZoom`: controls max allowed zoom level. Defaults to `5`.
* * * `minZoom`: controls minimum allowed zoom level. Defaults to `1.75` on mobile devices and `2` on others.
* * `rendererSettings` (object, optional): options to pass to the canvas renderer. [Check Leaflet's documentation for valid options.](https://leafletjs.com/reference.html#canvas-option)
* `groups` (string to object map, required): map from name to a *marker group* specification:
* * `name` (string, required): name of the group and each individual marker.
* * **Circular markers:** if `fillColor` is specified
* * * `fillColor` (colour, required): colour of each circular marker belonging to the group.
* * * `icon` (file name, optional): icon to show in the legend.
* * * `size` (integer, optional): size of each circular marker. Defaults to `4`.
* * **Icon markers:** if `fillColor` is **not** specified
* * * `icon` (file name, required): name of the file (with no namespace) to show markers with. This makes all markers in group SVG-based. Current support is limited.
* * * `size` (dimensions, optional): size of each icon marker. Defaults to `[ 32, 32 ]`.
* * `article` (page name, optional): name of an article every marker's popup should link to. Can be overridden on a marker.
* * `isDefault` (boolean, optional): whether this group is switched on on map load. Defaults to `true`.
* * `isCollectible` (optional):
* * * `true` or `individual`: whether markers of this group can be marked as collected by users.
* * * `group`: whether this group (and so all of its markers) can be marked as collected by users.
* * * `globalGroup`: like `group`, but for all maps on the site.
* * `autoNumberInChecklist` (boolean, optional): if collectible and true, markers in the checklist will have their index number added to the name.
* * `canSearchFor` (boolean, optional): if true and search is enabled, allows markers from this group to be searched for. Defaults to `true`.
* `layers` (string to object map, optional): map from name to a *marker layer* specification:
* * Marker layers can be used without an explicit declaration.
* * `name` (string, required): currently unused.
* * `subtleText` (string, optional): text that will be displayed next to coordinates in a marker's popup. Coordinates must be enabled server-side for this.
* * `overrideIcon` (file name, optional): if specified, this layer will override the icons of each marker assigned to it. If the marker has multiple of such layers, only the first one is used.
* `markers` (string to array of objects map, required): map from group name (and any secondary specifiers, i.e. "layers") to an array of *markers*:
* * `id` (string or number, optional): a persistent unique identifier to use for collectibles and URL linking instead of a generated storage key.
* * `lat`/`y` (decimal, required): latitude/`Y` coordinate.
* * `lon`/`x` (decimal, required): longitude/`X` coordinate.
* * `name` (string, optional): text to append to marker's popup title.
* * `description` (string or string array, optional): text to add to the marker's popup.
* * `isWikitext` (boolean, optional): if true, `label` and `description` will be treated as wikitext. This is expensive, do not use for every marker. If unset, the backend will guess based on the presence of some patterns.
* * `image` (file name, optional): if provided, marker's popup will display this image under the description.
* * `article` (page name, optional): article the marker's popup should link to. Follows either a format of `article title` or `article title|displayed label`.
* * `searchKeywords` (string, or array of strings or string and number (score multiplier) pairs, optional): specifies what keywords this marker will be suggested for.
* * `canSearchFor` (boolean, optional): if true and search is enabled, allows this marker to be searched for. Defaults to `true`.
* `custom` (map, optional): any arbitrary to be added to the client-side map config, for use with e.g. on-site gadgets.

#### File name
A file name of an image. The image **must exist**. Currently `File:` prefix is not required, but supported only in its English form.

#### `Colour`
Either a three element array of integers in `0..255` range, or a 3- or 6-long hex string beginning with `#`, representing an RGB colour with no transparency.

#### `Colour`, with transparency
Either a four element array of integers in `0..255` range, or a 4- or 8-long hex string beginning with `#`, representing an RGBA colour (i.e. with an alpha channel).

#### `Dimensions`
Two element decimal array, where first element is the width and second is the height. Alternatively, a number, which will be
used for both axes.

#### `Location`
Two element decimal array, where first element is the latitude and second is the longitude.

#### `Box`
Box is a array of two locations, where first describes the start point of the box and second describes the end point.

### Parser functions
* `DataMap`: used to embed a map in an article.
* * Takes an optional `filter` parameter, which is a comma-delimited list of layers to show.
* * Example: `{{DataMap:Maps/Resources/Aberration|filter=metal,crystal}}`.

## Configuration
Check the [MediaWiki.org page](https://www.mediawiki.org/wiki/Extension:DataMaps).

## Gadgets
External scripts can hook into Data Maps to provide additional functionality without modifying core code.

* All Leaflet APIs are public and left exposed under the `ext.datamaps.leaflet` module. 
* * Custom Leaflet layers are exposed under `ext.datamaps.leaflet.Ark`.
* * Lazy-loaded. Depend (via `mw.loader.using`) on `ext.datamaps.leaflet`.
* * `DataMap` objects provide `waitForLeaflet( function callback, [object? context] )`.
* All public APIs of this extension are exposed under `window.mw.dataMaps`. Check `resources/core/index.js` for all exposed classes.
* `mw.dataMaps.registerMapAddedHandler( function callback, [object? context] )` may be used to have a function called on every map initialised on current page. The callback receives one parameter, a `DataMap` instance.
* * Depend (via `mw.loader.using`) on `ext.datamaps.bootstrap` to use this.
* Refer to the source code for information about the classes.

## Leaflet
This repository only includes a static build of modified Leaflet. Source code including the modifications is found under
[this link](https://github.com/alex4401/Leaflet/).

### Gadget implications
Certain Leaflet features may not be available when using DataMaps, check the forked repository for more details.