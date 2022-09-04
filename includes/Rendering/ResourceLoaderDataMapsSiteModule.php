<?php
namespace MediaWiki\Extension\Ark\DataMaps\Rendering;

use ResourceLoaderWikiModule;
use ResourceLoaderContext;

class ResourceLoaderDataMapsSiteModule extends ResourceLoaderWikiModule {
	protected $targets = [ 'desktop', 'mobile' ];

	protected function getPages( ResourceLoaderContext $context ): array {
		$pages = [];
		if ( $this->getConfig()->get( 'UseSiteJs' ) ) {
			$pages['MediaWiki:DataMaps.js'] = [ 'type' => 'script' ];
		}
		if ( $this->getConfig()->get( 'UseSiteCss' ) ) {
			$pages['MediaWiki:DataMaps.css'] = [ 'type' => 'style' ];
		}
		return $pages;
	}
}
