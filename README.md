# DataMaps extension

This is free software licensed under the GNU General Public License. Please see http://www.gnu.org/copyleft/gpl.html for further
details, including the full text and terms of the license.

## Overview
An extension for displaying interactive maps in articles with no external services. All data is kept and served from the wiki and
maintained by editors. Initially made as a replacement for ARK: Survival Evolved Wiki's
[interactive maps on DOM nodes](https://ark.wiki.gg/wiki/Module:ResourceMap).

[Repository](https://github.com/alex4401/mediawiki-extensions-DataMaps) | [Issue tracker](https://github.com/alex4401/mediawiki-extensions-DataMaps/issues)

## Installation
If your wiki is hosted on [wiki.gg](https://wiki.gg), simply request the extension via their representatives.

Check the [MediaWiki.org page](https://www.mediawiki.org/wiki/Extension:DataMaps) otherwise.

### MediaWiki support schedule
This extension's development tracks [wiki.gg](https://wiki.gg)'s platform - currently MediaWiki **1.39**. All versioned releases
of DataMaps target this version.

## Documentation
* Creating a map (planned)
* [Data format](https://support.wiki.gg/wiki/DataMaps/Data_format)
* JavaScript API for gadgets (planned)

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
